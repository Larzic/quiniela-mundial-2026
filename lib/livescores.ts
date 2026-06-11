// Marcadores en vivo desde el feed público de ESPN (gratis, sin API key).

// Mapa nombre en español (como está en la BD) -> nombre en inglés (ESPN)
export const ES_TO_EN: Record<string, string> = {
  México: "Mexico",
  Sudáfrica: "South Africa",
  "Corea del Sur": "South Korea",
  Chequia: "Czechia",
  Canadá: "Canada",
  "Bosnia y Herzegovina": "Bosnia and Herzegovina",
  Catar: "Qatar",
  Suiza: "Switzerland",
  Brasil: "Brazil",
  Marruecos: "Morocco",
  Haití: "Haiti",
  Escocia: "Scotland",
  "Estados Unidos": "United States",
  Paraguay: "Paraguay",
  Australia: "Australia",
  Türkiye: "Turkey",
  Alemania: "Germany",
  Curazao: "Curacao",
  "Costa de Marfil": "Ivory Coast",
  Ecuador: "Ecuador",
  "Países Bajos": "Netherlands",
  Japón: "Japan",
  Suecia: "Sweden",
  Túnez: "Tunisia",
  Bélgica: "Belgium",
  Egipto: "Egypt",
  Irán: "Iran",
  "Nueva Zelanda": "New Zealand",
  España: "Spain",
  "Cabo Verde": "Cape Verde",
  "Arabia Saudita": "Saudi Arabia",
  Uruguay: "Uruguay",
  Francia: "France",
  Senegal: "Senegal",
  Irak: "Iraq",
  Noruega: "Norway",
  Argentina: "Argentina",
  Argelia: "Algeria",
  Austria: "Austria",
  Jordania: "Jordan",
  Portugal: "Portugal",
  "Rep. Dem. del Congo": "DR Congo",
  Uzbekistán: "Uzbekistan",
  Colombia: "Colombia",
  Inglaterra: "England",
  Croacia: "Croatia",
  Ghana: "Ghana",
  Panamá: "Panama",
};

export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

export type LiveTeam = { name: string; score: number; homeAway: string };
export type LiveEvent = {
  state: "pre" | "in" | "post";
  detail: string;
  clock: string;
  teams: LiveTeam[];
};
export type LiveInfo = {
  state: "pre" | "in" | "post";
  detail: string;
  clock: string;
  homeScore: number;
  awayScore: number;
};

// Mapa: clave = par de nombres EN normalizados (ordenado) -> evento
export function buildLiveMap(events: LiveEvent[]): Record<string, LiveEvent> {
  const map: Record<string, LiveEvent> = {};
  for (const ev of events) {
    if (!ev.teams || ev.teams.length !== 2) continue;
    const key = ev.teams
      .map((t) => norm(t.name))
      .sort()
      .join("|");
    map[key] = ev;
  }
  return map;
}

// Marcador en vivo para nuestro partido (nombres en español)
export function liveForMatch(
  map: Record<string, LiveEvent>,
  homeEs: string,
  awayEs: string
): LiveInfo | null {
  const homeEn = ES_TO_EN[homeEs] ?? homeEs;
  const awayEn = ES_TO_EN[awayEs] ?? awayEs;
  const key = [norm(homeEn), norm(awayEn)].sort().join("|");
  const ev = map[key];
  if (!ev) return null;
  const score = (en: string) => {
    const t = ev.teams.find((x) => norm(x.name) === norm(en));
    return t ? t.score : 0;
  };
  return {
    state: ev.state,
    detail: ev.detail,
    clock: ev.clock,
    homeScore: score(homeEn),
    awayScore: score(awayEn),
  };
}
