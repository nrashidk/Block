import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
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
import Colors, { WEB_TOP_PADDING, WEB_BOTTOM_PADDING } from "@/constants/colors";
import { useGame } from "@/lib/game-context";
import { useAuth } from "@/lib/auth-context";
import { GameMode } from "@/lib/game-types";

const { width } = Dimensions.get("window");

const LEAGUE_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  diamond: "#B9F2FF",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { stats, checkDailyLogin } = useGame();
  const { user } = useAuth();
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  useEffect(() => {
    checkDailyLogin();
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glowAnim.value * 0.4,
  }));

  const handlePlay = (mode: GameMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/game", params: { mode } });
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING, paddingBottom: insets.bottom + WEB_BOTTOM_PADDING }]}>
      <LinearGradient
        colors={[Colors.background, "#0D1529", Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/daily");
          }}
          style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
        >
          <Ionicons name="gift" size={22} color={Colors.gold} />
        </Pressable>

        <View style={styles.currencyRow}>
          <View style={styles.currencyItem}>
            <Ionicons name="ellipse" size={14} color={Colors.gold} />
            <Text style={styles.currencyText}>{stats.coins}</Text>
          </View>
          <View style={styles.currencyItem}>
            <Ionicons name="diamond" size={14} color={Colors.primary} />
            <Text style={styles.currencyText}>{stats.gems}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/stats");
          }}
          style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
        >
          {user ? (
            <Ionicons
              name="shield"
              size={20}
              color={LEAGUE_COLORS[user.league] || Colors.textMuted}
            />
          ) : (
            <Ionicons name="bar-chart" size={20} color={Colors.primary} />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleSection}>
          <Animated.View style={[styles.glowCircle, glowStyle]}>
            <LinearGradient
              colors={[Colors.primaryGlow, "transparent"]}
              style={styles.glowGradient}
            />
          </Animated.View>
          <Text style={styles.title}>BLOCK</Text>
          <Text style={styles.titleAccent}>BLAST+</Text>
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={styles.levelText}>Level {stats.level}</Text>
          </View>
        </View>

        <View style={styles.modeSection}>
          <Animated.View style={pulseStyle}>
            <Pressable
              onPress={() => handlePlay("classic")}
              style={({ pressed }) => [
                styles.playButton,
                pressed && styles.playButtonPressed,
              ]}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDim]}
                style={styles.playButtonGradient}
              >
                <Ionicons name="play" size={28} color={Colors.background} />
                <Text style={styles.playButtonText}>PLAY</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={styles.modeButtons}>
            <Pressable
              onPress={() => handlePlay("survival")}
              style={({ pressed }) => [
                styles.modeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="flame" size={20} color={Colors.accent} />
              <Text style={styles.modeText}>Survival</Text>
            </Pressable>

            <Pressable
              onPress={() => handlePlay("practice")}
              style={({ pressed }) => [
                styles.modeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="school" size={20} color={Colors.green} />
              <Text style={styles.modeText}>Practice</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/multiplayer");
            }}
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.accentGlow, "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="flash" size={24} color={Colors.accent} />
            <Text style={styles.featureTitle}>Ranked</Text>
            <Text style={styles.featureSubtitle}>1v1 Match</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/targets");
            }}
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.goldGlow, "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="trophy" size={24} color={Colors.gold} />
            <Text style={styles.featureTitle}>Target</Text>
            <Text style={styles.featureSubtitle}>Puzzles</Text>
          </Pressable>
        </View>

        <View style={styles.featureRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/battlepass");
            }}
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.purpleGlow, "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="ribbon" size={24} color={Colors.purple} />
            <Text style={styles.featureTitle}>Battle Pass</Text>
            <Text style={styles.featureSubtitle}>Season 1</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/shop");
            }}
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.greenGlow, "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="cart" size={24} color={Colors.green} />
            <Text style={styles.featureTitle}>Shop</Text>
            <Text style={styles.featureSubtitle}>Skins & IAP</Text>
          </Pressable>
        </View>

        <View style={styles.bottomCards}>
          <View style={styles.highScoreCard}>
            <Text style={styles.highScoreLabel}>HIGH SCORE</Text>
            <Text style={styles.highScoreValue}>
              {stats.highScore.toLocaleString()}
            </Text>
          </View>
          {user?.isAdmin && (
            <Pressable
              onPress={() => router.push("/admin")}
              style={({ pressed }) => [styles.adminBtn, pressed && styles.pressed]}
            >
              <Ionicons name="settings-outline" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  currencyRow: {
    flexDirection: "row",
    gap: 16,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  
  scrollContent: {
    paddingBottom: 20,
  },
  titleSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  glowCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: "hidden",
  },
  glowGradient: {
    flex: 1,
    borderRadius: 150,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    color: Colors.text,
    letterSpacing: 8,
  },
  titleAccent: {
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    color: Colors.primary,
    letterSpacing: 8,
    marginTop: -8,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modeSection: {
    alignItems: "center",
    paddingBottom: 20,
  },
  playButton: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 16,
  },
  playButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  playButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingVertical: 18,
    gap: 10,
  },
  playButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.background,
    letterSpacing: 4,
  },
  modeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  featureRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  featureTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  featureSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  bottomCards: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 4,
  },
  highScoreCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  highScoreLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  highScoreValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.gold,
  },
  adminBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
