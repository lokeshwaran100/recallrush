import React from 'react';
import { Trophy, Medal, Crown, Users, Clock, CheckCircle } from 'lucide-react';
import { supabase, RoomPlayer } from '../lib/supabase';

interface FinalResultsProps {
  roomId: string;
  onNewGame?: () => void;
  onLeaveRoom?: () => void;
  isHost: boolean;
}

interface PlayerStats extends RoomPlayer {
  rank: number;
  averageTime: number;
}

export default function FinalResults({ 
  roomId, 
  onNewGame, 
  onLeaveRoom, 
  isHost 
}: FinalResultsProps) {
  const [players, setPlayers] = React.useState<PlayerStats[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch all players with their final stats
  React.useEffect(() => {
    const fetchFinalResults = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all players with their scores
        const { data: playersData, error: playersError } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomId)
          .order('score', { ascending: false });

        if (playersError) {
          throw playersError;
        }

        if (!playersData) {
          setPlayers([]);
          return;
        }

        // Calculate additional stats and rank players
        const playersWithStats: PlayerStats[] = playersData.map((player, index) => {
          const averageTime = player.correct_answers && player.correct_answers > 0 
            ? Math.round((player.total_time || 0) / player.correct_answers)
            : 0;

          return {
            ...player,
            rank: index + 1,
            averageTime
          };
        });

        setPlayers(playersWithStats);

      } catch (err) {
        console.error('Error fetching final results:', err);
        setError('Failed to load final results');
      } finally {
        setLoading(false);
      }
    };

    fetchFinalResults();
  }, [roomId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading final results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const winner = players[0];
  const totalPlayers = players.length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Trophy className="w-10 h-10 text-amber-500" />
          <h2 className="text-4xl font-bold text-gray-800">Game Complete!</h2>
        </div>
        <p className="text-gray-600">
          {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} competed
        </p>
      </div>

      {/* Winner Announcement */}
      {winner && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-6 mb-8 border-2 border-amber-200">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Crown className="w-8 h-8 text-amber-600" />
              <h3 className="text-2xl font-bold text-amber-800">🏆 Winner! 🏆</h3>
            </div>
            <div className="text-3xl font-bold text-amber-900 mb-2">
              {winner.nickname}
            </div>
            <div className="text-lg text-amber-700">
              {winner.score} points • {winner.correct_answers} correct • {winner.fastest_answers} fastest
            </div>
          </div>
        </div>
      )}

      {/* Final Leaderboard */}
      <div className="space-y-4 mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
          <Medal className="w-6 h-6 text-amber-500" />
          <span>Final Leaderboard</span>
        </h3>
        
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`p-4 rounded-lg border-2 ${
              index === 0 
                ? 'bg-amber-50 border-amber-200' 
                : index === 1 
                ? 'bg-gray-50 border-gray-300' 
                : index === 2 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Rank Badge */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 
                    ? 'bg-amber-500 text-white' 
                    : index === 1 
                    ? 'bg-gray-500 text-white' 
                    : index === 2 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {index + 1}
                </div>
                
                {/* Player Info */}
                <div>
                  <div className="font-semibold text-gray-800">{player.nickname}</div>
                  <div className="text-sm text-gray-600 flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{player.correct_answers} correct</span>
                    </span>
                                         {(player.fastest_answers || 0) > 0 && (
                       <span className="flex items-center space-x-1 text-amber-600">
                         <Trophy className="w-3 h-3" />
                         <span>{player.fastest_answers || 0} fastest</span>
                       </span>
                     )}
                    {player.averageTime > 0 && (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{player.averageTime}s avg</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Score */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {player.score}
                </div>
                <div className="text-sm text-gray-600">points</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Game Statistics */}
      <div className="bg-indigo-50 rounded-lg p-6 mb-8 border border-indigo-200">
        <h4 className="font-semibold text-indigo-800 mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Game Statistics</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-indigo-600">Total Players:</span>
            <span className="ml-2 font-medium">{totalPlayers}</span>
          </div>
          <div>
            <span className="text-indigo-600">Highest Score:</span>
            <span className="ml-2 font-medium">{winner?.score || 0}</span>
          </div>
          <div>
            <span className="text-indigo-600">Total Correct:</span>
            <span className="ml-2 font-medium">
              {players.reduce((sum, p) => sum + (p.correct_answers || 0), 0)}
            </span>
          </div>
          <div>
            <span className="text-indigo-600">Total Fastest:</span>
            <span className="ml-2 font-medium">
              {players.reduce((sum, p) => sum + (p.fastest_answers || 0), 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {isHost && onNewGame && (
          <button
            onClick={onNewGame}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Play Again
          </button>
        )}
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Leave Room
          </button>
        )}
      </div>
    </div>
  );
} 