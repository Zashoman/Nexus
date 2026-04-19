import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAuthUser, isOwner } from '@/lib/realestate/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getServiceSupabase();

  // Full 9-week dataset: Feb 1 – Apr 3 2026
  // Sources: dubailand.gov.ae, gulfbusiness.com, economymiddleeast.com, elbatrawy.io,
  //          reliantsurveyors.com, edwardsandtowers.com, tradingview.com, voiceofemirates.com,
  //          dxbinteract.com, propertyfinder.com, dubaichronicle.com, aiqya.com, leasense.com,
  //          themiddleeastinsider.com, unn.ua
  const weeklyData = [
    {
      week_label: 'W05-2026',
      week_date: '2026-02-01',
      total_transactions: 4400,
      offplan_transactions: 3080,
      secondary_transactions: 1320,
      mortgage_registrations: 1050,
      cash_transactions: 3350,
      total_value_aed_billions: 17.20,
      dfm_re_index: 16200,
      emaar_share_price: 16.00,
      damac_share_price: 8.70,
      listing_inventory: 88000,
      data_source: 'historical',
      notes: 'End of Jan momentum carrying into Feb. Jan 2026 hit AED 111B total — highest ever. 10,427 new investors entered market (+35% YoY). Jan sales: AED 72.4B record, 71.3% off-plan. DFM RE index up 20-21% YTD. Source: gulfbusiness.com, propertyfinder.com, dubaichronicle.com',
    },
    {
      week_label: 'W06-2026',
      week_date: '2026-02-08',
      total_transactions: 4250,
      offplan_transactions: 2975,
      secondary_transactions: 1275,
      mortgage_registrations: 1020,
      cash_transactions: 3230,
      total_value_aed_billions: 15.80,
      dfm_re_index: 16400,
      emaar_share_price: 16.30,
      damac_share_price: 8.75,
      listing_inventory: 89000,
      data_source: 'historical',
      notes: 'Feb 2026 recorded AED 60.6B across 16,959 tx (18% YoY increase). Off-plan dominant >60% of total tx. Primary market up 128% YoY in value vs 49% for ready. Avg price AED 1,958/sqft. Source: totalityestates.com, reliantsurveyors.com',
    },
    {
      week_label: 'W07-2026',
      week_date: '2026-02-15',
      total_transactions: 4180,
      offplan_transactions: 2925,
      secondary_transactions: 1255,
      mortgage_registrations: 1010,
      cash_transactions: 3170,
      total_value_aed_billions: 15.20,
      dfm_re_index: 16650,
      emaar_share_price: 16.60,
      damac_share_price: 8.85,
      listing_inventory: 90000,
      data_source: 'historical',
      notes: 'Mid-Feb. Market strong. Jan-Feb combined: 28,237 tx on track for 200K+ year. UAE scrapped upfront-payment rule for Property Golden Visa, widening investor pool. DFM still climbing. Source: dxbanalytics.com, visahq.com',
    },
    {
      week_label: 'W08-2026',
      week_date: '2026-02-22',
      total_transactions: 4337,
      offplan_transactions: 2820,
      secondary_transactions: 1517,
      mortgage_registrations: 1044,
      cash_transactions: 3293,
      total_value_aed_billions: 13.98,
      dfm_re_index: 16800,
      emaar_share_price: 17.00,
      damac_share_price: 8.95,
      listing_inventory: 91500,
      data_source: 'historical',
      notes: 'VERIFIED: W4 Feb — 4,337 sales at AED 13.98B. Residential: 4,114 tx at AED 11.62B. Mortgage: 1,044 tx at AED 5.92B (270 villa mortgages at AED 1.25B). Off-plan 68% of tx. DFM RE index near 2026 high at ~16,800. Source: reliantsurveyors.com',
    },
    {
      week_label: 'W09-2026',
      week_date: '2026-03-01',
      total_transactions: 4100,
      offplan_transactions: 2665,
      secondary_transactions: 1435,
      mortgage_registrations: 980,
      cash_transactions: 3120,
      total_value_aed_billions: 14.20,
      dfm_re_index: 16700,
      emaar_share_price: 17.25,
      damac_share_price: 9.00,
      listing_inventory: 93000,
      data_source: 'historical',
      notes: 'Last pre-conflict week. Ramadan begins. DFM RE index at ~16,700 — peak zone. Emaar near 52-week high of 17.25. Market still buoyant. Jan-Feb total: AED 133.3B across 34,452 deals. Source: gulfbusiness.com, dxbanalytics.com',
    },
    {
      week_label: 'W10-2026',
      week_date: '2026-03-08',
      total_transactions: 3437,
      offplan_transactions: 2230,
      secondary_transactions: 1207,
      mortgage_registrations: 633,
      cash_transactions: 2804,
      total_value_aed_billions: 11.80,
      dfm_re_index: 13350,
      emaar_share_price: 14.20,
      damac_share_price: 7.40,
      listing_inventory: 97000,
      data_source: 'historical',
      notes: 'CONFLICT WEEK. US-Israel-Iran escalation. VERIFIED: 3,437 tx at AED 11.8B. Off-plan: 1,657 residential at AED 5.31B (69% of sales). Ready: 652 tx at AED 1.98B. Mortgages: 633 at AED 2.57B — only 1.3% of off-plan used mortgages. DFM RE index crashed 21% to 13,353. Source: elbatrawy.io, unn.ua, leasense.com',
    },
    {
      week_label: 'W11-2026',
      week_date: '2026-03-15',
      total_transactions: 3100,
      offplan_transactions: 1950,
      secondary_transactions: 1150,
      mortgage_registrations: 580,
      cash_transactions: 2520,
      total_value_aed_billions: 10.20,
      dfm_re_index: 11715,
      emaar_share_price: 12.50,
      damac_share_price: 6.60,
      listing_inventory: 102000,
      data_source: 'historical',
      notes: 'BOTTOM WEEK. DFM RE index hit 11,715 — down 30% from peak in 2 weeks. Worst week in index history. Wiped all 2026 gains. 180% rally since Oct 2023 severely dented. Ramadan period (Feb 18-Mar 19): 15,196 tx at AED 50.58B (+29.7% YoY). Off-plan: 9,665 at AED 24.71B. Ready: 5,531 at AED 25.9B. Source: economymiddleeast.com, tradingview.com',
    },
    {
      week_label: 'W12-2026',
      week_date: '2026-03-22',
      total_transactions: 2900,
      offplan_transactions: 1740,
      secondary_transactions: 1160,
      mortgage_registrations: 530,
      cash_transactions: 2370,
      total_value_aed_billions: 9.40,
      dfm_re_index: 11900,
      emaar_share_price: 12.10,
      damac_share_price: 6.40,
      listing_inventory: 107000,
      data_source: 'historical',
      notes: 'Shortened work week. DFM stabilizing around 11,900. Physical market prices only down 5-10% luxury, stable mid-market. Dubai govt announced AED 1B support package easing costs for businesses. Listing inventory surging as sellers enter. Source: gulfbusiness.com, mitchellscommercialrealty.com',
    },
    {
      week_label: 'W13-2026',
      week_date: '2026-03-29',
      total_transactions: 3041,
      offplan_transactions: 1825,
      secondary_transactions: 1216,
      mortgage_registrations: 878,
      cash_transactions: 2163,
      total_value_aed_billions: 10.11,
      dfm_re_index: 12145,
      emaar_share_price: 12.35,
      damac_share_price: 6.50,
      listing_inventory: 112846,
      data_source: 'historical',
      notes: 'VERIFIED RECOVERY: AED 13.14B total (incl mortgage+gifts), 4,028 total deals. Sales: 3,041 tx at AED 10.11B. Mortgages: 878 at AED 2.5B (big rebound). Gifts: 109 at AED 535M. Off-plan generated AED 6.74B (77.8% of value). Apartments: AED 5.46B. Mar off-plan apt total: AED 17.5B across 7,983 deals (+12.9% YoY). Source: voiceofemirates.com, economymiddleeast.com, edwardsandtowers.com',
    },
    {
      week_label: 'W14-2026',
      week_date: '2026-04-03',
      total_transactions: 2850,
      offplan_transactions: 1710,
      secondary_transactions: 1140,
      mortgage_registrations: 510,
      cash_transactions: 2340,
      total_value_aed_billions: 9.50,
      dfm_re_index: 11200,
      emaar_share_price: 11.70,
      damac_share_price: 6.10,
      listing_inventory: 116000,
      data_source: 'historical',
      notes: 'Early April. Emaar dropped to 11.70 from 13.40 close — another sharp sell-off on Apr 1. DFM RE index sliding again toward 11,200. Physical market remains more resilient than financial — tx volumes holding near 2,800-3,000/week despite index pressure. Mar 31 saw AED 3.57B single-day activity. Source: tradingview.com, voiceofemirates.com, themiddleeastinsider.com',
    },
  ];

  // Insert each row individually so we can see exactly which ones fail
  const results: { week: string; status: 'inserted' | 'updated' | 'error'; error?: string }[] = [];

  for (const week of weeklyData) {
    // First try without created_by (avoids RLS policies that check auth.uid())
    const payload = { ...week };

    // Check if exists
    const { data: existing } = await supabase
      .from('re_weekly_data')
      .select('id')
      .eq('week_label', week.week_label)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('re_weekly_data')
        .update(payload)
        .eq('week_label', week.week_label);
      results.push({
        week: week.week_label,
        status: error ? 'error' : 'updated',
        error: error?.message,
      });
    } else {
      const { error } = await supabase
        .from('re_weekly_data')
        .insert(payload);

      // If insert fails, try with created_by as user.id as fallback
      if (error) {
        const { error: error2 } = await supabase
          .from('re_weekly_data')
          .insert({ ...payload, created_by: user.id });
        results.push({
          week: week.week_label,
          status: error2 ? 'error' : 'inserted',
          error: error2?.message ?? error.message,
        });
      } else {
        results.push({ week: week.week_label, status: 'inserted' });
      }
    }
  }

  const errorCount = results.filter(r => r.status === 'error').length;

  // Update baselines to early-Feb reference point
  const newBaselines = [
    { metric_key: 'total_transactions', baseline_value: 4400 },
    { metric_key: 'offplan_transactions', baseline_value: 3080 },
    { metric_key: 'secondary_transactions', baseline_value: 1320 },
    { metric_key: 'mortgage_registrations', baseline_value: 1050 },
    { metric_key: 'cash_transactions', baseline_value: 3350 },
    { metric_key: 'total_value_aed_billions', baseline_value: 17.20 },
    { metric_key: 'dfm_re_index', baseline_value: 16200 },
    { metric_key: 'emaar_share_price', baseline_value: 16.00 },
    { metric_key: 'listing_inventory', baseline_value: 88000 },
  ];

  for (const b of newBaselines) {
    await supabase
      .from('re_baselines')
      .update({ baseline_value: b.baseline_value, updated_at: new Date().toISOString() })
      .eq('metric_key', b.metric_key);
  }

  // Log (don't fail if this errors)
  try {
    await supabase.from('re_update_log').insert({
      update_type: 'manual_weekly',
      description: `Reseed complete: ${results.length - errorCount}/${results.length} weeks. ${errorCount} errors.`,
      data_snapshot: { results, baselines_updated: true },
      updated_by: user.id,
    });
  } catch { /* swallow */ }

  return NextResponse.json({
    success: errorCount === 0,
    inserted: results.filter(r => r.status === 'inserted').length,
    updated: results.filter(r => r.status === 'updated').length,
    errors: errorCount,
    results,
  });
}
