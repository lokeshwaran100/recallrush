/*
  # Add game rounds and sequences

  1. New Tables
    - `game_rounds`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to game_rooms)
      - `round_number` (integer)
      - `sequence` (jsonb array of numbers)
      - `status` (text: 'active', 'completed')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `game_rounds` table
    - Add policies for authenticated users to read/write game rounds

  3. Changes
    - Add current_round to game_rooms table
    - Add game status tracking
*/

-- Add current_round to game_rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_rooms' AND column_name = 'current_round'
  ) THEN
    ALTER TABLE game_rooms ADD COLUMN current_round integer DEFAULT 0;
  END IF;
END $$;

-- Create game_rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  sequence jsonb NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;

-- Policies for game_rounds
CREATE POLICY "Anyone can read game rounds"
  ON game_rounds
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create game rounds"
  ON game_rounds
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update game rounds"
  ON game_rounds
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Add unique constraint for room_id and round_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'game_rounds_room_round_unique'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_room_round_unique UNIQUE (room_id, round_number);
  END IF;
END $$;