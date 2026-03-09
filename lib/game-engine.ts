import {
  Cell,
  BlockShape,
  GameState,
  GameMode,
  GRID_SIZE,
  BLOCK_SHAPES,
  SPECIAL_BLOCK_CHANCE,
  PowerUp,
} from "./game-types";

export function createEmptyGrid(): Cell[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      filled: false,
      colorIndex: 0,
      obstacleType: null,
      obstacleHealth: 0,
      frozen: false,
      frozenTurns: 0,
    }))
  );
}

export function generateRandomPiece(): BlockShape {
  const shapeIndex = Math.floor(Math.random() * BLOCK_SHAPES.length);
  const colorIndex = Math.floor(Math.random() * 8);
  const rand = Math.random();

  let type: BlockShape["type"] = "normal";
  if (rand < SPECIAL_BLOCK_CHANCE) {
    const specials: BlockShape["type"][] = [
      "bomb",
      "lightning",
      "rainbow",
      "freeze",
      "multiplier",
      "ghost",
    ];
    type = specials[Math.floor(Math.random() * specials.length)];
  }

  return {
    cells: BLOCK_SHAPES[shapeIndex],
    colorIndex,
    type,
  };
}

export function createInitialGameState(mode: GameMode): GameState {
  const pieces = [generateRandomPiece(), generateRandomPiece(), generateRandomPiece()];
  const nextPieces = [generateRandomPiece(), generateRandomPiece(), generateRandomPiece()];

  const defaultPowerUps: PowerUp[] = [
    { id: "undo", name: "Undo", icon: "arrow-undo", count: mode === "practice" ? 99 : 3, description: "Reverse last move" },
    { id: "shuffle", name: "Shuffle", icon: "refresh", count: mode === "practice" ? 99 : 2, description: "Get new blocks" },
    { id: "hint", name: "Hint", icon: "bulb", count: mode === "practice" ? 99 : 3, description: "Show best placement" },
    { id: "swap", name: "Swap", icon: "swap-horizontal", count: mode === "practice" ? 99 : 2, description: "Swap a block" },
  ];

  return {
    grid: createEmptyGrid(),
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboMultiplier: 1,
    currentPieces: pieces,
    nextPieces,
    gameOver: false,
    isPaused: false,
    mode,
    moveHistory: [],
    powerUps: defaultPowerUps,
    totalClears: 0,
    blocksPlaced: 0,
  };
}

export function canPlacePiece(
  grid: Cell[][],
  piece: BlockShape,
  row: number,
  col: number
): boolean {
  for (let r = 0; r < piece.cells.length; r++) {
    for (let c = 0; c < piece.cells[r].length; c++) {
      if (piece.cells[r][c]) {
        const gr = row + r;
        const gc = col + c;
        if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
        if (piece.type === "ghost") continue;
        if (grid[gr][gc].filled) return false;
      }
    }
  }
  return true;
}

export function findBestPlacement(
  grid: Cell[][],
  piece: BlockShape
): { row: number; col: number } | null {
  let bestScore = -1;
  let bestPos: { row: number; col: number } | null = null;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlacePiece(grid, piece, r, c)) {
        const testGrid = cloneGrid(grid);
        placePieceOnGrid(testGrid, piece, r, c);
        const { clearedRows, clearedCols } = findClears(testGrid);
        const score = clearedRows.length + clearedCols.length;
        if (score > bestScore) {
          bestScore = score;
          bestPos = { row: r, col: c };
        }
      }
    }
  }
  return bestPos;
}

export function placePieceOnGrid(
  grid: Cell[][],
  piece: BlockShape,
  row: number,
  col: number
): void {
  for (let r = 0; r < piece.cells.length; r++) {
    for (let c = 0; c < piece.cells[r].length; c++) {
      if (piece.cells[r][c]) {
        const gr = row + r;
        const gc = col + c;
        if (gr >= 0 && gr < GRID_SIZE && gc >= 0 && gc < GRID_SIZE) {
          if (piece.type === "ghost" && grid[gr][gc].filled) continue;
          grid[gr][gc] = {
            filled: true,
            colorIndex: piece.colorIndex,
            obstacleType: null,
            obstacleHealth: 0,
            frozen: piece.type === "freeze",
            frozenTurns: piece.type === "freeze" ? 3 : 0,
          };
        }
      }
    }
  }
}

export function handleSpecialBlock(
  grid: Cell[][],
  piece: BlockShape,
  row: number,
  col: number
): { bonusScore: number; clearedCells: { row: number; col: number }[] } {
  let bonusScore = 0;
  const clearedCells: { row: number; col: number }[] = [];

  switch (piece.type) {
    case "bomb": {
      // Bomb pieces are 1x1, so the piece position (row, col) is the centroid
      // Explosion affects a 3x3 area centered on this position
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c].filled) {
            clearCell(grid, r, c);
            clearedCells.push({ row: r, col: c });
            bonusScore += 10;
          }
        }
      }
      break;
    }
    case "lightning": {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[row][c].filled) {
          clearCell(grid, row, c);
          clearedCells.push({ row, col: c });
          bonusScore += 10;
        }
      }
      for (let r = 0; r < GRID_SIZE; r++) {
        if (r !== row && grid[r][col].filled) {
          clearCell(grid, r, col);
          clearedCells.push({ row: r, col });
          bonusScore += 10;
        }
      }
      break;
    }
    default:
      break;
  }

  return { bonusScore, clearedCells };
}

function clearCell(grid: Cell[][], row: number, col: number): void {
  const cell = grid[row][col];
  if ((cell.obstacleType === "stone" || cell.obstacleType === "ice") && cell.obstacleHealth > 1) {
    cell.obstacleHealth--;
    return;
  }
  grid[row][col] = {
    filled: false,
    colorIndex: 0,
    obstacleType: null,
    obstacleHealth: 0,
    frozen: false,
    frozenTurns: 0,
  };
}

export function findClears(grid: Cell[][]): {
  clearedRows: number[];
  clearedCols: number[];
} {
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((cell) => cell.filled)) {
      clearedRows.push(r);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!grid[r][c].filled) {
        full = false;
        break;
      }
    }
    if (full) clearedCols.push(c);
  }

  return { clearedRows, clearedCols };
}

export function performClears(
  grid: Cell[][],
  clearedRows: number[],
  clearedCols: number[]
): number {
  let score = 0;

  for (const r of clearedRows) {
    for (let c = 0; c < GRID_SIZE; c++) {
      clearCell(grid, r, c);
    }
    score += GRID_SIZE * 10;
  }

  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c].filled) {
        clearCell(grid, r, c);
      }
    }
    score += GRID_SIZE * 10;
  }

  return score;
}

export function canAnyPieceFit(grid: Cell[][], pieces: (BlockShape | null)[]): boolean {
  for (const piece of pieces) {
    if (!piece) continue;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlacePiece(grid, piece, r, c)) return true;
      }
    }
  }
  return false;
}

export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function updateFrozenCells(grid: Cell[][]): void {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].frozen) {
        grid[r][c].frozenTurns--;
        if (grid[r][c].frozenTurns <= 0) {
          grid[r][c].frozen = false;
        }
      }
    }
  }
}

export function spreadVirus(grid: Cell[][]): void {
  const virusCells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].obstacleType === "virus") {
        virusCells.push({ row: r, col: c });
      }
    }
  }

  for (const { row, col } of virusCells) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    if (Math.random() < 0.3) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const nr = row + dir[0];
      const nc = col + dir[1];
      if (
        nr >= 0 && nr < GRID_SIZE &&
        nc >= 0 && nc < GRID_SIZE &&
        !grid[nr][nc].filled
      ) {
        grid[nr][nc] = {
          filled: true,
          colorIndex: 7,
          obstacleType: "virus",
          obstacleHealth: 1,
          frozen: false,
          frozenTurns: 0,
        };
      }
    }
  }
}

export function addSurvivalBlocks(grid: Cell[][]): number {
  let added = 0;
  const emptyCells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c].filled) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  const toAdd = Math.min(2, emptyCells.length);
  for (let i = 0; i < toAdd; i++) {
    const idx = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[idx];
    emptyCells.splice(idx, 1);
    grid[row][col] = {
      filled: true,
      colorIndex: Math.floor(Math.random() * 8),
      obstacleType: null,
      obstacleHealth: 0,
      frozen: false,
      frozenTurns: 0,
    };
    added++;
  }
  return added;
}
