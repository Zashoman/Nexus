import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSetting } from '@/lib/robox-intel/settings';
import type { Settings } from '@/lib/robox-intel/settings';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<Settings>;

  const updates: Array<[keyof Settings, Settings[keyof Settings]]> = [];

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    updates.push([key as keyof Settings, value as Settings[keyof Settings]]);
  }

  for (const [key, value] of updates) {
    // TypeScript forgets per-item narrowing here; runtime typing
    // matches because we're only pulling from the typed body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateSetting(key, value as any);
  }

  return NextResponse.json(await getSettings());
}
