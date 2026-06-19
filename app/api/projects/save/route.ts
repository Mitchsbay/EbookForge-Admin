import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseProjectsConfigured, saveProjectToSupabase } from '@/lib/supabase-projects';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const project = await request.json();

    if (!project || typeof project !== 'object') {
      return NextResponse.json({ error: 'Invalid project payload' }, { status: 400 });
    }

    if (!isSupabaseProjectsConfigured()) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await saveProjectToSupabase(project as Record<string, unknown>);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Save project error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
