import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/robox-intel/pipeline';

// Allow longer execution for full pipeline runs
export const maxDuration = 300;

/**
 * Trigger the ingestion pipeline.
 * Called by Vercel cron every 4 hours (GET) or manually via POST.
 * Optional query param: sources=prnewswire,arxiv (comma-separated)
 */
async function handle(req: NextRequest) {
  const sourcesParam = req.nextUrl.searchParams.get('sources');
  const sourceKeys = sourcesParam ? sourcesParam.split(',') : undefined;

  try {
    const result = await runPipeline(sourceKeys);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
