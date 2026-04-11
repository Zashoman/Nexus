import { NextResponse } from 'next/server';
import { getLatestIngestionJob, getExtractedPatterns } from '@/lib/outreach/ingestion';

// GET: latest ingestion job + extracted patterns
export async function GET() {
  try {
    const [job, patterns] = await Promise.all([
      getLatestIngestionJob(),
      getExtractedPatterns(),
    ]);

    return NextResponse.json({
      latest_job: job,
      patterns,
      pattern_count: patterns.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
