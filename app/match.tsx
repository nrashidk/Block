import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useMultiplayer } from "@/lib/multiplayer-context";
import GameGrid from "@/components/GameGrid";
import DraggablePiece from "@/components/DraggablePiece";
import {
  Cell,
  BlockShape,
  GRID_SIZE,
} from "@/lib/game-types";
import {
  canPlacePiece,
  placePieceOnGrid,
  findClears,
  performClears,
  cloneGrid,
  canAnyPieceFit,
} from "@/lib/game-engine";
import { convertPuzzlePiece } from "@/lib/puzzle-data";

const { width } = Dimensions.get("window");

export default function MatchScreen() {
  const insets = useSafeAreaInsets();
  const {
    opponent,
    matchId,
    initialPieces,
    opponentScore,
    matchResult,
    timeRemaining,
    sendScoreUpdate,
    requestPieces,
    setOnNewPieces,
  } = useMultiplayer();

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [grid, setGrid] = useState<Cell[][]>(() => {
    const g: Cell[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push({
          filled: false,
          colorIndex: 0,
          obstacleType: null,
          obstacleHealth: 0,
          frozen: false,
          frozenTurns: 0,
        });
      }
      g.push(row);
    }
    return g;
  });

  const [score, setScore] = useState(0);
  const [pieces, setPieces] = useState<(BlockShape | null)[]>([
    null,
    null,
    null,
  ]);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [batchIndex, setBatchIndex] = useState(1);
  const gridRef = useRef<View>(null);
  const [gridTop, setGridTop] = useState(0);
  const [gridLeft, setGridLeft] = useState(0);
  const [highlightCells, setHighlightCells] = useState<{ row: number; col: number }[]>([]);
  const [highlightValid, setHighlightValid] = useState(true);

  useEffect(() => {
    if (initialPieces && initialPieces.length >= 3) {
      const converted = initialPieces
        .slice(0, 3)
        .map((p: any) => convertPuzzlePiece(p));
      setPieces(converted);
    }
  }, [initialPieces]);

  useEffect(() => {
    setOnNewPieces((newPieces: any[]) => {
      const converted = newPieces.map((p: any) => convertPuzzlePiece(p));
      setPieces(converted);
    });
    return () => setOnNewPieces(null);
  }, [setOnNewPieces]);

  useEffect(() => {
    if (matchResult) {
      router.replace("/multiplayer");
    }
  }, [matchResult]);

  const isDraggingRef = useRef(false);
  const needsRemeasureRef = useRef(false);

  const measureGrid = useCallback(() => {
    if (!gridRef.current) return;
    gridRef.current.measureInWindow((x, y) => {
      if (typeof x === "number" && typeof y === "number") {
        setGridLeft(x);
        setGridTop(y);
      }
    });
  }, []);

  const onGridLayout = useCallback(() => {
    setTimeout(() => {
      if (isDraggingRef.current) {
        needsRemeasureRef.current = true;
        return;
      }
      measureGrid();
    }, 150);
  }, [measureGrid]);

  const finishDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (needsRemeasureRef.current) {
      needsRemeasureRef.current = false;
      setTimeout(() => measureGrid(), 100);
    }
  }, [measureGrid]);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setHighlightCells([]);
  }, []);

  const handleDragMove = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      const piece = pieces[pieceIndex];
      if (!piece) return;

      const cells: { row: number; col: number }[] = [];
      for (let r = 0; r < piece.cells.length; r++) {
        for (let c = 0; c < piece.cells[r].length; c++) {
          if (piece.cells[r][c]) {
            cells.push({ row: row + r, col: col + c });
          }
        }
      }

      const valid = canPlacePiece(grid, piece, row, col);
      setHighlightCells(cells);
      setHighlightValid(valid);
    },
    [pieces, grid]
  );

  const handleDragEnd = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      const piece = pieces[pieceIndex];
      if (!piece || gameOver) {
        setHighlightCells([]);
        finishDrag();
        return;
      }
      if (!canPlacePiece(grid, piece, row, col)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setHighlightCells([]);
        finishDrag();
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const newGrid = cloneGrid(grid);
      placePieceOnGrid(newGrid, piece, row, col);

      const { clearedRows, clearedCols } = findClears(newGrid);
      const clearScore = performClears(newGrid, clearedRows, clearedCols);

      const linesCleared = clearedRows.length + clearedCols.length;
      const newCombo = linesCleared > 0 ? combo + 1 : 0;
      const multiplier = Math.min(1 + newCombo * 0.5, 5);

      const totalScore = Math.floor(
        (clearScore + piece.cells.flat().filter(Boolean).length * 5) * multiplier
      );
      const newScore = score + totalScore;

      setGrid(newGrid);
      setScore(newScore);
      setCombo(newCombo);
      setHighlightCells([]);

      const newPieces = [...pieces] as (BlockShape | null)[];
      newPieces[pieceIndex] = null;

      const allUsed = newPieces.every((p) => p === null);
      if (allUsed) {
        requestPieces(batchIndex);
        setBatchIndex((prev) => prev + 1);
      } else {
        setPieces(newPieces);
      }

      const isOver = !allUsed && !canAnyPieceFit(newGrid, newPieces);
      if (isOver) setGameOver(true);

      sendScoreUpdate(newScore, batchIndex);
      finishDrag();
    },
    [grid, pieces, score, combo, gameOver, batchIndex, sendScoreUpdate, requestPieces, finishDrag]
  );

  const handleDragCancel = useCallback(() => {
    setHighlightCells([]);
    finishDrag();
  }, [finishDrag]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor =
    timeRemaining <= 10
      ? Colors.accent
      : timeRemaining <= 30
      ? Colors.gold
      : Colors.primary;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + webTopPadding },
      ]}
    >
      <LinearGradient
        colors={[Colors.background, "#0D1529", Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>YOU</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, { color: timerColor }]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>
            {opponent?.username || "OPP"}
          </Text>
          <Text style={[styles.scoreValue, { color: Colors.accent }]}>
            {opponentScore}
          </Text>
        </View>
      </View>

      <View style={styles.comboRow}>
        {combo > 1 && (
          <View style={styles.comboBadge}>
            <Ionicons name="flame" size={14} color={Colors.gold} />
            <Text style={styles.comboText}>x{combo}</Text>
          </View>
        )}
      </View>

      <View style={styles.gridContainer}>
        <GameGrid
          ref={gridRef}
          grid={grid}
          highlightCells={highlightCells}
          highlightValid={highlightValid}
          clearedRows={[]}
          clearedCols={[]}
          onGridBorderLayout={onGridLayout}
        />
      </View>

      <View style={styles.pieceTray}>
        {pieces.map((piece, idx) => (
          <View key={idx} style={styles.pieceSlot}>
            {piece && !gameOver && (
              <DraggablePiece
                piece={piece}
                index={idx}
                gridTop={gridTop}
                gridLeft={gridLeft}
                onDragStart={handleDragStart}
                onDragMove={(row, col) => handleDragMove(idx, row, col)}
                onDragEnd={(row, col) => handleDragEnd(idx, row, col)}
                onDragCancel={handleDragCancel}
              />
            )}
          </View>
        ))}
      </View>

      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverText}>
            Waiting for match to end...
          </Text>
          <Text style={styles.finalScore}>Your Score: {score}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 80,
  },
  scoreLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  scoreValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.primary,
  },
  timerContainer: {
    alignItems: "center",
  },
  timer: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
  },
  comboRow: {
    alignItems: "center",
    height: 28,
  },
  comboBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.goldDim,
  },
  comboText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.gold,
  },
  gridContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  pieceTray: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
  },
  pieceSlot: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 14, 26, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  gameOverText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  finalScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.primary,
    marginTop: 12,
  },
});
