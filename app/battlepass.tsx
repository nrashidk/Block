import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { WEB_TOP_PADDING, WEB_BOTTOM_PADDING } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

interface TierReward {
  type: string;
  amount?: number;
  id?: string;
  name: string;
}

interface BPTier {
  id: number;
  tierNumber: number;
  xpRequired: number;
  freeReward: TierReward;
  premiumReward: TierReward;
}

interface BPProgress {
  currentTier: number;
  xpEarned: number;
  isPremium: boolean;
  claimedTiers: number[];
}

interface BPSeason {
  id: number;
  seasonNumber: number;
  startDate: string;
  endDate: string;
}

const REWARD_ICONS: Record<string, { name: string; color: string }> = {
  coins: { name: "ellipse", color: Colors.gold },
  gems: { name: "diamond", color: Colors.primary },
  skin: { name: "color-palette", color: Colors.purple },
  theme: { name: "color-fill", color: Colors.green },
  powerup: { name: "flash", color: Colors.orange },
  xp_boost: { name: "trending-up", color: Colors.accent },
};

export default function BattlePassScreen() {
  const insets = useSafeAreaInsets();
  const { user, loginAsGuest } = useAuth();
  const [tiers, setTiers] = useState<BPTier[]>([]);
  const [progress, setProgress] = useState<BPProgress | null>(null);
  const [season, setSeason] = useState<BPSeason | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!user) {
      loginAsGuest().then(() => loadBattlePass());
    } else {
      loadBattlePass();
    }
  }, [user]);

  const loadBattlePass = async () => {
    if (!user) {
      return;
    }
    try {
      const res = await apiRequest("GET", "/api/battle-pass/current");
      const data = await res.json();
      setTiers(data.tiers);
      setProgress(data.playerProgress);
      setSeason(data.season);
    } catch (err) {
      console.error("Failed to load battle pass:", err);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (tierNumber: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await apiRequest("POST", `/api/battle-pass/claim/${tierNumber}`);
      await loadBattlePass();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to claim reward");
    }
  };

  const upgradeToPremium = async () => {
    if (user?.isGuest) {
      router.push("/auth");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await apiRequest("POST", "/api/battle-pass/upgrade");
      await loadBattlePass();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Not enough gems")) {
        Alert.alert("Not Enough Gems", "You need 500 gems to upgrade.");
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  const getTotalXpForTier = (tierNum: number): number => {
    let total = 0;
    for (const t of tiers) {
      if (t.tierNumber <= tierNum) {
        total += t.xpRequired;
      }
    }
    return total;
  };

  const getCurrentTierProgress = (): number => {
    if (!progress || tiers.length === 0) return 0;
    const currentTierData = tiers.find(
      (t) => t.tierNumber === progress.currentTier + 1
    );
    if (!currentTierData) return 1;
    const prevTotal = getTotalXpForTier(progress.currentTier);
    const xpInCurrentTier = progress.xpEarned - prevTotal;
    return Math.min(1, Math.max(0, xpInCurrentTier / currentTierData.xpRequired));
  };

  if (!user) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING }]}
      >
        <LinearGradient
          colors={[Colors.background, "#0D1529", Colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Battle Pass</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
          <Text style={styles.lockTitle}>Account Required</Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDim]}
              style={styles.signInGradient}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING }]}
      >
        <LinearGradient
          colors={[Colors.background, "#0D1529", Colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const tierProgress = getCurrentTierProgress();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + WEB_TOP_PADDING,
          paddingBottom: insets.bottom + WEB_BOTTOM_PADDING,
        },
      ]}
    >
      <LinearGradient
        colors={[Colors.background, "#0D1529", Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Battle Pass</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.seasonInfo}>
        <Text style={styles.seasonTitle}>Season {season?.seasonNumber || 1}</Text>
        <View style={styles.progressInfo}>
          <Text style={styles.tierText}>
            Tier {progress?.currentTier || 0}/30
          </Text>
          <Text style={styles.xpText}>
            {progress?.xpEarned || 0} XP
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${tierProgress * 100}%` as any }]}
          />
        </View>

        {!progress?.isPremium && (
          <Pressable
            onPress={upgradeToPremium}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDim]}
              style={styles.upgradeBtn}
            >
              <Ionicons name="star" size={16} color={Colors.background} />
              <Text style={styles.upgradeText}>Upgrade to Premium (500 Gems)</Text>
            </LinearGradient>
          </Pressable>
        )}
        {progress?.isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={14} color={Colors.gold} />
            <Text style={styles.premiumText}>Premium Active</Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tierList}
      >
        {tiers.map((tier) => {
          const reached = (progress?.currentTier || 0) >= tier.tierNumber;
          const claimed = progress?.claimedTiers?.includes(tier.tierNumber) || false;
          const canClaim = reached && !claimed;
          const freeIcon =
            REWARD_ICONS[tier.freeReward?.type] || REWARD_ICONS.coins;
          const premIcon =
            REWARD_ICONS[tier.premiumReward?.type] || REWARD_ICONS.gems;

          return (
            <View
              key={tier.id}
              style={[
                styles.tierCard,
                reached && styles.tierReached,
                claimed && styles.tierClaimed,
              ]}
            >
              <Text style={styles.tierNumber}>{tier.tierNumber}</Text>

              <View style={styles.rewardBox}>
                <Ionicons
                  name={freeIcon.name as any}
                  size={18}
                  color={freeIcon.color}
                />
                <Text style={styles.rewardName} numberOfLines={2}>
                  {tier.freeReward?.name}
                </Text>
                <Text style={styles.rewardTag}>FREE</Text>
              </View>

              <View style={styles.divider} />

              <View
                style={[
                  styles.rewardBox,
                  !progress?.isPremium && styles.rewardLocked,
                ]}
              >
                {!progress?.isPremium && (
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={Colors.textMuted}
                    style={styles.lockIcon}
                  />
                )}
                <Ionicons
                  name={premIcon.name as any}
                  size={18}
                  color={progress?.isPremium ? premIcon.color : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.rewardName,
                    !progress?.isPremium && { color: Colors.textMuted },
                  ]}
                  numberOfLines={2}
                >
                  {tier.premiumReward?.name}
                </Text>
                <Text style={[styles.rewardTag, { color: Colors.gold }]}>
                  PREMIUM
                </Text>
              </View>

              {canClaim && (
                <Pressable
                  onPress={() => claimReward(tier.tierNumber)}
                  style={({ pressed }) => [
                    styles.claimBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.claimText}>Claim</Text>
                </Pressable>
              )}
              {claimed && (
                <View style={styles.claimedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.green}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
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
  seasonInfo: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  tierText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
  xpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  upgradeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.goldGlow,
  },
  premiumText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.gold,
  },
  tierList: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 32,
  },
  tierCard: {
    width: 120,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  tierReached: {
    borderColor: Colors.primary,
  },
  tierClaimed: {
    borderColor: Colors.green,
    opacity: 0.7,
  },
  tierNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  rewardBox: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
    width: "100%" as any,
  },
  rewardLocked: {
    opacity: 0.5,
  },
  lockIcon: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  rewardName: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.text,
    textAlign: "center",
  },
  rewardTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 1,
  },
  divider: {
    width: "80%" as any,
    height: 1,
    backgroundColor: Colors.border,
  },
  claimBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.background,
  },
  claimedBadge: {
    marginTop: 8,
  },
  lockTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
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
