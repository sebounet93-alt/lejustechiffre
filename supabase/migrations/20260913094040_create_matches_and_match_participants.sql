/*
# Create matches and match_participants tables

1. New Tables
- `matches`
  - `id` (uuid, primary key)
  - `question_ids` (int8[], array of 5 question IDs from the STATS dataset)
  - `created_at` (timestamptz, default now())
- `match_participants`
  - `id` (uuid, primary key)
  - `match_id` (uuid, references matches(id) on delete cascade)
  - `player_name` (text, not null)
  - `guesses` (numeric[], array of 5 guesses)
  - `accuracies` (numeric[], array of 5 accuracy percentages)
  - `average_accuracy` (numeric, mean of the 5 accuracies)
  - `created_at` (timestamptz, default now())
- UNIQUE(match_id, player_name) on match_participants to prevent duplicate entries.

2. Security
- This is a no-auth app (no sign-in screen). Data is intentionally public/shared.
- RLS enabled on both tables.
- Policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because anyone can create matches and participate — this is the core viral mechanic.
*/

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_ids int8[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_matches" ON matches;
CREATE POLICY "anon_select_matches" ON matches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_matches" ON matches;
CREATE POLICY "anon_insert_matches" ON matches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  guesses numeric[] NOT NULL,
  accuracies numeric[] NOT NULL,
  average_accuracy numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, player_name)
);

ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_match_participants" ON match_participants;
CREATE POLICY "anon_select_match_participants" ON match_participants FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_match_participants" ON match_participants;
CREATE POLICY "anon_insert_match_participants" ON match_participants FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_match_participants_match_id
  ON match_participants(match_id);
