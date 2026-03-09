import React, { forwardRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { Cell, GRID_SIZE } from "@/lib/game-types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 12;
const GRID_BORDER = 2;
const AVAILABLE_WIDTH = SCREEN_WIDTH - 32;
// CELL_SIZE is computed statically from screen width at module load time.
// This is intentional for a mobile-first game with locked screen rotation.
// Web resize is not supported — the grid size is fixed.
const CELL_SIZE = Math.floor(
  (AVAILABLE_WIDTH - GRID_PADDING * 2 - GRID_BORDER * 2) / GRID_SIZE
);

export { CELL_SIZE, GRID_PADDING, GRID_BORDER };

interface GameGridProps {
  grid: Cell[][];
  highlightCells?: { row: number; col: number }[];
  highlightValid?: boolean;
  clearedRows?: number[];
  clearedCols?: number[];
  specialCells?: { row: number; col: number }[];
  onGridBorderLayout?: () => void;
}

function AnimatedCell({
  cell,
  isHighlighted,
  highlightValid,
  isCleared,
  isSpecial,
}: {
  cell: Cell;
  isHighlighted: boolean;
  highlightValid?: boolean;
  isCleared: boolean;
  isSpecial: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (isSpecial) {
      return {
        transform: [
          {
            scale: withSequence(
              withTiming(1.3, { duration: 60 }),
              withTiming(0.9, { duration: 100 }),
              withTiming(1.0, { duration: 80 })
            ),
          },
        ],
        opacity: withSequence(
          withTiming(1, { duration: 60 }),
          withTiming(0.3, { duration: 200 })
        ),
      };
    }
    if (isCleared && cell.filled) {
      return {
        transform: [
          {
            scale: withSequence(
              withTiming(1.15, { duration: 80 }),
              withTiming(0.8, { duration: 150 })
            ),
          },
        ],
        opacity: withTiming(0.2, { duration: 250 }),
      };
    }
    return {
      transform: [{ scale: 1 }],
      opacity: 1,
    };
  });

  const bgColor = cell.filled
    ? Colors.blockColors[cell.colorIndex % Colors.blockColors.length]
    : isHighlighted
    ? highlightValid
      ? "rgba(0, 229, 255, 0.25)"
      : "rgba(255, 45, 120, 0.25)"
    : "rgba(255, 255, 255, 0.03)";

  const borderColor = cell.filled
    ? "rgba(255, 255, 255, 0.15)"
    : isHighlighted
    ? highlightValid
      ? "rgba(0, 229, 255, 0.5)"
      : "rgba(255, 45, 120, 0.5)"
    : "rgba(255, 255, 255, 0.06)";

  return (
    <Animated.View
      style={[
        styles.cell,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
        cell.frozen && styles.frozenCell,
        cell.obstacleType === "stone" && styles.stoneCell,
        cell.obstacleType === "ice" && styles.iceCell,
        cell.obstacleType === "virus" && styles.virusCell,
        animatedStyle,
      ]}
    >
      {cell.filled && (
        <View
          style={[
            styles.cellHighlight,
            {
              backgroundColor: "rgba(255, 255, 255, 0.15)",
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const GameGrid = forwardRef(function GameGrid({
  grid,
  highlightCells = [],
  highlightValid = true,
  clearedRows = [],
  clearedCols = [],
  specialCells = [],
  onGridBorderLayout,
}: GameGridProps, ref: React.Ref<View>) {
  const highlightSet = new Set(
    highlightCells.map((c) => `${c.row}-${c.col}`)
  );
  const clearedSet = new Set([
    ...clearedRows.flatMap((r) =>
      Array.from({ length: GRID_SIZE }, (_, c) => `${r}-${c}`)
    ),
    ...clearedCols.flatMap((c) =>
      Array.from({ length: GRID_SIZE }, (_, r) => `${r}-${c}`)
    ),
  ]);
  const specialSet = new Set(
    specialCells.map((c) => `${c.row}-${c.col}`)
  );

  return (
    <View style={styles.container}>
      <View ref={ref} collapsable={false} style={styles.gridBorder} onLayout={onGridBorderLayout}>
        <View style={styles.grid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell, c) => (
                <AnimatedCell
                  key={`${r}-${c}`}
                  cell={cell}
                  isHighlighted={highlightSet.has(`${r}-${c}`)}
                  highlightValid={highlightValid}
                  isCleared={clearedSet.has(`${r}-${c}`)}
                  isSpecial={specialSet.has(`${r}-${c}`)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

export default GameGrid;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  gridBorder: {
    borderRadius: 12,
    borderWidth: GRID_BORDER,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: GRID_PADDING,
  },
  grid: {
    gap: 1,
  },
  row: {
    flexDirection: "row" as const,
    gap: 1,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  cellHighlight: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: CELL_SIZE / 2,
    height: CELL_SIZE / 2,
    borderBottomRightRadius: 4,
  },
  frozenCell: {
    borderColor: Colors.specialBlocks.freeze,
    borderWidth: 2,
  },
  stoneCell: {
    backgroundColor: Colors.obstacleBlocks.stone,
  },
  iceCell: {
    backgroundColor: Colors.obstacleBlocks.ice,
  },
  virusCell: {
    backgroundColor: Colors.obstacleBlocks.virus,
  },
});
