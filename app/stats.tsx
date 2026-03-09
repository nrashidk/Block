import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { WEB_TOP_PADDING, WEB_BOTTOM_PADDING } from "@/constants/colors";
import { useGame } from "@/lib/game-context";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { stats } = useGame();


  const xpProgress = stats.xpToNext > 0 ? stats.xp / stats.xpToNext : 0;

  const statItems = [
    {
      icon: "trophy",
      label: "High Score",
      value: stats.highScore.toLocaleString(),
      color: Colors.gold,
    },
    {
      icon: "game-controller",
      label: "Games Played",
      value: stats.gamesPlayed.toString(),
      color: Colors.primary,
    },
    {
      icon: "flash",
      label: "Highest Combo",
      value: `${stats.highestCombo}x`,
      color: Colors.accent,
    },
    {
      icon: "grid",
      label: "Total Clears",
      value: stats.totalClears.toLocaleString(),
      color: Colors.green,
    },
    {
      icon: "cube",
      label: "Blocks Placed",
      value: stats.blocksPlaced.toLocaleString(),
      color: Colors.purple,
    },
    {
      icon: "star",
      label: "Total Score",
      value: stats.totalScore.toLocaleString(),
      color: Colors.orange,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING }]}>
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
        <Text style={styles.title}>Stats</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + WEB_BOTTOM_PADDING + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Ionicons name="star" size={20} color={Colors.gold} />
              <Text style={styles.levelNum}>{stats.level}</Text>
            </View>
            <Text style={styles.levelLabel}>Level {stats.level}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.max(xpProgress * 100, 2)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.xpText}>
            {stats.xp} / {stats.xpToNext} XP
          </Text>
        </View>

        <View style={styles.currencyRow}>
          <View style={styles.currencyCard}>
            <Ionicons name="ellipse" size={24} color={Colors.gold} />
            <Text style={styles.currencyValue}>{stats.coins}</Text>
            <Text style={styles.currencyLabel}>Coins</Text>
          </View>
          <View style={styles.currencyCard}>
            <Ionicons name="diamond" size={24} color={Colors.primary} />
            <Text style={styles.currencyValue}>{stats.gems}</Text>
            <Text style={styles.currencyLabel}>Gems</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          {statItems.map((item, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons
                name={item.icon as any}
                size={22}
                color={item.color}
              />
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Login Streak</Text>
        <View style={styles.streakCard}>
          <Ionicons name="flame" size={28} color={Colors.accent} />
          <Text style={styles.streakValue}>
            {stats.loginStreak} Day{stats.loginStreak !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.streakSubtext}>Keep playing daily!</Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  levelCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.goldGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  levelNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.gold,
  },
  levelLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceHighlight,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  xpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "right",
  },
  currencyRow: {
    flexDirection: "row",
    gap: 12,
  },
  currencyCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  currencyLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.accent,
  },
  streakSubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
