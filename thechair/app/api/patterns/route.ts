import { NextResponse } from 'next/server';
import { buildPatternsReport } from '../../../lib/patterns/report';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(buildPatternsReport());
}
