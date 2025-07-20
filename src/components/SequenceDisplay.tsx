import React from 'react';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SequenceDisplayProps {
  sequence: number[];
  roundNumber: number;
  timePerRound: number;
  onSequenceHidden: () => void;
  onRoundComplete: () => void;
  roundId: string;
  nickname: string;
}

export default function SequenceDisplay({ 
  sequence, 
  roundNumber, 
  timePerRound, 
  onSequenceHidden,
  onRoundComplete,
  roundId,
  nickname
}: SequenceDisplayProps) {
  const [showSequence, setShowSequence] = React.useState(true);
  const [hideCountdown, setHideCountdown] = React.useState(3);
  const [answer, setAnswer] = React.useState('');
  const [answerTimer, setAnswerTimer] = React.useState(timePerRound);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [startTime, setStartTime] = React.useState<number | null>(null);

  // Show sequence for 3 seconds
  React.useEffect(() => {
    setShowSequence(true);
    setHideCountdown(3);
    setAnswer('');
    setAnswerTimer(timePerRound);
    setSubmitted(false);
    setSubmitError(null);
    // Countdown to hide sequence
    const countdownInterval = setInterval(() => {
      setHideCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowSequence(false);
          onSequenceHidden();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [sequence, roundId]); // Remove onSequenceHidden and timePerRound from dependencies

  // Start answer timer when sequence is hidden
  React.useEffect(() => {
    if (showSequence || submitted) return;
    setAnswerTimer(timePerRound);
    setStartTime(Date.now());
    const timer = setInterval(() => {
      setAnswerTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          onRoundComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showSequence, submitted]); // Remove timePerRound from dependencies

  // Submit answer to Supabase
  const handleSubmit = async () => {
    if (submitted || !roundId) return;
    setSubmitted(true);
    setSubmitError(null);
    try {
      const answerArr = answer
        .split(',')
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n));
      
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
      
      await supabase.from('round_answers').insert({
        round_id: roundId,
        nickname,
        answer: answerArr,
        submitted_at: new Date().toISOString(),
        time_taken: timeTaken,
      });
    } catch (err) {
      setSubmitError('Failed to submit answer.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Round {roundNumber}
        </h3>
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          {showSequence ? (
            <>
              <Eye className="w-5 h-5" />
              <span>Memorize this sequence!</span>
            </>
          ) : (
            <>
              <EyeOff className="w-5 h-5" />
              <span>Sequence hidden - recall from memory</span>
            </>
          )}
        </div>
      </div>

      {showSequence ? (
        <div className="space-y-6">
          {/* Countdown Timer */}
          <div className="flex items-center justify-center space-x-2 text-lg font-semibold text-indigo-600">
            <Clock className="w-5 h-5" />
            <span>Hiding in {hideCountdown} second{hideCountdown !== 1 ? 's' : ''}...</span>
          </div>

          {/* Sequence Display */}
          <div className="flex justify-center">
            <div className="grid grid-cols-4 gap-3 max-w-md">
              {sequence.map((number, index) => (
                <div
                  key={index}
                  className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg transform transition-transform hover:scale-105"
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  {number}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm">
              You have {timePerRound} seconds total for this round
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <EyeOff className="w-10 h-10 text-gray-400" />
          </div>
          <h4 className="text-xl font-semibold text-gray-700 mb-2">
            Now it's your turn!
          </h4>
          <p className="text-gray-500 mb-4">
            Enter the sequence you just saw in the correct order
          </p>
          <div className="text-sm text-gray-400 mb-4">
            Sequence length: {sequence.length} numbers
          </div>
          {!submitted ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex flex-col items-center"
            >
              <div className="mb-2">
                <span className="text-indigo-700 font-semibold">Time left: {answerTimer}s</span>
              </div>
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Enter the sequence (e.g. 1,2,3,4)"
                className="mb-2 px-4 py-2 border rounded text-center"
                disabled={submitted}
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                disabled={submitted}
              >
                Submit
              </button>
              {submitError && <div className="text-red-600 mt-2">{submitError}</div>}
            </form>
          ) : (
            <div className="text-green-600 text-center mt-4">
              Answer submitted!
            </div>
          )}
        </div>
      )}
    </div>
  );
}