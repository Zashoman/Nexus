import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// One-time migration endpoint — add uploads_playlist_id column
export async function POST() {
  const db = getServiceSupabase();

  // Add uploads_playlist_id column if it doesn't exist
  const { error } = await db.rpc('exec_sql', {
    query: `ALTER TABLE intel_youtube_channels ADD COLUMN IF NOT EXISTS uploads_playlist_id TEXT;`,
  });

  if (error) {
    // Try direct approach — column might already exist
    return NextResponse.json({
      note: 'RPC not available. Run this SQL in Supabase SQL Editor:',
      sql: 'ALTER TABLE intel_youtube_channels ADD COLUMN IF NOT EXISTS uploads_playlist_id TEXT;',
    });
  }

  return NextResponse.json({ success: true, message: 'Column added' });
}
