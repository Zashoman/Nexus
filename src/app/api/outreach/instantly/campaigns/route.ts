import { NextResponse } from 'next/server';
import { listCampaigns } from '@/lib/outreach/instantly';

// GET-only: list Instantly campaigns
export async function GET() {
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
