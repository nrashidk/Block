import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface GameOverModalProps {
  visible: boolean;
  score: number;
  highScore: number;
  combo: number;
  totalClears: number;
  blocksPlaced: number;
  xpEarned: number;
  coinsEarned: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export default function GameOverModal({
  visible,
  score,
  highScore,
  combo,
  totalClears,
  blocksPlaced,
  xpEarned,
  coinsEarned,
  onPlayAgain,
  onGoHome,
}: GameOverModalProps) {
  const isNewHighScore = score >= highScore && score > 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {isNewHighScore && (
            <View style={styles.highScoreBadge}>
              <Ionicons name="trophy" size={16} color={Colors.gold} />
              <Text style={styles.highScoreText}>NEW HIGH SCORE</Text>
            </View>
          )}

          <Text style={styles.title}>Game Over</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{combo}</Text>
              <Text style={styles.statLabel}>Max Combo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalClears}</Text>
              <Text style={styles.statLabel}>Lines</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{blocksPlaced}</Text>
              <Text style={styles.statLabel}>Blocks</Text>
            </View>
          </View>

          <View style={styles.rewardsRow}>
            <View style={styles.rewardItem}>
              <Ionicons name="star" size={16} color={Colors.primary} />
              <Text style={styles.rewardText}>+{xpEarned} XP</Text>
            </View>
            <View style={styles.rewardItem}>
              <Ionicons name="ellipse" size={16} color={Colors.gold} />
              <Text style={styles.rewardText}>+{coinsEarned}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onGoHome();
              }}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="home" size={20} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onPlayAgain();
              }}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="refresh" size={20} color={Colors.background} />
              <Text style={styles.playAgainText}>Play Again</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  highScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.goldGlow,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  highScoreText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 1,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  score: {
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    color: Colors.text,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    width: 52,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  playAgainText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.background,
  },
});
