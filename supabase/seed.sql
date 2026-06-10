-- =====================================================================
-- Quiniela Mundial 2026 — Datos de la fase de grupos
-- 48 selecciones · 12 grupos (A-L) · 72 partidos (round-robin)
--
-- ⚠️  IMPORTANTE: la composición de los grupos proviene de fuentes
-- públicas tras el sorteo (5-dic-2025). Las HORAS de los partidos son
-- aproximadas (ventanas por jornada) y debes ajustarlas a las oficiales
-- de FIFA desde el panel de Admin. El cierre de pronósticos usa kickoff_at.
-- =====================================================================

-- Limpia (por si se vuelve a ejecutar)
truncate public.predictions restart identity cascade;
truncate public.matches     restart identity cascade;
truncate public.teams       restart identity cascade;

-- Selecciones (en orden de bombo dentro de cada grupo)
insert into public.teams (name, group_letter, flag) values
-- Grupo A
('México','A','🇲🇽'),('Sudáfrica','A','🇿🇦'),('Corea del Sur','A','🇰🇷'),('Chequia','A','🇨🇿'),
-- Grupo B
('Canadá','B','🇨🇦'),('Bosnia y Herzegovina','B','🇧🇦'),('Catar','B','🇶🇦'),('Suiza','B','🇨🇭'),
-- Grupo C
('Brasil','C','🇧🇷'),('Marruecos','C','🇲🇦'),('Haití','C','🇭🇹'),('Escocia','C','🏴'),
-- Grupo D
('Estados Unidos','D','🇺🇸'),('Paraguay','D','🇵🇾'),('Australia','D','🇦🇺'),('Türkiye','D','🇹🇷'),
-- Grupo E
('Alemania','E','🇩🇪'),('Curazao','E','🇨🇼'),('Costa de Marfil','E','🇨🇮'),('Ecuador','E','🇪🇨'),
-- Grupo F
('Países Bajos','F','🇳🇱'),('Japón','F','🇯🇵'),('Suecia','F','🇸🇪'),('Túnez','F','🇹🇳'),
-- Grupo G
('Bélgica','G','🇧🇪'),('Egipto','G','🇪🇬'),('Irán','G','🇮🇷'),('Nueva Zelanda','G','🇳🇿'),
-- Grupo H
('España','H','🇪🇸'),('Cabo Verde','H','🇨🇻'),('Arabia Saudita','H','🇸🇦'),('Uruguay','H','🇺🇾'),
-- Grupo I
('Francia','I','🇫🇷'),('Senegal','I','🇸🇳'),('Irak','I','🇮🇶'),('Noruega','I','🇳🇴'),
-- Grupo J
('Argentina','J','🇦🇷'),('Argelia','J','🇩🇿'),('Austria','J','🇦🇹'),('Jordania','J','🇯🇴'),
-- Grupo K
('Portugal','K','🇵🇹'),('Rep. Dem. del Congo','K','🇨🇩'),('Uzbekistán','K','🇺🇿'),('Colombia','K','🇨🇴'),
-- Grupo L
('Inglaterra','L','🏴'),('Croacia','L','🇭🇷'),('Ghana','L','🇬🇭'),('Panamá','L','🇵🇦');

-- Genera los 6 partidos de cada grupo con el patrón estándar round-robin:
--   J1: T1-T2, T3-T4   J2: T1-T3, T4-T2   J3: T4-T1, T2-T3
do $$
declare
  g   char(1);
  t   int[];
  gi  int;
  d1  timestamptz;
  d2  timestamptz;
  d3  timestamptz;
begin
  for g in select distinct group_letter from public.teams order by 1 loop
    select array_agg(id order by id) into t from public.teams where group_letter = g;
    gi := ascii(g) - ascii('A');                       -- 0..11
    d1 := timestamptz '2026-06-11 18:00:00+00' + ((gi % 6) * interval '1 day');
    d2 := timestamptz '2026-06-18 18:00:00+00' + ((gi % 6) * interval '1 day');
    d3 := timestamptz '2026-06-24 15:00:00+00' + ((gi % 4) * interval '1 day');

    insert into public.matches (group_letter, matchday, home_team_id, away_team_id, kickoff_at) values
      (g, 1, t[1], t[2], d1),
      (g, 1, t[3], t[4], d1 + interval '3 hours'),
      (g, 2, t[1], t[3], d2),
      (g, 2, t[4], t[2], d2 + interval '3 hours'),
      (g, 3, t[4], t[1], d3),
      (g, 3, t[2], t[3], d3 + interval '3 hours');
  end loop;
end $$;
