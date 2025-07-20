# RecallRush

A React + Supabase-powered multiplayer number memory game where players test their recall speed and accuracy in real-time rounds.

## Features

- **Multiplayer Rooms**: Create or join rooms with unique 6-character codes
- **Real-time Gameplay**: Live updates using Supabase Realtime
- **Memory Challenges**: Random number sequences with configurable difficulty
- **Host Controls**: Room management and game progression
- **Responsive Design**: Beautiful UI built with Tailwind CSS

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RecallRush
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations in the `supabase/migrations/` folder
   - Get your project URL and anon key from the Supabase dashboard

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## How to Play

1. **Enter your nickname** and click "Start Game"
2. **Create a room** or join an existing one using a room code
3. **Wait for players** to join and mark themselves ready
4. **Host starts the game** when all players are ready
5. **Memorize sequences** of numbers that appear on screen
6. **Recall the sequence** from memory when it disappears
7. **Compete for the highest score** across multiple rounds

## Start Round Functionality

The host can start new rounds using the "Start Round" button, which:

1. **Generates a random sequence** based on the selected difficulty:
   - Easy: 4 numbers
   - Medium: 6 numbers  
   - Hard: 8 numbers

2. **Stores the sequence** in Supabase under the `game_rounds` table

3. **Broadcasts to all players** using Supabase Realtime subscriptions

4. **Updates the game state** to show the sequence display component

## Game Flow

1. **Room Setup**: Players join and mark ready
2. **Game Start**: Host begins the game
3. **Round Start**: Host clicks "Start Round" to generate sequence
4. **Sequence Display**: Numbers are shown for 3 seconds
5. **Memory Phase**: Sequence is hidden, players recall from memory
6. **Scoring**: Players enter their recalled sequences (implementation pending)
7. **Next Round**: Repeat until all rounds are complete

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React icons
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **Real-time**: Supabase Realtime subscriptions

## Database Schema

- `game_rooms`: Room metadata and settings
- `room_players`: Player information and status
- `game_rounds`: Round data with number sequences

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build 