import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { WEB_TOP_PADDING, WEB_BOTTOM_PADDING } from "@/constants/colors";
import { useGame } from "@/lib/game-context";

const DAILY_REWARDS = [
  { day: 1, coins: 50, icon: "ellipse" as const },
  { day: 2, coins: 100, icon: "ellipse" as const },
  { day: 3, coins: 150, icon: "ellipse" as const },
  { day: 4, coins: 200, icon: "gift" as const },
  { day: 5, coins: 300, icon: "ellipse" as const },
  { day: 6, coins: 500, icon: "diamond" as const },
  { day: 7, coins: 1000, icon: "trophy" as const },
];

export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const { stats, claimDailyReward } = useGame();


  const currentDay = Math.min(stats.loginStreak, 7);

  const handleClaim = (dayIndex: number) => {
    if (stats.dailyRewardsClaimed[dayIndex]) return;
    if (dayIndex + 1 > currentDay) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    claimDailyReward(dayIndex);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING, paddingBottom: insets.bottom + WEB_BOTTOM_PADDING }]}>
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
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Daily Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.streakSection}>
        <Ionicons name="flame" size={36} color={Colors.accent} />
        <Text style={styles.streakNum}>{stats.loginStreak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>

      <View style={styles.rewardsGrid}>
        {DAILY_REWARDS.map((reward, i) => {
          const claimed = stats.dailyRewardsClaimed[i];
          const available = i + 1 <= currentDay && !claimed;
          const locked = i + 1 > currentDay;

          return (
            <Pressable
              key={i}
              onPress={() => handleClaim(i)}
              disabled={!available}
              style={({ pressed }) => [
                styles.rewardCard,
                claimed && styles.claimedCard,
                available && styles.availableCard,
                locked && styles.lockedCard,
                pressed && available && styles.pressed,
              ]}
            >
              <Text style={[styles.dayText, locked && styles.lockedText]}>
                Day {reward.day}
              </Text>
              <View style={styles.rewardIconWrap}>
                {claimed ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={28}
                    color={Colors.green}
                  />
                ) : (
                  <Ionicons
                    name={reward.icon}
                    size={28}
                    color={
                      available
                        ? Colors.gold
                        : locked
                        ? Colors.textMuted
                        : Colors.gold
                    }
                  />
                )}
              </View>
              <Text
                style={[
                  styles.rewardAmount,
                  claimed && styles.claimedAmount,
                  locked && styles.lockedText,
                ]}
              >
                {claimed ? "Claimed" : `${reward.coins}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Log in daily to build your streak and earn bigger rewards!
        </Text>
      </View>
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
    paddingVertical: 12,
  },
  backBtn: {
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
    transform: [{ scale: 0.97 }],
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  streakSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  streakNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    color: Colors.accent,
  },
  streakLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: "center",
  },
  rewardCard: {
    width: "29%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  claimedCard: {
    borderColor: Colors.greenDim,
    backgroundColor: Colors.greenGlow,
  },
  availableCard: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldGlow,
  },
  lockedCard: {
    opacity: 0.5,
  },
  dayText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lockedText: {
    color: Colors.textMuted,
  },
  rewardIconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.gold,
  },
  claimedAmount: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.green,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
});
