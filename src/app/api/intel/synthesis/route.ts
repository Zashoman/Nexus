import { NextRequest, NextResponse } from 'next/server';
import { generateSynthesis } from '@/lib/intel/synthesizer';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret for production
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'production') {
      // Allow GET without auth for reading synthesis
      // Only block if it's a cron trigger (has specific header)
      const isCron = req.headers.get('x-vercel-cron');
      if (isCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  try {
    const synthesis = await generateSynthesis();
    return NextResponse.json(synthesis);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate synthesis' },
      { status: 500 }
    );
  }
}
