-- EbookForge backend setup
-- Run this once in Supabase SQL Editor.
-- Keep SUPABASE_SERVICE_ROLE_KEY server-side only in Vercel environment variables.

create table if not exists public.ebook_projects (
  id text primary key,
  title text,
  status text,
  project_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ebook_projects enable row level security;

-- The app uses the service-role key from server-side API routes, so no public RLS policy is required.
-- This keeps project data private to your backend.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ebookforge-images',
  'ebookforge-images',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
