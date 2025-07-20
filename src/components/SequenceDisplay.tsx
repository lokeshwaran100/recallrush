import React from 'react';
import { Eye, EyeOff, Clock } from 'lucide-react';

interface SequenceDisplayProps {
  sequence: number[];
  roundNumber: number;
  timePerRound: number;
  onSequenceHidden: () => void;
}

export default function SequenceDisplay({ 
  sequence, 
  roundNumber, 
  timePerRound, 
  onSequenceHidden 
}: SequenceDisplayProps) {
  const [showSequence, setShowSequence] = React.useState(true);
  const [timeLeft, setTimeLeft] = React.useState(3);

  React.useEffect(() => {
    // Reset state when new sequence arrives
    setShowSequence(true);
    setTimeLeft(3);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
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
  }, [sequence, onSequenceHidden]);

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
            <span>Hiding in {timeLeft} second{timeLeft !== 1 ? 's' : ''}...</span>
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
          <div className="text-sm text-gray-400">
            Sequence length: {sequence.length} numbers
          </div>
        </div>
      )}
    </div>
  );
}