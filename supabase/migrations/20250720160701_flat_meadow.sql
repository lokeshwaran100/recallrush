/*
  # Create game rooms and players tables

  1. New Tables
    - `game_rooms`
      - `id` (uuid, primary key)
      - `room_code` (text, unique, 6-character code)
      - `host_id` (uuid, references auth.users)
      - `status` (text, enum: waiting, playing, finished)
      - `settings` (jsonb, game configuration)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `room_players`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references game_rooms)
      - `nickname` (text)
      - `is_ready` (boolean)
      - `joined_at` (timestamp)
      - `last_seen` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for room access and player management
*/

CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  host_nickname text NOT NULL,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  settings jsonb DEFAULT '{"rounds": 5, "timePerRound": 30, "difficulty": "medium"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES game_rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  is_ready boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  UNIQUE(room_id, nickname)
);

-- Enable RLS
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Policies for game_rooms
CREATE POLICY "Anyone can read game rooms"
  ON game_rooms
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create game rooms"
  ON game_rooms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms"
  ON game_rooms
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Policies for room_players
CREATE POLICY "Anyone can read room players"
  ON room_players
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can join rooms"
  ON room_players
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update their player status"
  ON room_players
  FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can leave rooms"
  ON room_players
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM game_rooms WHERE room_code = code) INTO exists;
    
    -- If code doesn't exist, return it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;