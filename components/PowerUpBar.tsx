import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { PowerUp } from "@/lib/game-types";

interface PowerUpBarProps {
  powerUps: PowerUp[];
  onUsePowerUp: (id: string) => void;
}

export default function PowerUpBar({ powerUps, onUsePowerUp }: PowerUpBarProps) {
  const handlePress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUsePowerUp(id);
  };

  return (
    <View style={styles.container}>
      {powerUps.map((powerUp) => (
        <Pressable
          key={powerUp.id}
          onPress={() => handlePress(powerUp.id)}
          disabled={powerUp.count <= 0}
          style={({ pressed }) => [
            styles.powerUpButton,
            powerUp.count <= 0 && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={powerUp.icon as any}
            size={20}
            color={powerUp.count > 0 ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.count,
              powerUp.count <= 0 && styles.countDisabled,
            ]}
          >
            {powerUp.count}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  powerUpButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: Colors.surfaceLight,
  },
  count: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
  },
  countDisabled: {
    color: Colors.textMuted,
  },
});
