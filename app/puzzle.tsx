import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors, { WEB_TOP_PADDING } from "@/constants/colors";
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
import {
  PuzzleData,
  convertPuzzleGrid,
  convertPuzzlePiece,
  calculateStars,
} from "@/lib/puzzle-data";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

const PROGRESS_KEY = "@blockblast_puzzle_progress";

export default function PuzzleScreen() {
  const insets = useSafeAreaInsets();
  const { puzzleId } = useLocalSearchParams<{ puzzleId: string }>();
  const { user } = useAuth();


  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [score, setScore] = useState(0);
  const [movesUsed, setMovesUsed] = useState(0);
  const [pieces, setPieces] = useState<(BlockShape | null)[]>([null, null, null]);
  const [pieceQueueIndex, setPieceQueueIndex] = useState(0);
  const [allPieces, setAllPieces] = useState<BlockShape[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [stars, setStars] = useState(0);
  const [lastClearedRows, setLastClearedRows] = useState<number[]>([]);
  const [lastClearedCols, setLastClearedCols] = useState<number[]>([]);
  const gridRef = useRef<View>(null);
  const [gridTop, setGridTop] = useState(0);
  const [gridLeft, setGridLeft] = useState(0);
  const [highlightCells, setHighlightCells] = useState<{ row: number; col: number }[]>([]);
  const [highlightValid, setHighlightValid] = useState(true);

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
    loadPuzzle();
  }, [puzzleId]);

  const loadPuzzle = async () => {
    try {
      const res = await apiRequest("GET", "/api/target-puzzles");
      const data: PuzzleData[] = await res.json();
      const p = data.find((d) => d.id === parseInt(puzzleId || "0"));
      if (!p) return;

      setPuzzle(p);
      setGrid(convertPuzzleGrid(p.gridSetup));

      const converted = (p.pieceSequence as any[]).map((ps: any) =>
        convertPuzzlePiece(ps)
      );
      setAllPieces(converted);

      const initial: (BlockShape | null)[] = [null, null, null];
      for (let i = 0; i < 3 && i < converted.length; i++) {
        initial[i] = converted[i];
      }
      setPieces(initial);
      setPieceQueueIndex(3);
      setScore(0);
      setMovesUsed(0);
      setGameOver(false);
      setShowResult(false);
      setHighlightCells([]);
    } catch (err) {
      console.error("Failed to load puzzle:", err);
    }
  };

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
      if (!piece || gameOver || !puzzle) {
        setHighlightCells([]);
        finishDrag();
        return;
      }
      if (movesUsed >= puzzle.movesLimit) {
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

      setLastClearedRows(clearedRows);
      setLastClearedCols(clearedCols);

      const totalScore =
        clearScore + piece.cells.flat().filter(Boolean).length * 5;
      const newScore = score + totalScore;
      const newMovesUsed = movesUsed + 1;

      setGrid(newGrid);
      setScore(newScore);
      setMovesUsed(newMovesUsed);
      setHighlightCells([]);

      const newPieces = [...pieces] as (BlockShape | null)[];
      newPieces[pieceIndex] = null;

      const allUsed = newPieces.every((p) => p === null);
      const nextQueueIndex = allUsed ? pieceQueueIndex + 3 : pieceQueueIndex;
      if (allUsed) {
        const nextPieces: (BlockShape | null)[] = [null, null, null];
        for (let i = 0; i < 3; i++) {
          if (pieceQueueIndex + i < allPieces.length) {
            nextPieces[i] = allPieces[pieceQueueIndex + i];
          }
        }
        setPieces(nextPieces);
        setPieceQueueIndex(nextQueueIndex);
      } else {
        setPieces(newPieces);
      }

      if (newMovesUsed >= puzzle.movesLimit || (allUsed && nextQueueIndex >= allPieces.length)) {
        const earnedStars = calculateStars(newScore, puzzle.targetScore);
        setStars(earnedStars);
        setGameOver(true);
        setTimeout(() => setShowResult(true), 500);
        saveProgress(puzzle.id, newScore, earnedStars);
      } else if (!allUsed && !canAnyPieceFit(newGrid, newPieces)) {
        const earnedStars = calculateStars(newScore, puzzle.targetScore);
        setStars(earnedStars);
        setGameOver(true);
        setTimeout(() => setShowResult(true), 500);
        saveProgress(puzzle.id, newScore, earnedStars);
      }
      finishDrag();
    },
    [grid, pieces, score, movesUsed, gameOver, puzzle, pieceQueueIndex, allPieces, finishDrag]
  );

  const handleDragCancel = useCallback(() => {
    setHighlightCells([]);
    finishDrag();
  }, [finishDrag]);

  const saveProgress = async (pId: number, finalScore: number, earnedStars: number) => {
    try {
      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      const arr = saved ? JSON.parse(saved) : [];
      const existing = arr.findIndex((p: any) => p.puzzleId === pId);
      const entry = {
        puzzleId: pId,
        stars: earnedStars,
        bestScore: finalScore,
        completed: true,
      };

      if (existing >= 0) {
        arr[existing] = {
          ...arr[existing],
          stars: Math.max(arr[existing].stars, earnedStars),
          bestScore: Math.max(arr[existing].bestScore, finalScore),
          completed: true,
        };
      } else {
        arr.push(entry);
      }
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(arr));

      if (user) {
        try {
          await apiRequest("POST", `/api/target-puzzles/${pId}/complete`, {
            score: finalScore,
            stars: earnedStars,
          });
        } catch (e) {
          console.error("Failed to save puzzle progress:", e);
        }
      }
    } catch (e) {
      console.error("Puzzle completion error:", e);
    }
  };

  if (!puzzle) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING }]}>
        <LinearGradient
          colors={[Colors.background, "#0D1529", Colors.background]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + WEB_TOP_PADDING },
      ]}
    >
      <LinearGradient
        colors={[Colors.background, "#0D1529", Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Ch.{puzzle.chapter} - Level {puzzle.levelNumber}
        </Text>
        <Pressable
          onPress={loadPuzzle}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="refresh" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SCORE</Text>
          <Text style={styles.infoValue}>{score}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>TARGET</Text>
          <Text style={[styles.infoValue, { color: Colors.gold }]}>
            {puzzle.targetScore}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>MOVES</Text>
          <Text
            style={[
              styles.infoValue,
              {
                color:
                  puzzle.movesLimit - movesUsed <= 2
                    ? Colors.accent
                    : Colors.green,
              },
            ]}
          >
            {puzzle.movesLimit - movesUsed}
          </Text>
        </View>
      </View>

      <View style={styles.gridContainer}>
        <GameGrid
          ref={gridRef}
          grid={grid}
          highlightCells={highlightCells}
          highlightValid={highlightValid}
          clearedRows={lastClearedRows}
          clearedCols={lastClearedCols}
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

      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {stars >= 2 ? "Target Reached" : "Level Complete"}
            </Text>
            <View style={styles.resultStars}>
              {[1, 2, 3].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= stars ? "star" : "star-outline"}
                  size={36}
                  color={s <= stars ? Colors.gold : Colors.textMuted}
                />
              ))}
            </View>
            <Text style={styles.resultScore}>Score: {score}</Text>
            <Text style={styles.resultTarget}>
              Target: {puzzle.targetScore}
            </Text>
            <View style={styles.resultButtons}>
              <Pressable
                onPress={() => {
                  setShowResult(false);
                  loadPuzzle();
                }}
                style={({ pressed }) => [
                  styles.retryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="refresh" size={20} color={Colors.text} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowResult(false);
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && styles.pressed,
                ]}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDim]}
                  style={styles.nextGradient}
                >
                  <Text style={styles.nextText}>Done</Text>
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={Colors.background}
                  />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoItem: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  infoValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 26, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%" as any,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
    marginBottom: 16,
  },
  resultStars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  resultScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.primary,
  },
  resultTarget: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
  resultButtons: {
    flexDirection: "row",
    gap: 12,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  nextBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  nextText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});
