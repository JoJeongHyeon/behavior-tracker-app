create extension if not exists "pgcrypto";

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, record_date)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  total_pages integer,
  status text not null default 'reading',
  started_at date,
  finished_at date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_records enable row level security;
alter table public.books enable row level security;

create policy "Users can read own daily records"
  on public.daily_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily records"
  on public.daily_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily records"
  on public.daily_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own daily records"
  on public.daily_records for delete
  using (auth.uid() = user_id);

create policy "Users can read own books"
  on public.books for select
  using (auth.uid() = user_id);

create policy "Users can insert own books"
  on public.books for insert
  with check (auth.uid() = user_id);

create policy "Users can update own books"
  on public.books for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own books"
  on public.books for delete
  using (auth.uid() = user_id);
