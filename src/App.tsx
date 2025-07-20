import React from 'react';
import { Gamepad2, User } from 'lucide-react';
import RoomSetup from './components/RoomSetup';
import GameRoom from './components/GameRoom';

function App() {
  const [nickname, setNickname] = React.useState<string>('');
  const [showGame, setShowGame] = React.useState<boolean>(false);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [roomCode, setRoomCode] = React.useState<string | null>(null);
  const [isHost, setIsHost] = React.useState<boolean>(false);

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setNickname(inputValue.trim());
      setShowGame(true);
    }
  };

  const handleRoomReady = (code: string, host: boolean) => {
    setRoomCode(code);
    setIsHost(host);
  };

  const handleStartGame = () => {
    // This will be handled by the GameRoom component
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
    setIsHost(false);
  };

  // Show nickname prompt if no nickname is set
  if (!showGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Gamepad2 className="w-10 h-10 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">RecallRush</h1>
            </div>
            <p className="text-gray-600">Welcome! Enter your nickname to start playing.</p>
          </div>
          
          <form onSubmit={handleNicknameSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                maxLength={20}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Title Banner */}
      <header className="bg-white shadow-md border-b-2 border-indigo-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Gamepad2 className="w-8 h-8 text-indigo-600" />
              <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
                RecallRush
              </h1>
            </div>
            <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
              <span className="text-indigo-800 font-medium">{nickname}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Game Content */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {!roomCode ? (
          <RoomSetup 
            nickname={nickname} 
            onRoomReady={handleRoomReady} 
          />
        ) : (
          <GameRoom
            nickname={nickname}
            roomCode={roomCode}
            isHost={isHost}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>
    </div>
  );
}

export default App;
