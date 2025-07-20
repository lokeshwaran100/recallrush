import React from 'react';
import { Users, Crown, Settings, Play } from 'lucide-react';
import { useSupabaseRoom } from '../hooks/useSupabaseRoom';
import { supabase } from '../lib/supabase';
import SequenceDisplay from './SequenceDisplay';
import RoundResults from './RoundResults';
import FinalResults from './FinalResults';

interface GameRoomProps {
  nickname: string;
  roomCode: string;
  isHost: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export default function GameRoom({ nickname, roomCode, isHost, onStartGame, onLeaveRoom }: GameRoomProps) {
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [sequenceHidden, setSequenceHidden] = React.useState<boolean>(false);
  const [isStartingRound, setIsStartingRound] = React.useState<boolean>(false);
  const [roundStarted, setRoundStarted] = React.useState<boolean>(false);
  const [showRoundResults, setShowRoundResults] = React.useState<boolean>(false);
  const [showFinalResults, setShowFinalResults] = React.useState<boolean>(false);

  const { 
    room, 
    players, 
    currentRound,
    loading, 
    error, 
    leaveRoom, 
    toggleReady: supabaseToggleReady, 
    updateGameSettings, 
    startGame,
    startRound
  } = useSupabaseRoom(roomCode, nickname);

  // Synchronize local isReady state with player data from database
  React.useEffect(() => {
    const currentPlayer = players.find(player => player.nickname === nickname);
    if (currentPlayer) {
      console.log(`Syncing ready state for ${nickname}: ${currentPlayer.is_ready}`);
      setIsReady(currentPlayer.is_ready);
    }
  }, [players, nickname]);

  // Handle ready toggle
  const handleToggleReady = async () => {
    const newReadyState = !isReady;
    console.log(`Toggling ready state for ${nickname}: ${isReady} -> ${newReadyState}`);
    setIsReady(newReadyState);
    await supabaseToggleReady(newReadyState);
  };

  // Handle leaving room
  const handleLeaveRoom = async () => {
    await leaveRoom();
    onLeaveRoom();
  };

  // Handle starting game
  const handleStartGame = () => {
    console.log('Start Game clicked!');
    console.log('Is host:', isHost);
    console.log('Simple can start game:', simpleCanStartGame);
    console.log('All players ready:', allPlayersReady);
    
    if (simpleCanStartGame) {
      console.log('Calling startGame()...');
      startGame();
    } else {
      console.log('Cannot start game - conditions not met');
    }
  };

  // Handle starting round
  const handleStartRound = async () => {
    if (isHost && room?.status === 'playing') {
      setIsStartingRound(true);
      try {
        await startRound();
        console.log('Round started successfully');
        setRoundStarted(true);
        // Reset the success state after 3 seconds
        setTimeout(() => setRoundStarted(false), 3000);
      } catch (err) {
        console.error('Failed to start round:', err);
      } finally {
        setIsStartingRound(false);
      }
    }
  };

  // Handle settings change
  const handleSettingsChange = (key: string, value: any) => {
    if (!room || !isHost) return;
    
    const newSettings = { ...room.settings, [key]: value };
    updateGameSettings(newSettings);
  };

  // Handle sequence hidden callback
  const handleSequenceHidden = React.useCallback(() => {
    setSequenceHidden(true);
  }, []);

  // Handle round completion
  const handleRoundComplete = React.useCallback(async () => {
    // Only show results if we're not already showing them and the round is completed
    if (!showRoundResults && currentRound && currentRound.status === 'completed') {
      console.log('Showing round results for completed round');
      setShowRoundResults(true);
    }
  }, [showRoundResults, currentRound]);

  // Handle next round
  const handleNextRound = React.useCallback(async () => {
    setShowRoundResults(false);
    setSequenceHidden(false);
    if (isHost && room?.status === 'playing') {
      setIsStartingRound(true);
      try {
        // Clear previous round's answers before starting new round
        // This ensures clean state for the new round
        if (currentRound) {
          await supabase
            .from('round_answers')
            .delete()
            .eq('round_id', currentRound.id);
          console.log('Cleared previous round answers before starting new round');
        }
        
        await startRound();
        console.log('Next round started successfully');
        setRoundStarted(true);
        setTimeout(() => setRoundStarted(false), 3000);
      } catch (err) {
        console.error('Failed to start next round:', err);
      } finally {
        setIsStartingRound(false);
      }
    }
  }, [isHost, room?.status, startRound, currentRound]);

  // Reset starting state when new round is detected
  React.useEffect(() => {
    if (currentRound && showRoundResults && currentRound.status === 'active') {
      // New active round has started, reset the results view
      setShowRoundResults(false);
    }
  }, [currentRound, showRoundResults]);

  // Handle game completion
  const handleGameComplete = React.useCallback(() => {
    setShowFinalResults(true);
  }, []);

  // Handle new game
  const handleNewGame = React.useCallback(async () => {
    if (!room || !isHost) return;
    
    try {
      // Clear all round answers from previous game
      await supabase
        .from('round_answers')
        .delete()
        .in('round_id', 
          (await supabase
            .from('game_rounds')
            .select('id')
            .eq('room_id', room.id)
          ).data?.map(r => r.id) || []
        );
      console.log('Cleared all round answers from previous game');

      // Clear all game rounds
      await supabase
        .from('game_rounds')
        .delete()
        .eq('room_id', room.id);
      console.log('Cleared all game rounds');

      // Reset room to waiting status
      await supabase
        .from('game_rooms')
        .update({ 
          status: 'waiting',
          current_round: 0
        })
        .eq('id', room.id);

      // Reset player scores
      await supabase
        .from('room_players')
        .update({
          score: 0,
          correct_answers: 0,
          fastest_answers: 0,
          total_time: 0
        })
        .eq('room_id', room.id);

      setShowFinalResults(false);
      setShowRoundResults(false);
      setSequenceHidden(false);
    } catch (err) {
      console.error('Error starting new game:', err);
    }
  }, [room, isHost]);

  // Reset sequence hidden state when new round starts
  React.useEffect(() => {
    if (currentRound) {
      setSequenceHidden(false);
    }
  }, [currentRound?.id]);

  // Monitor currentRound changes and check for round completion
  React.useEffect(() => {
    console.log('Current round changed:', currentRound);
    
    if (currentRound && currentRound.status === 'active' && !showRoundResults && !showFinalResults) {
      // Check if all players have submitted answers
      const checkRoundCompletion = async () => {
        try {
          // Double-check that the round is still active before proceeding
          const { data: roundData, error: roundError } = await supabase
            .from('game_rounds')
            .select('status')
            .eq('id', currentRound.id)
            .single();
          
          if (roundError || !roundData || roundData.status !== 'active') {
            console.log('Round is no longer active, stopping completion check');
            return;
          }

          const { data: answers, error } = await supabase
            .from('round_answers')
            .select('nickname')
            .eq('round_id', currentRound.id);

          if (!error && answers && answers.length >= players.length) {
            // All players have submitted, mark round as completed and show results
            console.log('All players submitted, completing round');
            
            // Mark the round as completed to prevent further triggers
            await supabase
              .from('game_rounds')
              .update({ status: 'completed' })
              .eq('id', currentRound.id);
            
            // Show results after a short delay
            setTimeout(() => {
              if (!showRoundResults && !showFinalResults) {
                handleRoundComplete();
              }
            }, 1000); // Reduced delay since we're marking as completed
          }
        } catch (err) {
          console.error('Error checking round completion:', err);
        }
      };

      // Check immediately and then every 3 seconds
      checkRoundCompletion();
      const interval = setInterval(checkRoundCompletion, 3000);
      
      return () => clearInterval(interval);
    }
  }, [currentRound, players.length, showRoundResults, showFinalResults, handleRoundComplete]);

  // Check if all players are ready
  const allPlayersReady = players.every(player => 
    player.is_ready || player.nickname === room?.host_nickname
  );
  const canStartGame = isHost && players.length >= 1 && allPlayersReady;

  // Debug logging
  console.log('Debug - Players:', players);
  console.log('Debug - Room host:', room?.host_nickname);
  console.log('Debug - Is host:', isHost);
  console.log('Debug - All players ready:', allPlayersReady);
  console.log('Debug - Can start game:', canStartGame);
  console.log('Debug - Current round:', currentRound);

  // Alternative simpler logic: host can always start if there are players
  const simpleCanStartGame = isHost && players.length >= 1;

  // Show final results
  if (showFinalResults && room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <FinalResults
          roomId={room.id}
          onNewGame={handleNewGame}
          onLeaveRoom={handleLeaveRoom}
          isHost={isHost}
        />
      </div>
    );
  }

  // Show round results
  if (showRoundResults && currentRound && room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <RoundResults
          round={currentRound}
          roomId={room.id}
          onNextRound={handleNextRound}
          onGameComplete={handleGameComplete}
          isHost={isHost}
          totalRounds={room.settings.rounds}
          currentRoundNumber={currentRound.round_number}
        />
      </div>
    );
  }

  // Show game playing state
  if (room?.status === 'playing') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Play className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">Game in Progress</h2>
            </div>
            <div className="text-sm text-gray-600">
              Room: {roomCode} | Round: {room.current_round || 0}/{room.settings.rounds}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2">
            {currentRound ? (
              <SequenceDisplay
                key={currentRound.id}
                sequence={currentRound.sequence}
                roundNumber={currentRound.round_number}
                timePerRound={room.settings.timePerRound}
                onSequenceHidden={handleSequenceHidden}
                onRoundComplete={handleRoundComplete}
                roundId={currentRound.id}
                nickname={nickname}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Waiting for round to start...</p>
                  {isHost && (
                    <button
                      onClick={handleStartRound}
                      disabled={isStartingRound}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isStartingRound ? 'Starting...' : `Start Round ${(room.current_round || 0) + 1}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Players & Game Info */}
          <div className="space-y-6">
            {/* Players List */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Players</h3>
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.nickname}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-800">{player.nickname}</span>
                      {player.nickname === room.host_nickname && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Game Progress */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <h4 className="font-semibold text-indigo-800 mb-2">Game Progress</h4>
              <div className="text-sm text-indigo-700 space-y-1">
                <p>Round: {room.current_round || 0} of {room.settings.rounds}</p>
                <p>Difficulty: {room.settings.difficulty}</p>
                <p>Time per Round: {room.settings.timePerRound}s</p>
              </div>
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Host Controls</h3>
                <div className="space-y-3">
                  {!currentRound && (
                    <button
                      onClick={handleStartRound}
                      disabled={isStartingRound}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isStartingRound ? 'Starting...' : `Start Round ${(room.current_round || 0) + 1}`}
                    </button>
                  )}
                  {roundStarted && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-700 text-sm text-center">Round started successfully! Players can now see the sequence.</p>
                    </div>
                  )}
                  <button
                    onClick={handleLeaveRoom}
                    className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    End Game
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && !room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="text-center">
            <p className="text-gray-600">Loading room...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Room Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">Room: {roomCode}</h2>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Leave Room
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {players.length} player{players.length !== 1 ? 's' : ''} in room
          </p>
          {isHost && (
            <div className="flex items-center space-x-2 text-amber-600">
              <Crown className="w-5 h-5" />
              <span className="font-medium">Host</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Players</span>
            </h3>
            
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.nickname}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                    player.is_ready 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      player.is_ready ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-800">{player.nickname}</span>
                    {player.nickname === room.host_nickname && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    player.is_ready ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {player.nickname === room.host_nickname ? 'Host' : player.is_ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              ))}
            </div>

            {/* Ready Button */}
            {!isHost && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleToggleReady}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isReady
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isReady ? 'Ready!' : 'Mark as Ready'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Game Settings & Controls */}
        <div className="space-y-6">
          {/* Game Settings */}
          {isHost && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Game Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Rounds
                  </label>
                  <select
                    value={room.settings.rounds}
                    onChange={(e) => handleSettingsChange('rounds', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={3}>3 Rounds</option>
                    <option value={5}>5 Rounds</option>
                    <option value={10}>10 Rounds</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time per Round (seconds)
                  </label>
                  <select
                    value={room.settings.timePerRound}
                    onChange={(e) => handleSettingsChange('timePerRound', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={room.settings.difficulty}
                    onChange={(e) => handleSettingsChange('difficulty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Start Game Button */}
          {isHost && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <button
                onClick={handleStartGame}
                disabled={!simpleCanStartGame}
                className={`w-full py-4 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  simpleCanStartGame
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5" />
                <span>Start Game</span>
              </button>
              
              {!simpleCanStartGame && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  {!isHost ? 'Only the host can start the game' : 'Need at least 1 player to start'}
                </p>
              )}

              {/* Debug info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                <p>Debug: Players: {players.length}, Is Host: {isHost.toString()}</p>
                <p>All Ready: {allPlayersReady.toString()}, Can Start: {simpleCanStartGame.toString()}</p>
              </div>
            </div>
          )}

          {/* Game Info */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h4 className="font-semibold text-indigo-800 mb-2">Game Info</h4>
            <div className="text-sm text-indigo-700 space-y-1">
              <p>Rounds: {room.settings.rounds}</p>
              <p>Time per Round: {room.settings.timePerRound}s</p>
              <p>Difficulty: {room.settings.difficulty}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}