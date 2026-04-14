import { NextResponse, after } from 'next/server';
import { createIngestionJob, runIngestion } from '@/lib/outreach/ingestion';
import { requireAuth } from '@/lib/api-auth';

// POST: trigger a new ingestion job
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

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
