import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Colors, { WEB_TOP_PADDING } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useMultiplayer } from "@/lib/multiplayer-context";
import { useGame } from "@/lib/game-context";

const LEAGUE_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  diamond: "#B9F2FF",
};

export default function MultiplayerScreen() {
  const insets = useSafeAreaInsets();
  const { user, loginAsGuest } = useAuth();
  const {
    queueStatus,
    opponent,
    matchResult,
    joinQueue,
    leaveQueue,
    resetMatch,
  } = useMultiplayer();
  const { addPowerUp } = useGame();

  const searchAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const [autoCreating, setAutoCreating] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);


  useEffect(() => {
    if (!user && !autoCreating) {
      setAutoCreating(true);
      loginAsGuest().finally(() => setAutoCreating(false));
    }
  }, [user, autoCreating]);

  useEffect(() => {
    if (matchResult?.powerUpReward && !rewardClaimed) {
      addPowerUp(matchResult.powerUpReward.id, 1);
      setRewardClaimed(true);
    }
    if (queueStatus !== "result") {
      setRewardClaimed(false);
    }
  }, [matchResult, queueStatus, rewardClaimed]);

  useEffect(() => {
    if (queueStatus === "searching") {
      searchAnim.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [queueStatus]);

  useEffect(() => {
    if (queueStatus === "found") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        router.push("/match");
      }, 2000);
    }
  }, [queueStatus]);

  const searchAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${searchAnim.value * 360}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  if (!user) {
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.lockSubtitle}>Setting up...</Text>
        </View>
      </View>
    );
  }

  const leagueColor = LEAGUE_COLORS[user.league] || Colors.textMuted;

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
          onPress={() => {
            resetMatch();
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ranked Match</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Ionicons name="person" size={32} color={Colors.primary} />
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{user.username}</Text>
            <View style={styles.leagueBadge}>
              <Ionicons
                name="shield"
                size={14}
                color={leagueColor}
              />
              <Text style={[styles.leagueText, { color: leagueColor }]}>
                {user.league.charAt(0).toUpperCase() + user.league.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.eloContainer}>
            <Text style={styles.eloLabel}>ELO</Text>
            <Text style={styles.eloValue}>{user.eloRating}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.draws}</Text>
            <Text style={styles.statLabel}>Draws</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user.wins + user.losses > 0
                ? Math.round(
                    (user.wins / (user.wins + user.losses)) * 100
                  )
                : 0}
              %
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>
      </View>

      <View style={styles.center}>
        {queueStatus === "idle" && (
          <>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                joinQueue(user.id);
              }}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDim]}
                style={styles.findMatchBtn}
              >
                <Ionicons
                  name="flash"
                  size={28}
                  color={Colors.text}
                />
                <Text style={styles.findMatchText}>FIND MATCH</Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.modeInfo}>
              2-minute timed match{"\n"}Same pieces, highest score wins
            </Text>
          </>
        )}

        {queueStatus === "searching" && (
          <>
            <Animated.View style={[styles.searchCircle, searchAnimStyle]}>
              <Ionicons
                name="search"
                size={40}
                color={Colors.primary}
              />
            </Animated.View>
            <Animated.View style={pulseStyle}>
              <Text style={styles.searchText}>Searching for opponent...</Text>
            </Animated.View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                leaveQueue();
              }}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}

        {queueStatus === "found" && opponent && (
          <View style={styles.matchFoundContainer}>
            <Text style={styles.matchFoundTitle}>MATCH FOUND</Text>
            <View style={styles.vsContainer}>
              <View style={styles.playerCard}>
                <Ionicons
                  name="person"
                  size={28}
                  color={Colors.primary}
                />
                <Text style={styles.vsName}>{user.username}</Text>
                <Text style={styles.vsElo}>{user.eloRating}</Text>
              </View>
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.playerCard}>
                <Ionicons
                  name="person"
                  size={28}
                  color={Colors.accent}
                />
                <Text style={styles.vsName}>{opponent.username}</Text>
                <Text style={styles.vsElo}>{opponent.eloRating}</Text>
              </View>
            </View>
            <ActivityIndicator
              color={Colors.primary}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {queueStatus === "result" && matchResult && (
          <View style={styles.resultContainer}>
            <Text
              style={[
                styles.resultTitle,
                {
                  color: matchResult.won
                    ? Colors.green
                    : matchResult.draw
                    ? Colors.gold
                    : Colors.accent,
                },
              ]}
            >
              {matchResult.won
                ? "VICTORY"
                : matchResult.draw
                ? "DRAW"
                : "DEFEAT"}
            </Text>
            <View style={styles.resultScores}>
              <Text style={styles.resultScore}>{matchResult.yourScore}</Text>
              <Text style={styles.resultVs}>-</Text>
              <Text style={styles.resultScore}>
                {matchResult.opponentScore}
              </Text>
            </View>
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Elo Change</Text>
                <Text
                  style={[
                    styles.resultValue,
                    {
                      color:
                        matchResult.eloChange >= 0
                          ? Colors.green
                          : Colors.accent,
                    },
                  ]}
                >
                  {matchResult.eloChange >= 0 ? "+" : ""}
                  {matchResult.eloChange}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Coins Earned</Text>
                <Text style={[styles.resultValue, { color: Colors.gold }]}>
                  +{matchResult.coinsEarned}
                </Text>
              </View>
              {matchResult.powerUpReward && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Power-Up Reward</Text>
                  <View style={styles.powerUpRewardRow}>
                    <Ionicons
                      name={
                        matchResult.powerUpReward.id === "undo"
                          ? "arrow-undo"
                          : matchResult.powerUpReward.id === "shuffle"
                          ? "refresh"
                          : matchResult.powerUpReward.id === "hint"
                          ? "bulb"
                          : "swap-horizontal"
                      }
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={[styles.resultValue, { color: Colors.primary }]}>
                      +1 {matchResult.powerUpReward.name}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                resetMatch();
              }}
              style={({ pressed }) => [
                styles.playAgainBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.playAgainText}>Play Again</Text>
            </Pressable>
          </View>
        )}
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
  profileCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  leagueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  leagueText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  eloContainer: {
    alignItems: "center",
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  eloLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  eloValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  findMatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 24,
    gap: 12,
  },
  findMatchText: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 3,
  },
  modeInfo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 20,
  },
  searchCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 20,
  },
  searchText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  cancelBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  matchFoundContainer: {
    alignItems: "center",
  },
  matchFoundTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.gold,
    letterSpacing: 4,
    marginBottom: 24,
  },
  vsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  playerCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 120,
  },
  vsName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginTop: 8,
  },
  vsElo: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  vsText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.textMuted,
  },
  resultContainer: {
    alignItems: "center",
    width: "100%" as any,
  },
  resultTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    letterSpacing: 6,
    marginBottom: 16,
  },
  resultScores: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  resultScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.text,
  },
  resultVs: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.textMuted,
  },
  resultDetails: {
    width: "100%" as any,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  powerUpRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resultValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  playAgainBtn: {
    marginTop: 24,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  playAgainText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.primary,
  },
  lockTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginTop: 16,
  },
  lockSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  signInBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  signInGradient: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    alignItems: "center",
  },
  signInText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.background,
  },
});
