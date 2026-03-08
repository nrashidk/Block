import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GameState,
  GameMode,
  PlayerStats,
  BlockShape,
  getDefaultStats,
  getXpForLevel,
  GRID_SIZE,
} from "./game-types";
import {
  createInitialGameState,
  canPlacePiece,
  placePieceOnGrid,
  handleSpecialBlock,
  findClears,
  performClears,
  canAnyPieceFit,
  cloneGrid,
  generateRandomPiece,
  updateFrozenCells,
  spreadVirus,
  addSurvivalBlocks,
  findBestPlacement,
} from "./game-engine";

interface GameContextValue {
  gameState: GameState;
  stats: PlayerStats;
  startGame: (mode: GameMode) => void;
  placePiece: (pieceIndex: number, row: number, col: number) => boolean;
  activatePowerUp: (powerUpId: string, pieceIndex?: number) => void;
  togglePause: () => void;
  canPlace: (pieceIndex: number, row: number, col: number) => boolean;
  getHintPosition: (pieceIndex: number) => { row: number; col: number } | null;
  lastClearedRows: number[];
  lastClearedCols: number[];
  lastSpecialCells: { row: number; col: number }[];
  comboJustIncreased: boolean;
  updateSkin: (skinId: string) => void;
  updateTheme: (themeId: string) => void;
  purchaseSkin: (skinId: string, cost: number) => boolean;
  purchaseTheme: (themeId: string, cost: number) => boolean;
  claimDailyReward: (day: number) => void;
  checkDailyLogin: () => void;
  addPowerUp: (powerUpId: string, count: number) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const STATS_KEY = "@blockblast_stats";

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(
    createInitialGameState("classic")
  );
  const [stats, setStats] = useState<PlayerStats>(getDefaultStats());
  const [lastClearedRows, setLastClearedRows] = useState<number[]>([]);
  const [lastClearedCols, setLastClearedCols] = useState<number[]>([]);
  const [lastSpecialCells, setLastSpecialCells] = useState<
    { row: number; col: number }[]
  >([]);
  const [comboJustIncreased, setComboJustIncreased] = useState(false);

  useEffect(() => {
    if (lastClearedRows.length > 0 || lastClearedCols.length > 0) {
      const timer = setTimeout(() => {
        setLastClearedRows([]);
        setLastClearedCols([]);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [lastClearedRows, lastClearedCols]);

  useEffect(() => {
    if (comboJustIncreased) {
      const timer = setTimeout(() => setComboJustIncreased(false), 600);
      return () => clearTimeout(timer);
    }
  }, [comboJustIncreased]);

  useEffect(() => {
    if (lastSpecialCells.length > 0) {
      const timer = setTimeout(() => setLastSpecialCells([]), 400);
      return () => clearTimeout(timer);
    }
  }, [lastSpecialCells]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const saved = await AsyncStorage.getItem(STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStats({ ...getDefaultStats(), ...parsed });
      }
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const saveStats = async (newStats: PlayerStats) => {
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    } catch (e) {
      console.error("Failed to save stats:", e);
    }
  };

  const addXp = useCallback(
    (amount: number, currentStats: PlayerStats): PlayerStats => {
      let newStats = { ...currentStats };
      newStats.xp += amount;
      while (newStats.xp >= newStats.xpToNext) {
        newStats.xp -= newStats.xpToNext;
        newStats.level++;
        newStats.xpToNext = getXpForLevel(newStats.level);
        newStats.coins += 50 + newStats.level * 10;
      }
      return newStats;
    },
    []
  );

  const startGame = useCallback((mode: GameMode) => {
    setGameState(createInitialGameState(mode));
    setLastClearedRows([]);
    setLastClearedCols([]);
    setLastSpecialCells([]);
    setComboJustIncreased(false);
  }, []);

  const canPlace = useCallback(
    (pieceIndex: number, row: number, col: number): boolean => {
      const piece = gameState.currentPieces[pieceIndex];
      if (!piece) return false;
      return canPlacePiece(gameState.grid, piece, row, col);
    },
    [gameState.grid, gameState.currentPieces]
  );

  const getHintPosition = useCallback(
    (pieceIndex: number): { row: number; col: number } | null => {
      const piece = gameState.currentPieces[pieceIndex];
      if (!piece) return null;
      return findBestPlacement(gameState.grid, piece);
    },
    [gameState.grid, gameState.currentPieces]
  );

  const placePiece = useCallback(
    (pieceIndex: number, row: number, col: number): boolean => {
      const piece = gameState.currentPieces[pieceIndex];
      if (!piece || gameState.gameOver) return false;
      if (!canPlacePiece(gameState.grid, piece, row, col)) return false;

      setGameState((prev) => {
        const newGrid = cloneGrid(prev.grid);
        const moveHistory =
          prev.mode === "practice"
            ? [...prev.moveHistory, cloneGrid(prev.grid)]
            : prev.moveHistory.slice(-5).concat([cloneGrid(prev.grid)]);

        placePieceOnGrid(newGrid, piece, row, col);

        let totalScore = 0;
        let specialCells: { row: number; col: number }[] = [];

        if (piece.type !== "normal") {
          const { bonusScore, clearedCells } = handleSpecialBlock(
            newGrid,
            piece,
            row,
            col
          );
          totalScore += bonusScore;
          specialCells = clearedCells;
        }

        const { clearedRows, clearedCols } = findClears(newGrid);
        const clearScore = performClears(newGrid, clearedRows, clearedCols);
        totalScore += clearScore;

        const linesCleared = clearedRows.length + clearedCols.length;
        let newCombo = linesCleared > 0 ? prev.combo + 1 : 0;
        let comboMultiplier = Math.min(1 + newCombo * 0.5, 5);

        if (piece.type === "multiplier") {
          comboMultiplier *= 2;
        }

        totalScore = Math.floor(totalScore * comboMultiplier);
        totalScore += piece.cells.flat().filter(Boolean).length * 5;

        const newScore = prev.score + totalScore;

        setLastClearedRows(clearedRows);
        setLastClearedCols(clearedCols);
        setLastSpecialCells(specialCells);
        if (newCombo > prev.combo && newCombo > 1) {
          setComboJustIncreased(true);
        }

        updateFrozenCells(newGrid);
        spreadVirus(newGrid);

        if (prev.mode === "survival" && prev.blocksPlaced % 3 === 2) {
          addSurvivalBlocks(newGrid);
        }

        const newPieces = [...prev.currentPieces] as (BlockShape | null)[];
        newPieces[pieceIndex] = null;

        const allUsed = newPieces.every((p) => p === null);
        let nextPieces = prev.nextPieces;

        if (allUsed) {
          for (let i = 0; i < 3; i++) {
            newPieces[i] = nextPieces[i] ?? generateRandomPiece();
          }
          nextPieces = [
            generateRandomPiece(),
            generateRandomPiece(),
            generateRandomPiece(),
          ];
        }

        const isGameOver = !canAnyPieceFit(newGrid, newPieces);

        if (isGameOver) {
          setStats((prevStats) => {
            const updatedStats = addXp(Math.floor(newScore / 10), {
              ...prevStats,
              totalScore: prevStats.totalScore + newScore,
              highScore: Math.max(prevStats.highScore, newScore),
              gamesPlayed: prevStats.gamesPlayed + 1,
              totalClears:
                prevStats.totalClears + prev.totalClears + linesCleared,
              highestCombo: Math.max(
                prevStats.highestCombo,
                Math.max(newCombo, prev.maxCombo)
              ),
              blocksPlaced: prevStats.blocksPlaced + prev.blocksPlaced + 1,
              coins: prevStats.coins + Math.floor(newScore / 20),
            });
            saveStats(updatedStats);
            return updatedStats;
          });
        }

        return {
          ...prev,
          grid: newGrid,
          score: newScore,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          comboMultiplier,
          currentPieces: newPieces,
          nextPieces,
          gameOver: isGameOver,
          moveHistory,
          totalClears: prev.totalClears + linesCleared,
          blocksPlaced: prev.blocksPlaced + 1,
        };
      });

      return true;
    },
    [gameState, addXp]
  );

  const activatePowerUp = useCallback(
    (powerUpId: string, pieceIndex?: number) => {
      setGameState((prev) => {
        const powerUp = prev.powerUps.find((p) => p.id === powerUpId);
        if (!powerUp || powerUp.count <= 0) return prev;

        const newPowerUps = prev.powerUps.map((p) =>
          p.id === powerUpId ? { ...p, count: p.count - 1 } : p
        );

        switch (powerUpId) {
          case "undo": {
            if (prev.moveHistory.length === 0) return prev;
            const lastGrid = prev.moveHistory[prev.moveHistory.length - 1];
            return {
              ...prev,
              grid: lastGrid,
              moveHistory: prev.moveHistory.slice(0, -1),
              powerUps: newPowerUps,
            };
          }
          case "shuffle": {
            const newPieces = prev.currentPieces.map((p) =>
              p ? generateRandomPiece() : null
            );
            return {
              ...prev,
              currentPieces: newPieces,
              powerUps: newPowerUps,
            };
          }
          case "swap": {
            if (pieceIndex !== undefined && pieceIndex >= 0 && pieceIndex < 3) {
              const newPieces = [...prev.currentPieces] as (BlockShape | null)[];
              newPieces[pieceIndex] = generateRandomPiece();
              return {
                ...prev,
                currentPieces: newPieces,
                powerUps: newPowerUps,
              };
            }
            return prev;
          }
          default:
            return { ...prev, powerUps: newPowerUps };
        }
      });
    },
    []
  );

  const togglePause = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const updateSkin = useCallback(
    (skinId: string) => {
      setStats((prev) => {
        const newStats = { ...prev, activeSkin: skinId };
        saveStats(newStats);
        return newStats;
      });
    },
    []
  );

  const updateTheme = useCallback(
    (themeId: string) => {
      setStats((prev) => {
        const newStats = { ...prev, activeTheme: themeId };
        saveStats(newStats);
        return newStats;
      });
    },
    []
  );

  const purchaseSkin = useCallback(
    (skinId: string, cost: number): boolean => {
      if (stats.coins < cost) return false;
      setStats((prev) => {
        const newStats = {
          ...prev,
          coins: prev.coins - cost,
          unlockedSkins: [...prev.unlockedSkins, skinId],
          activeSkin: skinId,
        };
        saveStats(newStats);
        return newStats;
      });
      return true;
    },
    [stats.coins]
  );

  const purchaseTheme = useCallback(
    (themeId: string, cost: number): boolean => {
      if (stats.coins < cost) return false;
      setStats((prev) => {
        const newStats = {
          ...prev,
          coins: prev.coins - cost,
          unlockedThemes: [...prev.unlockedThemes, themeId],
          activeTheme: themeId,
        };
        saveStats(newStats);
        return newStats;
      });
      return true;
    },
    [stats.coins]
  );

  const claimDailyReward = useCallback((day: number) => {
    setStats((prev) => {
      const rewards = [50, 100, 150, 200, 300, 500, 1000];
      const newClaimed = [...prev.dailyRewardsClaimed];
      if (newClaimed[day]) return prev;
      newClaimed[day] = true;
      const newStats = {
        ...prev,
        coins: prev.coins + rewards[day],
        dailyRewardsClaimed: newClaimed,
      };
      saveStats(newStats);
      return newStats;
    });
  }, []);

  const checkDailyLogin = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setStats((prev) => {
      if (prev.lastLoginDate === today) return prev;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const isConsecutive = prev.lastLoginDate === yesterdayStr;
      const newStreak = isConsecutive ? prev.loginStreak + 1 : 1;

      const newStats = {
        ...prev,
        lastLoginDate: today,
        loginStreak: newStreak,
        dailyRewardsClaimed: isConsecutive
          ? prev.dailyRewardsClaimed
          : [false, false, false, false, false, false, false],
      };
      saveStats(newStats);
      return newStats;
    });
  }, []);

  const addPowerUp = useCallback((powerUpId: string, count: number) => {
    setGameState((prev) => {
      const newPowerUps = prev.powerUps.map((p) =>
        p.id === powerUpId ? { ...p, count: p.count + count } : p
      );
      return { ...prev, powerUps: newPowerUps };
    });
  }, []);

  const value = useMemo(
    () => ({
      gameState,
      stats,
      startGame,
      placePiece,
      activatePowerUp,
      togglePause,
      canPlace,
      getHintPosition,
      lastClearedRows,
      lastClearedCols,
      lastSpecialCells,
      comboJustIncreased,
      updateSkin,
      updateTheme,
      purchaseSkin,
      purchaseTheme,
      claimDailyReward,
      checkDailyLogin,
      addPowerUp,
    }),
    [
      gameState,
      stats,
      startGame,
      placePiece,
      activatePowerUp,
      togglePause,
      canPlace,
      getHintPosition,
      lastClearedRows,
      lastClearedCols,
      lastSpecialCells,
      comboJustIncreased,
      updateSkin,
      updateTheme,
      purchaseSkin,
      purchaseTheme,
      claimDailyReward,
      checkDailyLogin,
      addPowerUp,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
