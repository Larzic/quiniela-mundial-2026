alter table public.matches alter column home_team_id drop not null;
alter table public.matches alter column away_team_id drop not null;
alter table public.matches add column if not exists home_label text;
alter table public.matches add column if not exists away_label text;

do $$
begin
  if not exists (select 1 from public.matches where stage <> 'group') then
    insert into public.matches (stage, kickoff_at, home_label, away_label, label) values
  ('r32', '2026-06-28T19:00+00:00', '2° Grupo A', '2° Grupo B', 'SoFi Stadium'),
  ('r32', '2026-06-29T17:00+00:00', '1° Grupo C', '2° Grupo F', 'NRG Stadium'),
  ('r32', '2026-06-29T20:30+00:00', '1° Grupo E', '3° (A/B/C/D/F)', 'Gillette Stadium'),
  ('r32', '2026-06-30T01:00+00:00', '1° Grupo F', '2° Grupo C', 'Estadio BBVA'),
  ('r32', '2026-06-30T17:00+00:00', '2° Grupo E', '2° Grupo I', 'AT&T Stadium'),
  ('r32', '2026-06-30T21:00+00:00', '1° Grupo I', '3° (C/D/F/G/H)', 'MetLife Stadium'),
  ('r32', '2026-07-01T01:00+00:00', '1° Grupo A', '3° (C/E/F/H/I)', 'Estadio Banorte'),
  ('r32', '2026-07-01T16:00+00:00', '1° Grupo L', '3° (E/H/I/J/K)', 'Mercedes-Benz Stadium'),
  ('r32', '2026-07-01T20:00+00:00', '1° Grupo G', '3° (A/E/H/I/J)', 'Lumen Field'),
  ('r32', '2026-07-02T00:00+00:00', '1° Grupo D', '3° (B/E/F/I/J)', 'Levi''s Stadium'),
  ('r32', '2026-07-02T19:00+00:00', '1° Grupo H', '2° Grupo J', 'SoFi Stadium'),
  ('r32', '2026-07-02T23:00+00:00', '2° Grupo K', '2° Grupo L', 'BMO Field'),
  ('r32', '2026-07-03T03:00+00:00', '1° Grupo B', '3° (E/F/G/I/J)', 'BC Place'),
  ('r32', '2026-07-03T18:00+00:00', '2° Grupo D', '2° Grupo G', 'AT&T Stadium'),
  ('r32', '2026-07-03T22:00+00:00', '1° Grupo J', '2° Grupo H', 'Hard Rock Stadium'),
  ('r32', '2026-07-04T01:30+00:00', '1° Grupo K', '3° (D/E/I/J/L)', 'GEHA Field at Arrowhead Stadium'),
  ('r16', '2026-07-04T17:00+00:00', 'Ganador 16avos #1', 'Ganador 16avos #3', 'NRG Stadium'),
  ('r16', '2026-07-04T21:00+00:00', 'Ganador 16avos #2', 'Ganador 16avos #5', 'Lincoln Financial Field'),
  ('r16', '2026-07-05T20:00+00:00', 'Ganador 16avos #4', 'Ganador 16avos #6', 'MetLife Stadium'),
  ('r16', '2026-07-06T00:00+00:00', 'Ganador 16avos #7', 'Ganador 16avos #8', 'Estadio Banorte'),
  ('r16', '2026-07-06T19:00+00:00', 'Ganador 16avos #11', 'Ganador 16avos #12', 'AT&T Stadium'),
  ('r16', '2026-07-07T00:00+00:00', 'Ganador 16avos #9', 'Ganador 16avos #10', 'Lumen Field'),
  ('r16', '2026-07-07T16:00+00:00', 'Ganador 16avos #14', 'Ganador 16avos #16', 'Mercedes-Benz Stadium'),
  ('r16', '2026-07-07T20:00+00:00', 'Ganador 16avos #13', 'Ganador 16avos #15', 'BC Place'),
  ('qf', '2026-07-09T20:00+00:00', 'Ganador Octavos #1', 'Ganador Octavos #2', 'Gillette Stadium'),
  ('qf', '2026-07-10T19:00+00:00', 'Ganador Octavos #5', 'Ganador Octavos #6', 'SoFi Stadium'),
  ('qf', '2026-07-11T21:00+00:00', 'Ganador Octavos #3', 'Ganador Octavos #4', 'Hard Rock Stadium'),
  ('qf', '2026-07-12T01:00+00:00', 'Ganador Octavos #7', 'Ganador Octavos #8', 'GEHA Field at Arrowhead Stadium'),
  ('sf', '2026-07-14T19:00+00:00', 'Ganador Cuartos #1', 'Ganador Cuartos #2', 'AT&T Stadium'),
  ('sf', '2026-07-15T19:00+00:00', 'Ganador Cuartos #3', 'Ganador Cuartos #4', 'Mercedes-Benz Stadium'),
  ('third', '2026-07-18T21:00+00:00', 'Perdedor Semifinal 1', 'Perdedor Semifinal 2', 'Hard Rock Stadium'),
  ('final', '2026-07-19T19:00+00:00', 'Ganador Semifinal 1', 'Ganador Semifinal 2', 'MetLife Stadium');
  end if;
end $$;