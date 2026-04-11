import { NextResponse, after } from 'next/server';
import { createIngestionJob, runIngestion } from '@/lib/outreach/ingestion';

// POST: trigger a new ingestion job
export async function POST() {
  try {
    const jobId = await createIngestionJob();

    // Run in background — Vercel after() keeps the function alive
    after(async () => {
      try {
        await runIngestion(jobId);
      } catch (err) {
        console.error('Ingestion error:', err);
      }
    });

    return NextResponse.json({ ok: true, job_id: jobId, message: 'Ingestion started' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start ingestion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
