import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// POST: seed realistic demo training data so the Training page has
// something to show on a live demo without needing an Instantly ingestion
// run. Inserts a completed ingestion_jobs row + representative patterns.
//
// This is idempotent: any previously active patterns are deactivated
// (mirroring the real ingestion flow in lib/outreach/ingestion.ts).
export async function POST() {
  try {
    const supabase = getServiceSupabase();

    // Representative subject lines (ones that got replies in practice).
    const subjectLines: Array<{ text: string; campaign: string; send_count: number }> = [
      { text: 'quick question about {{company}}', campaign: 'Editorial Q2', send_count: 42 },
      { text: '{{first_name}} — thought on your Series B coverage', campaign: 'Editorial Q2', send_count: 31 },
      { text: 're: your piece on AI in fintech', campaign: 'Editorial Q2', send_count: 28 },
      { text: 'worth 10 minutes next week?', campaign: 'Sales Outbound', send_count: 24 },
      { text: '{{company}} + Blue Tree — quick intro', campaign: 'Sales Outbound', send_count: 22 },
      { text: 'story idea for {{publication}}', campaign: 'Editorial Q2', send_count: 19 },
      { text: 'a specific angle for you, {{first_name}}', campaign: 'Editorial Q2', send_count: 17 },
      { text: 'saw your post on {{topic}}', campaign: 'Sales Outbound', send_count: 15 },
    ];

    const openers: Array<{ text: string; campaign: string; send_count: number }> = [
      {
        text: 'Hi {{first_name}} — saw your recent piece on {{topic}} and wanted to flag a client who has a data point that would strengthen the argument. 30-second background: they run {{description}} and just closed {{round}}.',
        campaign: 'Editorial Q2',
        send_count: 38,
      },
      {
        text: 'Hi {{first_name}}, I work with founders who fit exactly the profile you cover. One of them — {{company}} — just hit {{milestone}}, and the backstory is unusual enough that I think it stands on its own.',
        campaign: 'Editorial Q2',
        send_count: 29,
      },
      {
        text: "Quick one, {{first_name}}: we've been running PR for {{client}} for 6 months and have a data set on {{topic}} that nobody else has. Happy to send it over if it's useful.",
        campaign: 'Editorial Q2',
        send_count: 24,
      },
      {
        text: 'Hi {{first_name}} — two minutes on why I think {{company}} fits what you cover, then you tell me if it\'s worth a proper conversation.',
        campaign: 'Sales Outbound',
        send_count: 21,
      },
      {
        text: 'Hi {{first_name}}, noticed you just covered {{competitor}}. We work with a similar company ({{client}}) that has a differentiated take on the same trend — would the angle interest you?',
        campaign: 'Editorial Q2',
        send_count: 18,
      },
    ];

    const insights = `1. **Shortest subjects win**: 4–6 word subjects outperform 10+ word subjects by ~2× reply rate. Strip filler like "regarding" or "following up on".

2. **Lead with their work, not ours**: Openers that reference a specific article, post, or quote from the recipient get 3× the reply rate of generic "Hi, my name is..." intros.

3. **The 30-second rule**: Openers that promise "30 seconds of background" or "two minutes on why" get replies — openers that say "I'd love to jump on a call" do not.

4. **Name the company, name the number**: Drafts that include a concrete data point ("just closed a $12M Series A", "grew 140% YoY") outperform vague claims ("fast-growing", "impressive traction") by a wide margin.

5. **Ask a binary question at the end**: Closers like "would the angle interest you, yes or no?" get 40% more replies than open-ended "let me know your thoughts".

6. **Avoid the forbidden phrases**: "circling back", "just wanted to check in", "bumping this up" — these correlate with ZERO replies in the dataset. The vocabulary enforcer already blocks these.

7. **One ask per email**: Emails asking for a single thing (a call, a coverage decision, a yes/no) outperform emails that bundle multiple asks (a meeting AND an intro AND a data share).

8. **Reference the publication, not the beat**: "your piece in TechCrunch on fintech" beats "your fintech coverage" — specificity signals you actually read the work.`;

    // 1. Deactivate any currently-active patterns (mirrors real ingestion)
    await supabase
      .from('email_patterns')
      .update({ is_active: false })
      .eq('is_active', true);

    // 2. Insert the demo patterns as active
    const patternsToInsert = [
      ...subjectLines.map((s) => ({
        pattern_type: 'subject_line' as const,
        campaign_type: 'sales',
        pattern_data: {
          text: s.text,
          campaign: s.campaign,
          got_reply: true,
          send_count: s.send_count,
        },
        sample_size: s.send_count,
        success_rate: 1.0,
        is_active: true,
      })),
      ...openers.map((o) => ({
        pattern_type: 'opener' as const,
        campaign_type: 'sales',
        pattern_data: {
          text: o.text,
          campaign: o.campaign,
          got_reply: true,
          send_count: o.send_count,
        },
        sample_size: o.send_count,
        success_rate: 1.0,
        is_active: true,
      })),
      {
        pattern_type: 'follow_up' as const,
        campaign_type: 'general',
        pattern_data: {
          text: 'AI-extracted insights from historical performance',
          insights,
        },
        is_active: true,
      },
    ];

    const { error: insertError } = await supabase
      .from('email_patterns')
      .insert(patternsToInsert);

    if (insertError) throw new Error(insertError.message);

    // 3. Insert a matching "completed" ingestion_jobs row so the UI
    //    shows a sensible "Latest Ingestion Job" card. Not strictly required
    //    for the Training page to render, but it closes the visual loop.
    const now = new Date();
    const startedAt = new Date(now.getTime() - 32 * 1000);
    const totalFetched = subjectLines.reduce((sum, s) => sum + s.send_count, 0);
    const totalClassified = Math.round(totalFetched * 0.85);

    const { error: jobError } = await supabase.from('ingestion_jobs').insert({
      job_type: 'historical_ingestion',
      status: 'completed',
      emails_fetched: totalFetched,
      emails_classified: totalClassified,
      patterns_extracted: patternsToInsert.length,
      campaigns_processed: ['Editorial Q2', 'Sales Outbound'],
      started_at: startedAt.toISOString(),
      completed_at: now.toISOString(),
    });

    if (jobError) {
      // Not fatal — patterns are still inserted. Log and continue.
      console.error('seed-demo: ingestion_jobs insert failed:', jobError.message);
    }

    return NextResponse.json({
      ok: true,
      patterns_inserted: patternsToInsert.length,
      emails_fetched: totalFetched,
      emails_classified: totalClassified,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to seed demo data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
