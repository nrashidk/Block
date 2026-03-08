import { GRID_SIZE } from "../lib/game-types";

export function createSeededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function () {
    h = (Math.imul(h ^ (h >>> 16), 2246822507) ^ 0) | 0;
    h = (Math.imul(h ^ (h >>> 13), 3266489909) ^ 0) | 0;
    h = (h ^ (h >>> 16)) | 0;
    return (h >>> 0) / 4294967296;
  };
}

const PIECE_SHAPES = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [
    [1, 1],
    [1, 0],
  ],
  [
    [1, 1],
    [0, 1],
  ],
  [
    [0, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [1, 1],
    [1, 0],
    [1, 0],
  ],
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],
  [
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
];

export function generateSeededPiece(rng: () => number) {
  const shapeIdx = Math.floor(rng() * PIECE_SHAPES.length);
  const colorIdx = Math.floor(rng() * 7);
  const typeRoll = rng();
  let type = "normal";
  if (typeRoll < 0.02) type = "bomb";
  else if (typeRoll < 0.04) type = "lightning";
  else if (typeRoll < 0.06) type = "rainbow";
  else if (typeRoll < 0.08) type = "freeze";
  else if (typeRoll < 0.10) type = "multiplier";
  else if (typeRoll < 0.12) type = "ghost";

  return {
    cells: PIECE_SHAPES[shapeIdx],
    colorIndex: colorIdx,
    type,
  };
}

export function generateDailyPuzzle(dateStr: string) {
  const rng = createSeededRandom("daily_" + dateStr);

  const grid: { filled: boolean; colorIndex: number }[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const fill = rng() < 0.25;
      row.push({
        filled: fill,
        colorIndex: Math.floor(rng() * 7),
      });
    }
    grid.push(row);
  }

  const pieces = [];
  for (let i = 0; i < 20; i++) {
    pieces.push(generateSeededPiece(rng));
  }

  return {
    gridSetup: grid,
    pieceSequence: pieces,
    targetScore: 200 + Math.floor(rng() * 300),
  };
}

export function generateTargetPuzzles() {
  const puzzles = [];
  const chapters = [
    { difficulty: "easy", fillRate: 0.15, moves: 8, baseScore: 100 },
    { difficulty: "medium", fillRate: 0.3, moves: 6, baseScore: 250 },
    { difficulty: "hard", fillRate: 0.45, moves: 5, baseScore: 400 },
  ];

  for (let ch = 0; ch < chapters.length; ch++) {
    const config = chapters[ch];
    for (let lvl = 1; lvl <= 10; lvl++) {
      const seed = `target_ch${ch + 1}_lvl${lvl}`;
      const rng = createSeededRandom(seed);

      const grid: { filled: boolean; colorIndex: number }[][] = [];
      const adjustedFill = config.fillRate + (lvl - 1) * 0.02;
      for (let r = 0; r < GRID_SIZE; r++) {
        const row = [];
        for (let c = 0; c < GRID_SIZE; c++) {
          const fill = rng() < adjustedFill;
          row.push({
            filled: fill,
            colorIndex: Math.floor(rng() * 7),
          });
        }
        grid.push(row);
      }

      const pieces = [];
      const movesLimit = Math.max(3, config.moves - Math.floor(lvl / 4));
      for (let i = 0; i < movesLimit + 5; i++) {
        pieces.push(generateSeededPiece(rng));
      }

      puzzles.push({
        chapter: ch + 1,
        levelNumber: lvl,
        gridSetup: grid,
        pieceSequence: pieces,
        targetScore: config.baseScore + lvl * 30,
        movesLimit,
        difficulty: config.difficulty,
      });
    }
  }
  return puzzles;
}
