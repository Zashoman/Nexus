import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import type { Signal } from '@/types/robox-intel';

/**
 * GET /api/robox-intel/export?status=acted,queued&type=funding
 *   ?format=csv (default) | json
 *
 * Returns a CSV (or JSON) of signals matching filters. Useful for
 * exporting outreach queues into a CRM.
 */
export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const params = req.nextUrl.searchParams;

  const format = params.get('format') || 'csv';
  const status = params.get('status');
  const type = params.get('type');
  const relevance = params.get('relevance');
  const dateFrom = params.get('dateFrom');

  let query = supabase.from('robox_signals').select('*');
  if (status) query = query.in('status', status.split(','));
  if (type) query = query.in('type', type.split(','));
  if (relevance) query = query.eq('relevance', relevance);
  if (dateFrom) query = query.gte('date', dateFrom);

  query = query.order('date', { ascending: false }).limit(1000);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const signals = (data || []) as Signal[];

  if (format === 'json') {
    return NextResponse.json({ signals });
  }

  const csv = toCsv(signals);
  const filename = `robox-signals-${new Date().toISOString().split('T')[0]}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function toCsv(signals: Signal[]): string {
  const columns = [
    'id', 'date', 'type', 'relevance', 'status', 'company', 'title',
    'source', 'url', 'summary', 'suggested_action', 'tags',
    'created_at', 'acted_at',
  ];

  const header = columns.join(',');
  const rows = signals.map((s) =>
    columns
      .map((col) => {
        const raw = (s as unknown as Record<string, unknown>)[col];
        let value: string;
        if (raw == null) value = '';
        else if (Array.isArray(raw)) value = raw.join(';');
        else value = String(raw);
        return csvEscape(value);
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
