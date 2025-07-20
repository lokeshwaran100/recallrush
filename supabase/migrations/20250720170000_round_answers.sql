/*
  # Add round_answers table for player submissions

  1. New Table
    - `round_answers`
      - `id` (uuid, primary key)
      - `round_id` (uuid, foreign key to game_rounds)
      - `nickname` (text)
      - `answer` (jsonb array of numbers)
      - `submitted_at` (timestamp)
      - unique (round_id, nickname)

  2. Security
    - Enable RLS
    - Policies for insert/select
*/

CREATE TABLE IF NOT EXISTS round_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES game_rounds(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  answer jsonb NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(round_id, nickname)
);

ALTER TABLE round_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit answers"
  ON round_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read answers"
  ON round_answers
  FOR SELECT
  TO anon, authenticated
  USING (true); 