import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface GameRoom {
  id: string;
  room_code: string;
  host_nickname: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round?: number;
  settings: {
    rounds: number;
    timePerRound: number;
    difficulty: string;
  };
  created_at: string;
  updated_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  nickname: string;
  is_ready: boolean;
  joined_at: string;
  last_seen: string;
}

export interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  sequence: number[];
  status: 'active' | 'completed';
  created_at: string;
}