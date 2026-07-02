import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { WEB_TOP_PADDING, WEB_BOTTOM_PADDING } from "@/constants/colors";
import { useGame } from "@/lib/game-context";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { GameMode, BlockShape } from "@/lib/game-types";
import GameGrid, { CELL_SIZE } from "@/components/GameGrid";
import DraggablePiece from "@/components/DraggablePiece";
import ScoreDisplay from "@/components/ScoreDisplay";
import PowerUpBar from "@/components/PowerUpBar";
import NextPiecesPreview from "@/components/NextPiecesPreview";
import GameOverModal from "@/components/GameOverModal";

const { width, height } = Dimensions.get("window");

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode: string }>();
  const mode = (params.mode as GameMode) || "classic";

  const {
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
  } = useGame();
  const { refreshUser } = useAuth();

  const [highlightCells, setHighlightCells] = useState<
    { row: number; col: number }[]
  >([]);
  const [highlightValid, setHighlightValid] = useState(true);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [hintCells, setHintCells] = useState<{ row: number; col: number }[]>(
    []
  );
  const [gridTop, setGridTop] = useState(0);
  const [gridLeft, setGridLeft] = useState(0);
  const gridRef = useRef<View>(null);
  const isDraggingRef = useRef(false);
  const needsRemeasureRef = useRef(false);
  const gameSubmittedRef = useRef(false);

  const handleStartGame = useCallback((gameMode: GameMode) => {
    gameSubmittedRef.current = false;
    startGame(gameMode);
  }, [startGame]);

  useEffect(() => {
    handleStartGame(mode);
  }, [mode]);

  useEffect(() => {
    if (gameState.gameOver && !gameSubmittedRef.current && gameState.score > 0) {
      gameSubmittedRef.current = true;
      apiRequest("POST", "/api/game/complete", {
        score: gameState.score,
        mode,
      })
        .then(() => refreshUser())
        .catch(() => {});
    }
  }, [gameState.gameOver, gameState.score, mode, refreshUser]);

  useEffect(() => {
    if (hintCells.length > 0) {
      const timer = setTimeout(() => setHintCells([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [hintCells]);

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

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    // Re-measure the board now, while it is static, so any drift from a prior
    // placement/animation is corrected before this drag uses it.
    measureGrid();
    setHighlightCells([]);
    setHintCells([]);
  }, [measureGrid]);

  const handleDragMove = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      const piece = gameState.currentPieces[pieceIndex];
      if (!piece) return;

      const cells: { row: number; col: number }[] = [];
      for (let r = 0; r < piece.cells.length; r++) {
        for (let c = 0; c < piece.cells[r].length; c++) {
          if (piece.cells[r][c]) {
            cells.push({ row: row + r, col: col + c });
          }
        }
      }

      const valid = canPlace(pieceIndex, row, col);
      setHighlightCells(cells);
      setHighlightValid(valid);

      if (valid) {
        Haptics.selectionAsync();
      }
    },
    [gameState.currentPieces, canPlace]
  );

  const finishDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (needsRemeasureRef.current) {
      needsRemeasureRef.current = false;
      setTimeout(() => measureGrid(), 100);
    }
  }, [measureGrid]);

  const handleDragEnd = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      const success = placePiece(pieceIndex, row, col);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setHighlightCells([]);
      setDraggingIndex(-1);
      finishDrag();
    },
    [placePiece, finishDrag]
  );

  const handleDragCancel = useCallback(() => {
    setHighlightCells([]);
    setDraggingIndex(-1);
    finishDrag();
  }, [finishDrag]);

  const handlePowerUp = useCallback(
    (id: string) => {
      if (id === "hint") {
        for (let i = 0; i < gameState.currentPieces.length; i++) {
          const piece = gameState.currentPieces[i];
          if (!piece) continue;
          const pos = getHintPosition(i);
          if (pos) {
            const cells: { row: number; col: number }[] = [];
            for (let r = 0; r < piece.cells.length; r++) {
              for (let c = 0; c < piece.cells[r].length; c++) {
                if (piece.cells[r][c]) {
                  cells.push({ row: pos.row + r, col: pos.col + c });
                }
              }
            }
            setHintCells(cells);
            activatePowerUp(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
          }
        }
      }
      activatePowerUp(id);
    },
    [gameState.currentPieces, getHintPosition, activatePowerUp]
  );

  const getModeLabel = () => {
    switch (mode) {
      case "survival":
        return "SURVIVAL";
      case "practice":
        return "PRACTICE";
      default:
        return "CLASSIC";
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case "survival":
        return Colors.accent;
      case "practice":
        return Colors.green;
      default:
        return Colors.primary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING, paddingBottom: WEB_BOTTOM_PADDING || insets.bottom }]}>
      <LinearGradient
        colors={[Colors.background, "#0D1529", Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>

        <View style={[styles.modeBadge, { borderColor: getModeColor() }]}>
          <Text style={[styles.modeText, { color: getModeColor() }]}>
            {getModeLabel()}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            togglePause();
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Ionicons
            name={gameState.isPaused ? "play" : "pause"}
            size={22}
            color={Colors.text}
          />
        </Pressable>
      </View>

      <ScoreDisplay
        score={gameState.score}
        combo={gameState.combo}
        comboMultiplier={gameState.comboMultiplier}
        comboJustIncreased={comboJustIncreased}
      />

      <View style={styles.gridSection}>
        <GameGrid
          ref={gridRef}
          grid={gameState.grid}
          highlightCells={[...highlightCells, ...hintCells]}
          highlightValid={highlightValid || hintCells.length > 0}
          clearedRows={lastClearedRows}
          clearedCols={lastClearedCols}
          specialCells={lastSpecialCells}
          onGridBorderLayout={onGridLayout}
        />
      </View>

      <NextPiecesPreview pieces={gameState.nextPieces} />

      <View style={styles.piecesRow}>
        {gameState.currentPieces.map((piece, i) => (
          <View key={i} style={styles.pieceSlot}>
            {piece ? (
              <DraggablePiece
                piece={piece}
                index={i}
                gridTop={gridTop}
                gridLeft={gridLeft}
                onDragStart={() => {
                  setDraggingIndex(i);
                  handleDragStart();
                }}
                onDragMove={(row, col) => handleDragMove(i, row, col)}
                onDragEnd={(row, col) => handleDragEnd(i, row, col)}
                onDragCancel={handleDragCancel}
              />
            ) : (
              <View style={styles.emptySlot} />
            )}
          </View>
        ))}
      </View>

      <PowerUpBar
        powerUps={gameState.powerUps}
        onUsePowerUp={handlePowerUp}
      />

      <GameOverModal
        visible={gameState.gameOver}
        score={gameState.score}
        highScore={stats.highScore}
        combo={gameState.maxCombo}
        totalClears={gameState.totalClears}
        blocksPlaced={gameState.blocksPlaced}
        xpEarned={Math.floor(gameState.score / 10)}
        coinsEarned={Math.floor(gameState.score / 20)}
        onPlayAgain={() => handleStartGame(mode)}
        onGoHome={() => router.back()}
      />

      {gameState.isPaused && !gameState.gameOver && (
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseModal}>
            <Text style={styles.pauseTitle}>Paused</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                togglePause();
              }}
              style={({ pressed }) => [
                styles.resumeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="play" size={24} color={Colors.background} />
              <Text style={styles.resumeText}>Resume</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={({ pressed }) => [
                styles.quitButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.quitText}>Quit</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "space-between",
  },
  gridSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  modeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 2,
  },
  piecesRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 110,
  },
  pieceSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 110,
  },
  emptySlot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    opacity: 0.3,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  pauseModal: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: 280,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pauseTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    marginBottom: 24,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  resumeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.background,
  },
  quitButton: {
    paddingVertical: 12,
  },
  quitText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
