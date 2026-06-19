import { NextResponse } from 'next/server';
import { getLatestProjectFromSupabase, isSupabaseProjectsConfigured } from '@/lib/supabase-projects';

export const runtime = 'nodejs';

export async function GET() {
  try {
    if (!isSupabaseProjectsConfigured()) {
      return NextResponse.json({ success: true, project: null, skipped: true });
    }

    const project = await getLatestProjectFromSupabase();

    return NextResponse.json({ success: true, project });
  } catch (error: unknown) {
    console.error('Load latest project error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load latest project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
