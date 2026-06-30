export type Team = {
  id: number;
  name: string;
  group_letter: string;
  flag: string | null;
};

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type Match = {
  id: number;
  stage: Stage;
  group_letter: string | null;
  matchday: number | null;
  label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_label: string | null;
  away_label: string | null;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "finished";
};

export const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos de final",
  sf: "Semifinales",
  third: "Tercer lugar",
  final: "Final",
};

export const STAGE_ORDER: Record<string, number> = {
  group: 0,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  third: 5,
  final: 6,
};

export type Prediction = {
  id: number;
  user_id: string;
  match_id: number;
  pick: "1" | "X" | "2";
  home_goals: number | null;
  away_goals: number | null;
  points: number;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  points: number;
  hits: number;
  predictions: number;
};

export type PlayerHistoryRow = {
  user_id: string;
  display_name: string;
  match_id: number;
  kickoff_at: string;
  home_team: string;
  home_flag: string | null;
  away_team: string;
  away_flag: string | null;
  home_score: number | null;
  away_score: number | null;
  pred_home: number | null;
  pred_away: number | null;
  points: number;
};
