-- Daily rank history for App Trend.
-- Only chart metadata is stored; no user data or credentials belong in these tables.

create table if not exists public.market_snapshot_runs (
  id bigint generated always as identity primary key,
  snapshot_day date not null,
  country text not null check (country in ('us', 'jp')),
  chart text not null check (chart in ('top-free', 'top-paid')),
  source_url text not null,
  source_updated_at timestamptz,
  captured_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'error')),
  app_count integer not null default 0 check (app_count >= 0),
  error_message text,
  unique (snapshot_day, country, chart)
);

create table if not exists public.market_snapshots (
  id bigint generated always as identity primary key,
  snapshot_day date not null,
  captured_at timestamptz not null default now(),
  country text not null check (country in ('us', 'jp')),
  chart text not null check (chart in ('top-free', 'top-paid')),
  app_id text not null,
  app_name text not null,
  developer text not null,
  app_url text not null,
  artwork_url text,
  genres text[] not null default '{}',
  rank integer not null check (rank > 0),
  source_updated_at timestamptz,
  unique (snapshot_day, country, chart, app_id)
);

create index if not exists market_snapshots_app_history_idx
  on public.market_snapshots (app_id, country, chart, snapshot_day desc);
create index if not exists market_snapshots_day_market_idx
  on public.market_snapshots (snapshot_day desc, country, chart, rank);

alter table public.market_snapshot_runs enable row level security;
alter table public.market_snapshots enable row level security;

drop policy if exists "Public can read snapshot run metadata" on public.market_snapshot_runs;
create policy "Public can read snapshot run metadata"
  on public.market_snapshot_runs for select to anon, authenticated using (true);

drop policy if exists "Public can read market snapshots" on public.market_snapshots;
create policy "Public can read market snapshots"
  on public.market_snapshots for select to anon, authenticated using (true);

grant select on public.market_snapshot_runs to anon, authenticated;
grant select on public.market_snapshots to anon, authenticated;
