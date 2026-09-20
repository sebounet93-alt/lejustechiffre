/*
# Multiplayer group challenges: add duel_participants table

1. New Tables
- `duel_participants` — stores each player's guess for a group challenge
  - `id` (uuid, primary key, default gen_random_uuid())
  - `created_at` (timestamptz, default now())
  - `duel_id` (uuid, references duels(id) on delete cascade)
  - `player_name` (text, not null) — the player's nickname
  - `player_guess` (numeric, not null) — their estimate
  - `accuracy_percentage` (numeric, not null) — precomputed accuracy score

2. Modified Tables
- `duels` — removes the single-opponent columns (opponent_name, opponent_guess, status)
  which are no longer needed for multiplayer. The duels table now only stores the
  challenge definition (question, answer, unit, source, challenger_name, challenger_guess).
  NOTE: We do NOT drop columns to preserve data safety. The columns remain but are unused.

3. Security
- Enable RLS on `duel_participants`.
- This is a no-auth app (no sign-in screen). All policies use `TO anon, authenticated`
  so the anon-key frontend can insert, read participant rows.
- SELECT: anyone can read participants (needed to display the leaderboard).
- INSERT: anyone can add their guess as a participant.
- UPDATE/DELETE: not needed for this app but added for completeness with open access.
*/

CREATE TABLE IF NOT EXISTS duel_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  duel_id uuid NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_guess numeric NOT NULL,
  accuracy_percentage numeric NOT NULL
);

ALTER TABLE duel_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_participants" ON duel_participants;
CREATE POLICY "anon_select_participants"
ON duel_participants FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_participants" ON duel_participants;
CREATE POLICY "anon_insert_participants"
ON duel_participants FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_participants" ON duel_participants;
CREATE POLICY "anon_update_participants"
ON duel_participants FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_participants" ON duel_participants;
CREATE POLICY "anon_delete_participants"
ON duel_participants FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_duel_participants_duel_id ON duel_participants(duel_id);
