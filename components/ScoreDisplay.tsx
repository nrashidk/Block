import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

interface ScoreDisplayProps {
  score: number;
  combo: number;
  comboMultiplier: number;
  comboJustIncreased: boolean;
}

export default function ScoreDisplay({
  score,
  combo,
  comboMultiplier,
  comboJustIncreased,
}: ScoreDisplayProps) {
  const comboScale = useSharedValue(1);

  useEffect(() => {
    if (comboJustIncreased) {
      comboScale.value = withSequence(
        withSpring(1.4, { damping: 4, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 100 })
      );
    }
  }, [comboJustIncreased]);

  const comboAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.scoreSection}>
        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={styles.scoreValue}>
          {score.toLocaleString()}
        </Text>
      </View>
      <Animated.View style={[styles.comboSection, comboAnimStyle, combo === 0 && { opacity: 0 }]}>
        <Text style={styles.comboText}>
          {combo > 0 ? `${combo}x COMBO` : "0x COMBO"}
        </Text>
        <Text style={styles.multiplierText}>
          {comboMultiplier.toFixed(1)}x
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scoreSection: {
    flex: 1,
  },
  scoreLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  scoreValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.text,
  },
  comboSection: {
    backgroundColor: Colors.accentGlow,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  comboText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.accent,
  },
  multiplierText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.text,
  },
});
