-- RPC para asignar equipos reales a un partido de eliminatoria (lo usa el
-- sync cuando ESPN ya definió el cruce). SECURITY DEFINER para el rol anon.
create or replace function public.set_teams(
  p_match_id int, p_home int, p_away int
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.matches
     set home_team_id = p_home, away_team_id = p_away
   where id = p_match_id
     and (home_team_id is distinct from p_home
          or away_team_id is distinct from p_away);
end; $$;
grant execute on function public.set_teams(int, int, int) to anon, authenticated;
