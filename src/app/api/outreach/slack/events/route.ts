import { NextResponse } from 'next/server';
import { acknowledgeMessage, postThreadReply } from '@/lib/outreach/slack';

// Slack Events API endpoint
// Handles URL verification and reaction_added events
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // URL verification challenge (required when first setting up Events API)
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body.event;

      // Reaction added to a message
      if (event?.type === 'reaction_added') {
        await handleReaction(event);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Slack events error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 to Slack
  }
}

async function handleReaction(event: {
  reaction: string;
  user: string;
  item: { channel: string; ts: string };
}) {
  const { reaction, user, item } = event;
  const { channel, ts } = item;

  // Only handle specific reactions
  const actionMap: Record<string, { reply: string; ack: string }> = {
    white_check_mark: {
      reply: `✅ <@${user}> approved this draft. _Ready to send via Instantly once write access is configured._`,
      ack: 'ballot_box_with_check',
    },
    'pencil2': {
      reply: `✏️ <@${user}> wants to revise. Reply in this thread with your changes.`,
      ack: 'eyes',
    },
    x: {
      reply: `❌ <@${user}> skipped this reply. _No response will be sent._`,
      ack: 'wastebasket',
    },
    zzz: {
      reply: `💤 <@${user}> snoozed this for later. _Will resurface in the next daily review._`,
      ack: 'clock1',
    },
  };

  const action = actionMap[reaction];
  if (!action) return; // Ignore other reactions

  await postThreadReply(channel, ts, action.reply);
  await acknowledgeMessage(channel, ts, action.ack);
}
