-- =====================================================================
-- Quiniela Mundial 2026 — Mejoras
--  1) apply_result: corrige el marcador final aunque el partido ya
--     estuviera "finished" (arregla el bug del minuto 90: goles
--     posteriores no actualizaban el resultado).
--  2) Vista player_history: historial de aciertos por jugador
--     (solo partidos finalizados; se expone para la tabla pública).
-- =====================================================================

-- ------------------------------------------------------------------
-- 1) apply_result — siempre actualiza si el marcador/estado cambió.
--    El trigger trg_score_match recalcula los puntos automáticamente.
-- ------------------------------------------------------------------
create or replace function public.apply_result(
  p_match_id int, p_home int, p_away int
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.matches
     set home_score = p_home,
         away_score = p_away,
         status     = 'finished'
   where id = p_match_id
     and (home_score is distinct from p_home
          or away_score is distinct from p_away
          or status   is distinct from 'finished');
end; $$;

grant execute on function public.apply_result(int, int, int)
  to anon, authenticated;

-- ------------------------------------------------------------------
-- 2) player_history — historial por jugador (partidos finalizados).
--    security_invoker = false: corre con privilegios del dueño para
--    poder mostrar los pronósticos de TODOS, pero SOLO de partidos
--    que ya terminaron (no expone pronósticos de partidos por jugar).
-- ------------------------------------------------------------------
create or replace view public.player_history
with (security_invoker = false) as
  select
    p.user_id,
    pr.display_name,
    m.id          as match_id,
    m.kickoff_at,
    ht.name       as home_team,
    ht.flag       as home_flag,
    aw.name       as away_team,
    aw.flag       as away_flag,
    m.home_score,
    m.away_score,
    p.home_goals  as pred_home,
    p.away_goals  as pred_away,
    p.points
  from public.predictions p
  join public.matches  m  on m.id = p.match_id
  join public.profiles pr on pr.id = p.user_id
  join public.teams    ht on ht.id = m.home_team_id
  join public.teams    aw on aw.id = m.away_team_id
  where m.status = 'finished';

grant select on public.player_history to anon, authenticated;
