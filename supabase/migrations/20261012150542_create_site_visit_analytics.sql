create table public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  page_path text not null check (
    char_length(page_path) between 1 and 300
    and left(page_path, 1) = '/'
    and strpos(page_path, '?') = 0
    and strpos(page_path, '#') = 0
  ),
  created_at timestamptz not null default now()
);

create index site_page_views_created_at_idx
  on public.site_page_views (created_at desc);

create index site_page_views_session_id_idx
  on public.site_page_views (session_id);

alter table public.site_page_views enable row level security;

revoke all on table public.site_page_views from public, anon, authenticated;
grant insert (session_id, page_path)
  on table public.site_page_views to anon, authenticated;

create policy "Visitors can record page views"
  on public.site_page_views for insert to anon, authenticated
  with check (true);
