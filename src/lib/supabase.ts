import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Duel {
  id: string;
  created_at: string;
  challenger_name: string;
  question_text: string;
  real_answer: number;
  unit: string;
  source: string | null;
  challenger_guess: number;
  opponent_name: string | null;
  opponent_guess: number | null;
  status: "pending" | "completed";
}

export interface DuelParticipant {
  id: string;
  created_at: string;
  duel_id: string;
  player_name: string;
  player_guess: number;
  accuracy_percentage: number;
}

export type DuelInsert = Omit<Duel, "id" | "created_at" | "opponent_name" | "opponent_guess" | "status" | "source"> & { source?: string | null };

export type DuelParticipantInsert = Omit<DuelParticipant, "id" | "created_at">;

/* ---------- Match mode types ---------- */

export interface Match {
  id: string;
  question_ids: number[];
  created_at: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  player_name: string;
  guesses: number[];
  accuracies: number[];
  average_accuracy: number;
  created_at: string;
}

export type MatchInsert = Pick<Match, "question_ids">;
export type MatchParticipantInsert = Omit<MatchParticipant, "id" | "created_at">;
