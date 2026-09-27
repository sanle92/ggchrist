-- Run this small compatibility patch before Migration 011.
-- It is safe to run repeatedly.

alter table public.articles
  add column if not exists deleted_at timestamptz;

create index if not exists articles_public_active_idx
  on public.articles (status, published_at desc)
  where deleted_at is null;
