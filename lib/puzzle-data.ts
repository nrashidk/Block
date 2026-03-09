import { GRID_SIZE, Cell, BlockShape } from "./game-types";

export interface PuzzleData {
  id: number;
  chapter: number;
  levelNumber: number;
  gridSetup: { filled: boolean; colorIndex: number }[][];
  pieceSequence: { cells: number[][]; colorIndex: number; type: string }[];
  targetScore: number;
  movesLimit: number;
  difficulty: string;
  published: boolean;
}

export interface PuzzleProgress {
  puzzleId: number;
  stars: number;
  bestScore: number;
  completed: boolean;
}

export function convertPuzzleGrid(
  gridSetup: { filled: boolean; colorIndex: number }[][]
): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const setup = gridSetup[r]?.[c];
      row.push({
        filled: setup?.filled || false,
        colorIndex: setup?.colorIndex || 0,
        obstacleType: null,
        obstacleHealth: 0,
        frozen: false,
        frozenTurns: 0,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function convertPuzzlePiece(
  piece: { cells: number[][]; colorIndex: number; type: string }
): BlockShape {
  return {
    cells: piece.cells.map((row) => row.map((v) => v === 1)),
    colorIndex: piece.colorIndex,
    type: piece.type as any,
  };
}

export function calculateStars(
  score: number,
  targetScore: number
): number {
  if (score >= targetScore * 1.5) return 3;
  if (score >= targetScore) return 2;
  if (score > 0) return 1;
  return 0;
}

export const CHAPTER_NAMES = [
  "Foundations",
  "Rising Heat",
  "Inferno",
  "Neon Depths",
  "Molten Core",
  "Oblivion",
];
export const CHAPTER_COLORS = [
  "#00E5FF",
  "#FFD700",
  "#FF2D78",
  "#A855F7",
  "#FF6B35",
  "#EF4444",
];
