import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { BlockShape } from "@/lib/game-types";
import BlockPiece from "./BlockPiece";

interface NextPiecesPreviewProps {
  pieces: BlockShape[];
}

export default function NextPiecesPreview({ pieces }: NextPiecesPreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>NEXT</Text>
      <View style={styles.piecesRow}>
        {pieces.slice(0, 3).map((piece, i) => (
          <View key={i} style={styles.pieceWrapper}>
            <BlockPiece piece={piece} cellSize={8} opacity={0.6} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 4,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  piecesRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  pieceWrapper: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
