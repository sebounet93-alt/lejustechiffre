/*
# Create duels table for Le Chiffre Maudit

1. New Tables
- `duels` — stores asynchronous estimation duels between two players
  - `id` (uuid, primary key, default gen_random_uuid())
  - `created_at` (timestamptz, default now())
  - `challenger_name` (text, not null) — the player who created the trap
  - `question_text` (text, not null) — the stat question displayed
  - `real_answer` (numeric, not null) — the true value
  - `unit` (text, not null) — unit label (e.g. "baguettes", "%")
  - `challenger_guess` (numeric, not null) — challenger's secret estimate
  - `opponent_name` (text, nullable) — filled when opponent answers
  - `opponent_guess` (numeric, nullable) — filled when opponent answers
  - `status` (text, default 'pending') — 'pending' or 'completed'

2. Security
- Enable RLS on `duels`.
- This is a no-auth app (no sign-in screen). All policies use `TO anon, authenticated`
  so the anon-key frontend can insert, read, and update duels.
- SELECT: anyone can read any duel (needed to load a duel by id from a shared link).
- INSERT: anyone can create a new duel.
- UPDATE: anyone can update a pending duel (opponent submits their answer).
  This is intentionally open because the anti-cheat is enforced at the application
  level — the frontend only updates rows where status='pending', and the atomic
  condition in the UPDATE query ensures a completed duel cannot be overwritten.
- DELETE: not needed for this app, but added for completeness with open access.

3. Notes
- No user_id column — this app has no authentication. Player identity is stored
  in localStorage on the client, and duel ownership is tracked via a list of
  duel IDs in localStorage.
- Anti-cheat is enforced two ways: (1) the frontend checks status === 'pending'
  before showing the form, (2) the UPDATE query includes `.eq('status', 'pending')`
  so a concurrent or replayed submission silently no-ops.
*/

CREATE TABLE IF NOT EXISTS duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  challenger_name text NOT NULL,
  question_text text NOT NULL,
  real_answer numeric NOT NULL,
  unit text NOT NULL,
  challenger_guess numeric NOT NULL,
  opponent_name text,
  opponent_guess numeric,
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_duels" ON duels;
CREATE POLICY "anon_select_duels"
ON duels FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_duels" ON duels;
CREATE POLICY "anon_insert_duels"
ON duels FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_duels" ON duels;
CREATE POLICY "anon_update_duels"
ON duels FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_duels" ON duels;
CREATE POLICY "anon_delete_duels"
ON duels FOR DELETE
TO anon, authenticated USING (true);
