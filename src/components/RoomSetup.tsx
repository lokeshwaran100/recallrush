import React from 'react';
import { Users, Plus, LogIn, Copy, Check } from 'lucide-react';
import { useSupabaseRoom } from '../hooks/useSupabaseRoom';

interface RoomSetupProps {
  nickname: string;
  onRoomReady: (roomCode: string, isHost: boolean) => void;
}

export default function RoomSetup({ nickname, onRoomReady }: RoomSetupProps) {
  const [mode, setMode] = React.useState<'select' | 'create' | 'join'>('select');
  const [joinCode, setJoinCode] = React.useState<string>('');
  const [copied, setCopied] = React.useState<boolean>(false);
  const [createdRoomCode, setCreatedRoomCode] = React.useState<string>('');

  const { createRoom, joinRoom, loading, error } = useSupabaseRoom(null, nickname);

  const handleCreateRoom = async () => {
    try {
      const newRoomCode = await createRoom();
      setCreatedRoomCode(newRoomCode);
      setMode('create');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const success = await joinRoom(joinCode.trim().toUpperCase());
      
      if (success) {
        onRoomReady(joinCode.trim().toUpperCase(), false);
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.error('Failed to copy room code');
    }
  };

  const startGame = () => {
    onRoomReady(createdRoomCode, true);
  };

  // Room selection screen
  if (mode === 'select') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
          <div className="text-center mb-6">
            <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Room Setup</h2>
            <p className="text-gray-600">Create a new room or join an existing one</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create Room'}</span>
            </button>

            <button
              onClick={() => setMode('join')}
              disabled={loading}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>Join Room</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Room created - waiting for players
  if (mode === 'create') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Room Created!</h2>
            <p className="text-gray-600">Share this code with other players</p>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-500 mb-1">Room Code</p>
                  <p className="text-3xl font-bold text-gray-800 tracking-wider">{createdRoomCode}</p>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="ml-4 p-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-indigo-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={startGame}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Start Game
            </button>
            
            <button
              onClick={() => {
                setMode('select');
                setCreatedRoomCode('');
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Back
            </button>
          </div>

          {copied && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm text-center">Room code copied to clipboard!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Join room screen
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
        <div className="text-center mb-6">
          <LogIn className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Room</h2>
          <p className="text-gray-600">Enter the room code to join the game</p>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-center text-lg font-mono tracking-wider"
              maxLength={6}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!joinCode.trim() || loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('select');
                setJoinCode('');
              }}
              disabled={loading}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}