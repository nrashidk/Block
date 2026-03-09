# Block Blast+ Mobile Game

## Overview
An enhanced Block Blast-style mobile puzzle game built with Expo (React Native) featuring special blocks, power-ups, rewards, leaderboards, multiple game modes, 1v1 ranked multiplayer, target puzzles, battle pass, and IAP.

## Architecture
- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js (port 5000) with PostgreSQL/Drizzle ORM, WebSocket (ws)
- **State Management**: React Context (GameProvider, AuthProvider, MultiplayerProvider) + AsyncStorage for persistence
- **Auth**: Guest auto-login, Google Sign-In, Apple Sign-In, username/password fallback (bcryptjs + express-session + connect-pg-simple)
- **Styling**: React Native StyleSheet with custom dark neon theme

## Key Files
- `lib/game-types.ts` - Type definitions, constants, block shapes, skin/theme data
- `lib/game-engine.ts` - Core game logic (grid operations, clears, special blocks, piece generation)
- `lib/game-context.tsx` - React context provider with all game state and actions
- `lib/auth-context.tsx` - Auth context (login/register/logout/user state)
- `lib/multiplayer-context.tsx` - WebSocket multiplayer context (queue, match, scores)
- `lib/puzzle-data.ts` - Puzzle type definitions and grid conversion utilities
- `lib/purchases.ts` - IAP product definitions and purchase flow
- `lib/ad-manager.ts` - Rewarded ad placeholder system
- `constants/colors.ts` - Dark neon color theme
- `app/index.tsx` - Home screen with mode selection, feature cards
- `app/game.tsx` - Main game screen with drag-and-drop gameplay
- `app/auth.tsx` - Login/register screen
- `app/multiplayer.tsx` - Ranked match lobby with Elo/league display
- `app/match.tsx` - 1v1 match gameplay screen
- `app/targets.tsx` - Target mode chapter/level selection
- `app/puzzle.tsx` - Target puzzle gameplay with moves limit
- `app/battlepass.tsx` - Battle pass tier viewer and claim UI
- `app/shop.tsx` - Store (IAP), block skins, board themes
- `app/admin.tsx` - Admin panel for puzzle visibility management (publish/hide chapters/levels, reseed)
- `app/stats.tsx` - Player statistics and progression
- `app/daily.tsx` - Daily login rewards
- `components/DraggablePiece.tsx` - Drag-and-drop piece with PanResponder
- `components/GameGrid.tsx` - 8x8 game grid rendering with cell animations
- `components/BlockPiece.tsx` - Visual piece preview renderer
- `components/ScoreDisplay.tsx` - Score, level, combo display
- `components/PowerUpBar.tsx` - Power-up action buttons
- `components/GameOverModal.tsx` - End-of-game modal
- `server/routes.ts` - All API routes (auth, puzzles, battle pass, purchases, leaderboard)
- `server/auth.ts` - Auth logic (register, login, Elo calculation)
- `server/multiplayer.ts` - WebSocket server, matchmaking queue, match lifecycle
- `server/puzzle-generator.ts` - Seeded puzzle/piece generation for target mode and daily puzzles
- `server/battle-pass.ts` - Battle pass season, tier, and reward management
- `shared/schema.ts` - Drizzle ORM schema (users, matches, puzzles, battle pass, purchases)

## Game Features
- **3 Solo Game Modes**: Classic, Survival (grid fills over time), Practice (unlimited undos)
- **1v1 Ranked Multiplayer**: WebSocket matchmaking, Elo rating, league system (Bronze/Silver/Gold/Diamond), bot opponents when no real player available, winner gets coins + random power-up
- **Target Mode**: 90 puzzles across 6 chapters (15 each) with star ratings, admin publish/hide
- **Daily Puzzle**: Server-generated daily puzzle with leaderboard
- **Battle Pass**: 30 tiers, free + premium rewards, XP progression, seasonal
- **6 Special Blocks**: Bomb, Lightning, Rainbow, Freeze, Multiplier, Ghost
- **3 Obstacle Blocks**: Stone, Ice, Virus
- **4 Power-ups**: Undo, Shuffle, Hint, Block Swap
- **IAP Store**: Coin bundles, gem packs, VIP subscription
- **Rewarded Ads**: Placeholder system ready for real ad SDK
- **Progression**: XP leveling, coin/gem economy
- **Customization**: 8 block skins, 6 board themes
- **Daily Rewards**: 7-day streak calendar
- **Stats Dashboard**: High scores, combos, total clears

## Database Tables
users, matches, battle_pass, battle_pass_tiers, player_battle_pass, target_puzzles, daily_puzzles, player_puzzle_progress, daily_puzzle_scores, purchases

## Technical Notes
- Grid measurement uses `measureInWindow` via forwardRef on gridBorder element
- DraggablePiece uses refs for all props/callbacks to prevent stale closure bugs in PanResponder
- DRAG_LIFT_OFFSET = -70 lifts the piece above the finger during drag
- CELL_SIZE is computed statically at module load (mobile-first, no web resize support); exported from GameGrid
- Web platform insets: shared constants WEB_TOP_PADDING/WEB_BOTTOM_PADDING in constants/colors.ts
- Multiplayer uses seeded random for deterministic piece sequences
- WebSocket auth uses session cookie validation (not client-supplied userId)
- Purchase endpoint validates product IDs against whitelist, requires receipt (duplicate receipt rejected), rate-limited to 5/minute per user
- Classic/survival/practice game completion persisted via POST /api/game/complete (server computes capped XP/coins from score, 30s cooldown per user)
- Battle pass XP awarded internally only (no public endpoint) — from match results, puzzle completions, and game completions
- SESSION_SECRET validated at server startup (throws if missing)
- Piece shapes unified: server/puzzle-generator.ts imports BLOCK_SHAPES from lib/game-types.ts
- ELO rating has floor of 100 (cannot go below)
- Target puzzles have unique constraint on (chapter, levelNumber) — race-safe seeding with onConflictDoNothing
- 6 puzzle chapters: Foundations, Rising Heat, Inferno, Neon Depths, Molten Core, Oblivion — first 3 published by default
- Admin routes (`/api/admin/*`) protected by requireAdmin middleware (checks users.is_admin)
- First user can self-promote to admin via POST /api/admin/promote-self (only if no admin exists)
- targets.tsx uses useFocusEffect to reload progress on screen focus (fixes level unlock after completing a puzzle)
- sendMessage in multiplayer.ts uses Record<string, unknown> instead of any

## Tech Stack
- Expo SDK 54 with Expo Router
- React Native PanResponder for drag-and-drop
- React Native Reanimated for animations
- expo-haptics for tactile feedback
- expo-linear-gradient for visual effects
- AsyncStorage for local persistence
- Express.js + PostgreSQL + Drizzle ORM (backend)
- ws (WebSocket) for multiplayer
- bcryptjs + express-session for auth
