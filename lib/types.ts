export type Team = {
  id: number;
  name: string;
  group_letter: string;
  flag: string | null;
};

export type Match = {
  id: number;
  group_letter: string;
  matchday: number;
  home_team_id: number;
  away_team_id: number;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "finished";
};

export type Prediction = {
  id: number;
  user_id: string;
  match_id: number;
  pick: "1" | "X" | "2";
  points: number;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  points: number;
  hits: number;
  predictions: number;
};
