/*
  # Add player scores to room_players table

  1. Changes to room_players table
    - Add `score` (integer, default 0) - total points earned
    - Add `correct_answers` (integer, default 0) - number of correct answers
    - Add `fastest_answers` (integer, default 0) - number of fastest correct answers
    - Add `total_time` (integer, default 0) - total time taken across all rounds (in seconds)

  2. Purpose
    - Track player performance across rounds
    - Calculate scores based on correctness and speed
    - Support results display and leaderboard
*/

-- Add score columns to room_players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_players' AND column_name = 'score'
  ) THEN
    ALTER TABLE room_players ADD COLUMN score integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_players' AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE room_players ADD COLUMN correct_answers integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_players' AND column_name = 'fastest_answers'
  ) THEN
    ALTER TABLE room_players ADD COLUMN fastest_answers integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_players' AND column_name = 'total_time'
  ) THEN
    ALTER TABLE room_players ADD COLUMN total_time integer DEFAULT 0;
  END IF;
END $$;

-- Add submitted_at column to round_answers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'round_answers' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE round_answers ADD COLUMN submitted_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add time_taken column to round_answers for tracking submission time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'round_answers' AND column_name = 'time_taken'
  ) THEN
    ALTER TABLE round_answers ADD COLUMN time_taken integer;
  END IF;
END $$;

-- Add is_correct column to round_answers for easy querying
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'round_answers' AND column_name = 'is_correct'
  ) THEN
    ALTER TABLE round_answers ADD COLUMN is_correct boolean;
  END IF;
END $$;

-- Add is_fastest column to round_answers for tracking fastest correct answer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'round_answers' AND column_name = 'is_fastest'
  ) THEN
    ALTER TABLE round_answers ADD COLUMN is_fastest boolean DEFAULT false;
  END IF;
END $$; 