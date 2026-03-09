import React from "react";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { BlockShape } from "@/lib/game-types";

interface BlockPieceProps {
  piece: BlockShape;
  cellSize?: number;
  opacity?: number;
}

export default function BlockPiece({
  piece,
  cellSize = 14,
  opacity = 1,
}: BlockPieceProps) {
  const color =
    piece.type !== "normal"
      ? Colors.specialBlocks[piece.type as keyof typeof Colors.specialBlocks] ||
        Colors.blockColors[piece.colorIndex % Colors.blockColors.length]
      : Colors.blockColors[piece.colorIndex % Colors.blockColors.length];

  return (
    <View style={[styles.container, { opacity }]}>
      {piece.cells.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((filled, c) => (
            <View
              key={c}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: filled ? color : "transparent",
                  borderColor: filled ? "rgba(255,255,255,0.2)" : "transparent",
                  borderRadius: Math.max(2, cellSize * 0.15),
                },
              ]}
            >
              {filled && (
                <View
                  style={[
                    styles.highlight,
                    { borderRadius: Math.max(1, cellSize * 0.1) },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      ))}
      {piece.type !== "normal" && (
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: color },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  row: {
    flexDirection: "row" as const,
    gap: 1,
  },
  cell: {
    borderWidth: 1,
    overflow: "hidden",
  },
  highlight: {
    position: "absolute" as const,
    top: 1,
    left: 1,
    width: "40%",
    height: "40%",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  typeBadge: {
    position: "absolute" as const,
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
});
