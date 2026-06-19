interface SupabaseProjectRow {
  id: string;
  title?: string;
  status?: string;
  project_data: unknown;
  updated_at?: string;
}

function getSupabaseUrl(): string | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function getSupabaseConfig() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

function getAuthHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

export function isSupabaseProjectsConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export async function saveProjectToSupabase(project: Record<string, unknown>): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) {
    return;
  }

  const projectId = typeof project.id === 'string' && project.id.trim()
    ? project.id
    : crypto.randomUUID();

  const payload: SupabaseProjectRow = {
    id: projectId,
    title: typeof project.title === 'string' ? project.title : 'Untitled Ebook',
    status: typeof project.status === 'string' ? project.status : 'draft',
    project_data: { ...project, id: projectId },
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${config.url}/rest/v1/ebook_projects`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(config.serviceRoleKey),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase project save failed: ${response.status} ${errorText}`);
  }
}

export async function getLatestProjectFromSupabase(): Promise<unknown | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(
    `${config.url}/rest/v1/ebook_projects?select=project_data&order=updated_at.desc&limit=1`,
    {
      method: 'GET',
      headers: getAuthHeaders(config.serviceRoleKey),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase project load failed: ${response.status} ${errorText}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0]?.project_data || null;
}
