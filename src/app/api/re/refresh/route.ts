import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isOwner } from '@/lib/realestate/auth';
import { autoRefreshData } from '@/lib/realestate/claude';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await autoRefreshData();
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auto-refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
