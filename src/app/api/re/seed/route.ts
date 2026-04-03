import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAuthUser, isOwner } from '@/lib/realestate/auth';

// One-time seed endpoint for historical data
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getServiceSupabase();

  // Check if data already exists to prevent duplicates
  const { count } = await supabase
    .from('re_weekly_data')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 3) {
    return NextResponse.json({ error: 'Data already seeded — more than 3 entries exist' }, { status: 400 });
  }

  // Historical weekly data based on DLD reports, DFM data, and market analysis
  // Sources: dubailand.gov.ae, elbatrawy.io, economymiddleeast.com, gulfbusiness.com, tradingview.com
  const weeklyData = [
    {
      week_label: 'W09-2026',
      week_date: '2026-03-01',
      total_transactions: 4337,
      offplan_transactions: 2820,
      secondary_transactions: 1517,
      mortgage_registrations: 1044,
      cash_transactions: 3293,
      total_value_aed_billions: 13.98,
      dfm_re_index: 17850,
      emaar_share_price: 17.20,
      damac_share_price: 8.95,
      listing_inventory: 95000,
      data_source: 'historical',
      notes: 'Pre-escalation week. Strong market. Source: DLD official data, DXB Analytics',
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
      dfm_re_index: 17200,
      emaar_share_price: 16.50,
      damac_share_price: 8.40,
      listing_inventory: 98000,
      data_source: 'historical',
      notes: 'First week of March. Ramadan begins. Off-plan 1,657 residential. Source: elbatrawy.io, reliantsurveyors.com',
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
      dfm_re_index: 15200,
      emaar_share_price: 14.80,
      damac_share_price: 7.60,
      listing_inventory: 102000,
      data_source: 'historical',
      notes: 'Regional tensions escalating. DFM begins correction. Ramadan + geopolitical uncertainty. Source: aiqya.com, gulfbusiness.com',
    },
    {
      week_label: 'W12-2026',
      week_date: '2026-03-22',
      total_transactions: 2800,
      offplan_transactions: 1700,
      secondary_transactions: 1100,
      mortgage_registrations: 520,
      cash_transactions: 2280,
      total_value_aed_billions: 9.40,
      dfm_re_index: 13500,
      emaar_share_price: 13.20,
      damac_share_price: 6.90,
      listing_inventory: 108000,
      data_source: 'historical',
      notes: 'DFM worst week in history — shed 15%+ in single week. Sharp correction. Source: tradingview.com, mitchellscommercialrealty.com',
    },
  ];

  const { error: weeklyError } = await supabase
    .from('re_weekly_data')
    .upsert(weeklyData.map(d => ({ ...d, created_by: user.id })), { onConflict: 'week_label' });

  if (weeklyError) return NextResponse.json({ error: weeklyError.message }, { status: 500 });

  // Log it
  await supabase.from('re_update_log').insert({
    update_type: 'manual_weekly',
    description: 'Seeded 4 weeks of historical data (W09-W12 2026) from DLD reports and market sources',
    data_snapshot: { weeks: weeklyData.map(d => d.week_label) },
    updated_by: user.id,
  });

  return NextResponse.json({ success: true, weeks_seeded: weeklyData.length });
}
