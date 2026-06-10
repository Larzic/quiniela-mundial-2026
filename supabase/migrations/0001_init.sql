-- =====================================================================
-- Quiniela Mundial 2026 — Esquema inicial
-- Backend: Supabase (Postgres + Auth)
-- Puntuación: 1X2 (acertar Local / Empate / Visitante)
-- =====================================================================

-- ------------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------------

-- Perfil de cada jugador (1:1 con auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Selecciones, agrupadas por letra de grupo
create table if not exists public.teams (
  id           serial primary key,
  name         text not null,
  group_letter char(1) not null,
  flag         text
);

-- Partidos de la fase de grupos
create table if not exists public.matches (
  id            serial primary key,
  group_letter  char(1) not null,
  matchday      int not null,                 -- 1, 2 o 3
  home_team_id  int not null references public.teams(id),
  away_team_id  int not null references public.teams(id),
  kickoff_at    timestamptz not null,         -- hora de cierre de pronósticos
  home_score    int,
  away_score    int,
  status        text not null default 'scheduled'
                check (status in ('scheduled','finished'))
);

-- Pronóstico de un jugador para un partido (uno por partido)
create table if not exists public.predictions (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  match_id   int  not null references public.matches(id) on delete cascade,
  pick       char(1) not null check (pick in ('1','X','2')),
  points     int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists idx_predictions_match on public.predictions(match_id);
create index if not exists idx_matches_group on public.matches(group_letter, matchday);

-- ------------------------------------------------------------------
-- FUNCIONES Y TRIGGERS
-- ------------------------------------------------------------------

-- Puntos que vale acertar el 1X2 (cámbialo aquí si quieres otro valor)
create or replace function public.points_per_hit() returns int
language sql immutable as $$ select 3 $$;

-- Resultado 1X2 a partir del marcador
create or replace function public.match_result(h int, a int) returns char(1)
language sql immutable as $$
  select case
    when h is null or a is null then null
    when h > a then '1'
    when h = a then 'X'
    else '2'
  end;
$$;

-- ¿El usuario actual es admin? (security definer evita recursión de RLS)
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Crea el perfil automáticamente al registrarse un usuario nuevo
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Al cargar/editar el resultado de un partido, recalcula los puntos
create or replace function public.score_match() returns trigger
language plpgsql security definer set search_path = public as $$
declare res char(1);
begin
  res := public.match_result(new.home_score, new.away_score);
  if new.status = 'finished' and res is not null then
    update public.predictions p
       set points = case when p.pick = res then public.points_per_hit() else 0 end
     where p.match_id = new.id;
  else
    update public.predictions set points = 0 where match_id = new.id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_score_match on public.matches;
create trigger trg_score_match
  after update of home_score, away_score, status on public.matches
  for each row execute function public.score_match();

-- Bloquea pronósticos una vez iniciado el partido
create or replace function public.check_prediction_open() returns trigger
language plpgsql set search_path = public as $$
declare k timestamptz;
begin
  select kickoff_at into k from public.matches where id = new.match_id;
  if now() >= k then
    raise exception 'Los pronósticos para este partido ya están cerrados';
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_check_prediction_open on public.predictions;
create trigger trg_check_prediction_open
  before insert or update on public.predictions
  for each row execute function public.check_prediction_open();

-- ------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;
alter table public.predictions enable row level security;

-- profiles: todos pueden leer (para la tabla de posiciones); cada quien edita el suyo
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- teams / matches: lectura pública; escritura solo admin
drop policy if exists "teams_read"        on public.teams;
drop policy if exists "teams_admin_write" on public.teams;
create policy "teams_read"        on public.teams for select using (true);
create policy "teams_admin_write" on public.teams for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "matches_read"        on public.matches;
drop policy if exists "matches_admin_write" on public.matches;
create policy "matches_read"        on public.matches for select using (true);
create policy "matches_admin_write" on public.matches for all
  using (public.is_admin()) with check (public.is_admin());

-- predictions: cada quien ve y edita SOLO las suyas
drop policy if exists "pred_select" on public.predictions;
drop policy if exists "pred_insert" on public.predictions;
drop policy if exists "pred_update" on public.predictions;
create policy "pred_select" on public.predictions for select using (auth.uid() = user_id);
create policy "pred_insert" on public.predictions for insert with check (auth.uid() = user_id);
create policy "pred_update" on public.predictions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- VISTA: TABLA DE POSICIONES
-- Corre con privilegios del dueño (security_invoker = false) para poder
-- sumar los puntos de todos sin exponer los pronósticos individuales.
-- ------------------------------------------------------------------
create or replace view public.leaderboard
with (security_invoker = false) as
  select
    pr.id   as user_id,
    pr.display_name,
    coalesce(sum(p.points), 0)::int as points,
    count(p.id) filter (where p.points > 0) as hits,
    count(p.id) as predictions
  from public.profiles pr
  left join public.predictions p on p.user_id = pr.id
  group by pr.id, pr.display_name
  order by points desc, hits desc, pr.display_name;

grant select on public.leaderboard to anon, authenticated;
