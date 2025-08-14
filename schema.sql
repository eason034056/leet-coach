-- Enable extensions you might need
create extension if not exists pgcrypto; -- for gen_random_uuid

-- 1) problems
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'LeetCode',
  slug text not null,
  url text not null,
  title text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- 2) cards (per-user x problem)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  state text not null check (state in ('learning','review','lapsed')) default 'learning',
  ease_factor double precision not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  due_at date not null default current_date,
  last_q integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, problem_id)
);

-- 3) reviews (each attempt)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  mode text not null check (mode in ('learn','review','relearn')),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_sec integer not null,
  result text not null check (result in ('pass','fail','partial')),
  q integer not null check (q between 0 and 5),
  error_types text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

-- push_subscriptions for Web Push
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- Helpful indexes
create index if not exists idx_cards_user_due on public.cards(user_id, due_at);
create index if not exists idx_reviews_user_finished on public.reviews(user_id, finished_at);
create index if not exists idx_problems_user_slug on public.problems(user_id, slug);
create index if not exists idx_problems_tags_gin on public.problems using gin(tags);

-- Enable RLS
alter table public.problems enable row level security;
alter table public.cards enable row level security;
alter table public.reviews enable row level security;
alter table public.push_subscriptions enable row level security;

-- Policies: users can only see/mutate their own rows
create policy problems_select on public.problems for select using (user_id = auth.uid());
create policy problems_insert on public.problems for insert with check (user_id = auth.uid());
create policy problems_update on public.problems for update using (user_id = auth.uid());
create policy problems_delete on public.problems for delete using (user_id = auth.uid());

create policy cards_select on public.cards for select using (user_id = auth.uid());
create policy cards_insert on public.cards for insert with check (user_id = auth.uid());
create policy cards_update on public.cards for update using (user_id = auth.uid());
create policy cards_delete on public.cards for delete using (user_id = auth.uid());

create policy reviews_select on public.reviews for select using (user_id = auth.uid());
create policy reviews_insert on public.reviews for insert with check (user_id = auth.uid());
create policy reviews_update on public.reviews for update using (user_id = auth.uid());
create policy reviews_delete on public.reviews for delete using (user_id = auth.uid());

create policy psubs_select on public.push_subscriptions for select using (user_id = auth.uid());
create policy psubs_insert on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy psubs_delete on public.push_subscriptions for delete using (user_id = auth.uid());


