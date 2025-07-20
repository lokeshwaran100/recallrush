import { useState, useEffect, useCallback } from 'react';
import { supabase, GameRoom, RoomPlayer, GameRound } from '../lib/supabase';

export function useSupabaseRoom(roomCode: string | null, nickname: string) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Create a new room
  const createRoom = useCallback(async (): Promise<string> => {
    setLoading(true);
    setError('');

    try {
      // Generate room code using database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_room_code');

      if (codeError) throw codeError;

      const newRoomCode = codeData;

      // Create the room
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: newRoomCode,
          host_nickname: nickname,
          status: 'waiting'
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as first player
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          nickname: nickname,
          is_ready: false
        });

      if (playerError) throw playerError;

      return newRoomCode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [nickname]);

  // Join an existing room
  const joinRoom = useCallback(async (code: string): Promise<boolean> => {
    setLoading(true);
    setError('');

    try {
      // Check if room exists
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', code.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !roomData) {
        setError('Room not found or game already started');
        return false;
      }

      // Check if nickname is already taken in this room
      const { data: existingPlayer } = await supabase
        .from('room_players')
        .select('nickname')
        .eq('room_id', roomData.id)
        .eq('nickname', nickname)
        .single();

      if (existingPlayer) {
        setError('Nickname already taken in this room');
        return false;
      }

      // Add player to room
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          nickname: nickname,
          is_ready: false
        });

      if (playerError) throw playerError;

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [nickname]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!room) return;

    try {
      // Remove player from room
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', room.id)
        .eq('nickname', nickname);

      // If host is leaving, delete the room
      if (room.host_nickname === nickname) {
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', room.id);
      }
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  }, [room, nickname]);

  // Toggle ready status
  const toggleReady = useCallback(async (isReady: boolean) => {
    if (!room) return;

    try {
      await supabase
        .from('room_players')
        .update({ 
          is_ready: isReady,
          last_seen: new Date().toISOString()
        })
        .eq('room_id', room.id)
        .eq('nickname', nickname);
    } catch (err) {
      console.error('Error updating ready status:', err);
    }
  }, [room, nickname]);

  // Update game settings (host only)
  const updateGameSettings = useCallback(async (settings: GameRoom['settings']) => {
    if (!room || room.host_nickname !== nickname) return;

    try {
      await supabase
        .from('game_rooms')
        .update({ settings })
        .eq('id', room.id);
    } catch (err) {
      console.error('Error updating game settings:', err);
    }
  }, [room, nickname]);

  // Start game (host only)
  const startGame = useCallback(async () => {
    console.log('startGame function called');
    console.log('Room:', room);
    console.log('Nickname:', nickname);
    console.log('Room host nickname:', room?.host_nickname);
    
    if (!room || room.host_nickname !== nickname) {
      console.log('Cannot start game - not host or no room');
      return;
    }

    try {
      console.log('Updating room status to playing...');
      await supabase
        .from('game_rooms')
        .update({ status: 'playing' })
        .eq('id', room.id);
      console.log('Room status updated successfully');
      
      // Fallback: manually refresh room data in case real-time isn't working
      setTimeout(async () => {
        console.log('Manually refreshing room data...');
        const { data: updatedRoom, error } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', room.id)
          .single();
        
        if (!error && updatedRoom) {
          console.log('Manually updated room:', updatedRoom);
          setRoom(updatedRoom);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error starting game:', err);
    }
  }, [room, nickname]);

  // Start a new round with random sequence
  const startRound = useCallback(async () => {
    if (!room || room.host_nickname !== nickname) return;

    try {
      console.log('Starting new round...');
      
      // Generate random sequence based on difficulty
      const sequenceLength = room.settings.difficulty === 'easy' ? 4 : 
                           room.settings.difficulty === 'medium' ? 6 : 8;
      const sequence = Array.from({ length: sequenceLength }, () => 
        Math.floor(Math.random() * 9) + 1
      );

      console.log(`Generated sequence for ${room.settings.difficulty} difficulty:`, sequence);

      const nextRoundNumber = (room.current_round || 0) + 1;
      console.log(`Next round number: ${nextRoundNumber}`);

      // Create new round in database
      const { data: roundData, error: roundError } = await supabase
        .from('game_rounds')
        .insert({
          room_id: room.id,
          round_number: nextRoundNumber,
          sequence: sequence,
          status: 'active'
        })
        .select()
        .single();

      if (roundError) throw roundError;

      console.log('Round created in database:', roundData);

      // Update room's current round
      await supabase
        .from('game_rooms')
        .update({ 
          current_round: nextRoundNumber,
          status: 'playing'
        })
        .eq('id', room.id);

      console.log('Room updated with new round number');

      return roundData;
    } catch (err) {
      console.error('Error starting round:', err);
      setError('Failed to start round');
    }
  }, [room, nickname]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!roomCode) return;

    let roomSubscription: any;
    let playersSubscription: any;
    let roundsSubscription: any;

    const setupSubscriptions = async () => {
      try {
        // Get initial room data
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single();

        if (roomError || !roomData) {
          setError('Room not found');
          return;
        }

        setRoom(roomData);

        // Get initial players data
        const { data: playersData, error: playersError } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomData.id)
          .order('joined_at');

        if (!playersError && playersData) {
          setPlayers(playersData);
        }

        // Get current round data if room is playing
        if (roomData.status === 'playing' && roomData.current_round > 0) {
          const { data: roundData, error: roundError } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('room_id', roomData.id)
            .eq('round_number', roomData.current_round)
            .single();

          if (!roundError && roundData) {
            setCurrentRound(roundData);
          }
        }

        // Subscribe to room changes
        roomSubscription = supabase
          .channel(`room-${roomData.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'game_rooms',
              filter: `id=eq.${roomData.id}`
            },
            (payload) => {
              console.log('Room change received:', payload);
              if (payload.eventType === 'UPDATE') {
                console.log('Updating room state:', payload.new);
                setRoom(payload.new as GameRoom);
              } else if (payload.eventType === 'DELETE') {
                setError('Room was deleted');
                setRoom(null);
                setPlayers([]);
              }
            }
          )
          .subscribe();

        // Subscribe to players changes
        playersSubscription = supabase
          .channel(`players-${roomData.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'room_players',
              filter: `room_id=eq.${roomData.id}`
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setPlayers(prev => [...prev, payload.new as RoomPlayer]);
              } else if (payload.eventType === 'UPDATE') {
                setPlayers(prev => prev.map(player => 
                  player.id === payload.new.id ? payload.new as RoomPlayer : player
                ));
              } else if (payload.eventType === 'DELETE') {
                setPlayers(prev => prev.filter(player => player.id !== payload.old.id));
              }
            }
          )
          .subscribe();

        // Subscribe to rounds changes
        roundsSubscription = supabase
          .channel(`rounds-${roomData.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'game_rounds',
              filter: `room_id=eq.${roomData.id}`
            },
            (payload) => {
              console.log('Round change received:', payload);
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                setCurrentRound(payload.new as GameRound);
                console.log('New round set:', payload.new);
              }
            }
          )
          .subscribe();

      } catch (err) {
        setError('Failed to connect to room');
      }
    };

    setupSubscriptions();

    // Cleanup subscriptions
    return () => {
      if (roomSubscription) {
        supabase.removeChannel(roomSubscription);
      }
      if (playersSubscription) {
        supabase.removeChannel(playersSubscription);
      }
      if (roundsSubscription) {
        supabase.removeChannel(roundsSubscription);
      }
    };
  }, [roomCode]);

  // Update last_seen timestamp periodically
  useEffect(() => {
    if (!room) return;

    const interval = setInterval(async () => {
      try {
        await supabase
          .from('room_players')
          .update({ last_seen: new Date().toISOString() })
          .eq('room_id', room.id)
          .eq('nickname', nickname);
      } catch (err) {
        console.error('Error updating last_seen:', err);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [room, nickname]);

  return {
    room,
    players,
    currentRound,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    updateGameSettings,
    startGame,
    startRound
  };
}