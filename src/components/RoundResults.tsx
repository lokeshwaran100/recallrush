import React from 'react';
import { Trophy, Clock, CheckCircle, XCircle, Award } from 'lucide-react';
import { supabase, RoundAnswer, GameRound } from '../lib/supabase';

interface RoundResultsProps {
  round: GameRound;
  roomId: string;
  onNextRound?: () => void;
  onGameComplete?: () => void;
  isHost: boolean;
  totalRounds: number;
  currentRoundNumber: number;
}

interface PlayerResult {
  nickname: string;
  answer: number[];
  isCorrect: boolean;
  timeTaken: number | null;
  isFastest: boolean;
  points: number;
}

export default function RoundResults({ 
  round, 
  roomId, 
  onNextRound, 
  onGameComplete, 
  isHost,
  totalRounds,
  currentRoundNumber
}: RoundResultsProps) {
  const [results, setResults] = React.useState<PlayerResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [scoresUpdated, setScoresUpdated] = React.useState(false);
  const [startingNextRound, setStartingNextRound] = React.useState(false);

  // Fetch all answers for this round and calculate results
  React.useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all answers for this round
        const { data: answers, error: answersError } = await supabase
          .from('round_answers')
          .select('*')
          .eq('round_id', round.id)
          .order('submitted_at');

        if (answersError) {
          throw answersError;
        }

        if (!answers) {
          setResults([]);
          return;
        }

        // Calculate which answers are correct
        const correctSequence = round.sequence;
        const resultsWithCorrectness: PlayerResult[] = answers.map(answer => ({
          nickname: answer.nickname,
          answer: answer.answer,
          isCorrect: JSON.stringify(answer.answer) === JSON.stringify(correctSequence),
          timeTaken: answer.time_taken,
          isFastest: false, // Will be calculated below
          points: 0 // Will be calculated below
        }));

        // Find the fastest correct answer
        const correctAnswers = resultsWithCorrectness.filter(r => r.isCorrect);
        if (correctAnswers.length > 0) {
          const fastestTime = Math.min(...correctAnswers.map(r => r.timeTaken || Infinity));
          resultsWithCorrectness.forEach(result => {
            if (result.isCorrect && result.timeTaken === fastestTime) {
              result.isFastest = true;
            }
          });
        }

        // Calculate points (10 points for correct answer, 5 bonus for fastest)
        resultsWithCorrectness.forEach(result => {
          if (result.isCorrect) {
            result.points = 10;
            if (result.isFastest) {
              result.points += 5;
            }
          }
        });

        setResults(resultsWithCorrectness);

        // Update the round_answers table with correctness and fastest flags
        await Promise.all(answers.map(async (answer) => {
          const result = resultsWithCorrectness.find(r => r.nickname === answer.nickname);
          if (result) {
            await supabase
              .from('round_answers')
              .update({
                is_correct: result.isCorrect,
                is_fastest: result.isFastest
              })
              .eq('id', answer.id);
          }
        }));

      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [round.id, round.sequence]);

  // Update player scores in the database
  const updatePlayerScores = React.useCallback(async () => {
    if (scoresUpdated) return;

    try {
      // Get all players in the room
      const { data: players, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (playersError) throw playersError;

      // Calculate updated scores for each player
      const scoreUpdates = players?.map(player => {
        const playerResults = results.filter(r => r.nickname === player.nickname);
        const totalPoints = playerResults.reduce((sum, r) => sum + r.points, 0);
        const correctAnswers = playerResults.filter(r => r.isCorrect).length;
        const fastestAnswers = playerResults.filter(r => r.isFastest).length;
        const totalTime = playerResults.reduce((sum, r) => sum + (r.timeTaken || 0), 0);

        return {
          id: player.id,
          score: (player.score || 0) + totalPoints,
          correct_answers: (player.correct_answers || 0) + correctAnswers,
          fastest_answers: (player.fastest_answers || 0) + fastestAnswers,
          total_time: (player.total_time || 0) + totalTime
        };
      });

      // Update all players' scores
      if (scoreUpdates) {
        await Promise.all(scoreUpdates.map(update => 
          supabase
            .from('room_players')
            .update(update)
            .eq('id', update.id)
        ));
      }

      setScoresUpdated(true);
    } catch (err) {
      console.error('Error updating scores:', err);
      setError('Failed to update scores');
    }
  }, [results, roomId, scoresUpdated]);

  // Update scores when results are loaded
  React.useEffect(() => {
    if (results.length > 0 && !scoresUpdated) {
      updatePlayerScores();
    }
  }, [results, scoresUpdated, updatePlayerScores]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
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

  const correctSequence = round.sequence;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Trophy className="w-8 h-8 text-amber-500" />
          <h2 className="text-3xl font-bold text-gray-800">Round {currentRoundNumber} Results</h2>
        </div>
        <p className="text-gray-600">
          {results.length} player{results.length !== 1 ? 's' : ''} participated
        </p>
      </div>

      {/* Correct Sequence Display */}
      <div className="bg-green-50 rounded-lg p-6 mb-8 border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span>Correct Sequence</span>
        </h3>
        <div className="flex justify-center space-x-3">
          {correctSequence.map((number, index) => (
            <div
              key={index}
              className="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center text-lg font-bold"
            >
              {number}
            </div>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="space-y-4 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Player Results</h3>
        {results.map((result, index) => (
          <div
            key={result.nickname}
            className={`p-4 rounded-lg border-2 ${
              result.isCorrect 
                ? result.isFastest 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-gray-800">{result.nickname}</span>
                {result.isCorrect && result.isFastest && (
                  <div className="flex items-center space-x-1 text-amber-600">
                    <Award className="w-4 h-4" />
                    <span className="text-sm font-medium">Fastest!</span>
                  </div>
                )}
                {result.isCorrect && !result.isFastest && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {!result.isCorrect && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {result.points} pts
                </div>
                {result.timeTaken !== null && (
                  <div className="text-sm text-gray-600 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{result.timeTaken}s</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Answer:</span>
              <div className="flex space-x-1">
                {result.answer.map((number, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                      result.isCorrect 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-indigo-50 rounded-lg p-6 mb-8 border border-indigo-200">
        <h4 className="font-semibold text-indigo-800 mb-3">Round Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-indigo-600">Correct Answers:</span>
            <span className="ml-2 font-medium">{results.filter(r => r.isCorrect).length}</span>
          </div>
          <div>
            <span className="text-indigo-600">Fastest Player:</span>
            <span className="ml-2 font-medium">
              {results.find(r => r.isFastest)?.nickname || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {isHost && (
        <div className="flex justify-center space-x-4">
          {currentRoundNumber < totalRounds ? (
            <button
              onClick={() => {
                setStartingNextRound(true);
                onNextRound?.();
              }}
              disabled={startingNextRound}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {startingNextRound ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span>Start Next Round</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onGameComplete}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              View Final Results
            </button>
          )}
        </div>
      )}

      {!isHost && (
        <div className="text-center text-gray-600">
          <p>Waiting for host to continue...</p>
        </div>
      )}
    </div>
  );
} 