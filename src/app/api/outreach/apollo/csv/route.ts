import { NextResponse } from 'next/server';
import type { ApolloPerson } from '@/lib/outreach/apollo';
import { requireAuth } from '@/lib/api-auth';

interface ProspectWithOpener extends ApolloPerson {
  subject?: string;
  opener?: string;
}

function csvEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// POST: download a CSV of prospects with openers, ready to import to Instantly
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { prospects } = await request.json() as { prospects: ProspectWithOpener[] };

    if (!prospects || !Array.isArray(prospects)) {
      return NextResponse.json({ error: 'prospects array required' }, { status: 400 });
    }

    // CSV header — match Instantly's standard import format
    const headers = [
      'email',
      'first_name',
      'last_name',
      'company_name',
      'title',
      'industry',
      'website',
      'linkedin',
      'subject',
      'opener',
    ];

    const rows = [
      headers.join(','),
      ...prospects.map((p) =>
        [
          csvEscape(p.email),
          csvEscape(p.first_name),
          csvEscape(p.last_name),
          csvEscape(p.organization?.name),
          csvEscape(p.title),
          csvEscape(p.organization?.industry),
          csvEscape(p.organization?.website_url),
          csvEscape(p.linkedin_url),
          csvEscape(p.subject),
          csvEscape(p.opener),
        ].join(',')
      ),
    ];

    const csv = rows.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="prospects-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
