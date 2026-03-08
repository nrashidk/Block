export type BlockType = "normal" | "bomb" | "lightning" | "rainbow" | "freeze" | "multiplier" | "ghost";
export type ObstacleType = "stone" | "ice" | "virus" | null;
export type GameMode = "classic" | "survival" | "practice";

export interface Cell {
  filled: boolean;
  colorIndex: number;
  obstacleType: ObstacleType;
  obstacleHealth: number;
  frozen: boolean;
  frozenTurns: number;
}

export interface BlockShape {
  cells: boolean[][];
  colorIndex: number;
  type: BlockType;
}

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  count: number;
  description: string;
}

export interface PlayerStats {
  totalScore: number;
  highScore: number;
  gamesPlayed: number;
  totalClears: number;
  highestCombo: number;
  blocksPlaced: number;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  gems: number;
  loginStreak: number;
  lastLoginDate: string;
  dailyRewardsClaimed: boolean[];
  unlockedSkins: string[];
  unlockedThemes: string[];
  activeSkin: string;
  activeTheme: string;
  achievements: string[];
}

export interface GameState {
  grid: Cell[][];
  score: number;
  combo: number;
  maxCombo: number;
  comboMultiplier: number;
  currentPieces: (BlockShape | null)[];
  nextPieces: BlockShape[];
  gameOver: boolean;
  isPaused: boolean;
  mode: GameMode;
  survivalTimer: number;
  moveHistory: Cell[][][];
  powerUps: PowerUp[];
  scoreMultiplierActive: boolean;
  scoreMultiplierTimer: number;
  totalClears: number;
  blocksPlaced: number;
}

export const GRID_SIZE = 8;

export const BLOCK_SHAPES: boolean[][][] = [
  [[true]],
  [[true, true]],
  [[true], [true]],
  [[true, true, true]],
  [[true], [true], [true]],
  [[true, true], [true, true]],
  [[true, true, true], [true, false, false]],
  [[true, true, true], [false, false, true]],
  [[true, false], [true, false], [true, true]],
  [[false, true], [false, true], [true, true]],
  [[true, true], [true, false]],
  [[true, true], [false, true]],
  [[true, true, true], [false, true, false]],
  [[true, false, false], [true, true, true]],
  [[false, false, true], [true, true, true]],
  [[true, true, true, true]],
  [[true], [true], [true], [true]],
  [[true, true, true], [true, true, true]],
  [[true, true], [true, true], [true, true]],
];

export const SPECIAL_BLOCK_CHANCE = 0.12;
export const OBSTACLE_CHANCE = 0.05;

export const SKIN_SETS: { id: string; name: string; cost: number }[] = [
  { id: "default", name: "Classic", cost: 0 },
  { id: "neon", name: "Neon Glow", cost: 500 },
  { id: "pixel", name: "Pixel Art", cost: 750 },
  { id: "glass", name: "Glass", cost: 1000 },
  { id: "galaxy", name: "Galaxy", cost: 1500 },
  { id: "candy", name: "Candy", cost: 1000 },
  { id: "metal", name: "Metal", cost: 1250 },
  { id: "ocean", name: "Ocean", cost: 750 },
];

export const BOARD_THEMES: { id: string; name: string; cost: number }[] = [
  { id: "default", name: "Dark Space", cost: 0 },
  { id: "midnight", name: "Midnight", cost: 500 },
  { id: "cyber", name: "Cyberpunk", cost: 750 },
  { id: "forest", name: "Dark Forest", cost: 1000 },
  { id: "lava", name: "Lava", cost: 1250 },
  { id: "arctic", name: "Arctic", cost: 750 },
];

export function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

export function getDefaultStats(): PlayerStats {
  return {
    totalScore: 0,
    highScore: 0,
    gamesPlayed: 0,
    totalClears: 0,
    highestCombo: 0,
    blocksPlaced: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    coins: 200,
    gems: 10,
    loginStreak: 0,
    lastLoginDate: "",
    dailyRewardsClaimed: [false, false, false, false, false, false, false],
    unlockedSkins: ["default"],
    unlockedThemes: ["default"],
    activeSkin: "default",
    activeTheme: "default",
    achievements: [],
  };
}
