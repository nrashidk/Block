import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGame } from "@/lib/game-context";
import { SKIN_SETS, BOARD_THEMES } from "@/lib/game-types";
import {
  COIN_BUNDLES,
  GEM_PACKS,
  VIP_SUBSCRIPTION,
  purchaseProduct,
  Product,
} from "@/lib/purchases";
import { useAuth } from "@/lib/auth-context";

type TabType = "skins" | "themes" | "store";

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { stats, purchaseSkin, purchaseTheme, updateSkin, updateTheme } =
    useGame();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("store");
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchaseIAP = async (product: Product) => {
    if (!user || user.isGuest) {
      router.push("/auth");
      return;
    }
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const success = await purchaseProduct(product);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshUser();
        Alert.alert("Purchase Complete", `${product.description} added!`);
      }
    } catch {
      Alert.alert("Error", "Purchase failed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  const handlePurchaseSkin = (id: string, cost: number) => {
    if (stats.unlockedSkins.includes(id)) {
      updateSkin(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (stats.coins < cost) {
      Alert.alert("Not enough coins", "Play more games to earn coins!");
      return;
    }
    const success = purchaseSkin(id, cost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePurchaseTheme = (id: string, cost: number) => {
    if (stats.unlockedThemes.includes(id)) {
      updateTheme(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (stats.coins < cost) {
      Alert.alert("Not enough coins", "Play more games to earn coins!");
      return;
    }
    const success = purchaseTheme(id, cost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const skinColors: Record<string, string[]> = {
    default: ["#00E5FF", "#FF2D78", "#FFD700"],
    neon: ["#39FF14", "#FF073A", "#00FFFF"],
    pixel: ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    glass: ["rgba(255,255,255,0.4)", "rgba(0,200,255,0.4)", "rgba(255,100,200,0.4)"],
    galaxy: ["#7B2FBE", "#E040FB", "#1A237E"],
    candy: ["#FF69B4", "#FFB347", "#87CEEB"],
    metal: ["#708090", "#B0C4DE", "#C0C0C0"],
    ocean: ["#006994", "#40E0D0", "#0077BE"],
  };

  const themeColors: Record<string, string[]> = {
    default: [Colors.background, Colors.surface],
    midnight: ["#0D0221", "#1A0533"],
    cyber: ["#0A001A", "#1A0033"],
    forest: ["#0A1A0A", "#1A331A"],
    lava: ["#1A0500", "#330A00"],
    arctic: ["#0A1A2A", "#1A334A"],
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopPadding }]}>
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
        <Text style={styles.title}>Shop</Text>
        <View style={styles.coinBadge}>
          <Ionicons name="ellipse" size={14} color={Colors.gold} />
          <Text style={styles.coinText}>{stats.coins}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab("store")}
          style={[styles.tab, activeTab === "store" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "store" && styles.activeTabText,
            ]}
          >
            Store
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("skins")}
          style={[styles.tab, activeTab === "skins" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "skins" && styles.activeTabText,
            ]}
          >
            Skins
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("themes")}
          style={[styles.tab, activeTab === "themes" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "themes" && styles.activeTabText,
            ]}
          >
            Themes
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "store" && (
          <>
            <Pressable
              onPress={() => handlePurchaseIAP(VIP_SUBSCRIPTION)}
              disabled={purchasing}
              style={({ pressed }) => [
                styles.itemCard,
                styles.vipCard,
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={[Colors.goldGlow, "transparent"]}
                style={styles.vipGradient}
              />
              <View style={styles.vipContent}>
                <Ionicons name="star" size={28} color={Colors.gold} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{VIP_SUBSCRIPTION.name}</Text>
                  <Text style={styles.vipDesc}>{VIP_SUBSCRIPTION.description}</Text>
                </View>
                <View style={styles.iapPrice}>
                  <Text style={styles.iapPriceText}>{VIP_SUBSCRIPTION.price}</Text>
                </View>
              </View>
            </Pressable>

            <Text style={styles.sectionTitle}>Coin Bundles</Text>
            {COIN_BUNDLES.map((bundle) => (
              <Pressable
                key={bundle.id}
                onPress={() => handlePurchaseIAP(bundle)}
                disabled={purchasing}
                style={({ pressed }) => [
                  styles.itemCard,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="ellipse" size={24} color={Colors.gold} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{bundle.name}</Text>
                  <Text style={styles.iapDesc}>{bundle.description}</Text>
                </View>
                <View style={styles.iapPrice}>
                  <Text style={styles.iapPriceText}>{bundle.price}</Text>
                </View>
              </Pressable>
            ))}

            <Text style={styles.sectionTitle}>Gem Packs</Text>
            {GEM_PACKS.map((pack) => (
              <Pressable
                key={pack.id}
                onPress={() => handlePurchaseIAP(pack)}
                disabled={purchasing}
                style={({ pressed }) => [
                  styles.itemCard,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="diamond" size={24} color={Colors.primary} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{pack.name}</Text>
                  <Text style={styles.iapDesc}>{pack.description}</Text>
                </View>
                <View style={styles.iapPrice}>
                  <Text style={styles.iapPriceText}>{pack.price}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {activeTab === "skins" &&
          SKIN_SETS.map((skin) => {
            const owned = stats.unlockedSkins.includes(skin.id);
            const active = stats.activeSkin === skin.id;
            const colors = skinColors[skin.id] || skinColors.default;

            return (
              <Pressable
                key={skin.id}
                onPress={() => handlePurchaseSkin(skin.id, skin.cost)}
                style={({ pressed }) => [
                  styles.itemCard,
                  active && styles.activeCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.previewRow}>
                  {colors.map((color, i) => (
                    <View
                      key={i}
                      style={[styles.previewBlock, { backgroundColor: color }]}
                    />
                  ))}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{skin.name}</Text>
                  {active ? (
                    <View style={styles.equippedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={Colors.green}
                      />
                      <Text style={styles.equippedText}>Equipped</Text>
                    </View>
                  ) : owned ? (
                    <Text style={styles.ownedText}>Owned</Text>
                  ) : (
                    <View style={styles.priceBadge}>
                      <Ionicons name="ellipse" size={12} color={Colors.gold} />
                      <Text style={styles.priceText}>{skin.cost}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

        {activeTab === "themes" &&
          BOARD_THEMES.map((theme) => {
            const owned = stats.unlockedThemes.includes(theme.id);
            const active = stats.activeTheme === theme.id;
            const colors = themeColors[theme.id] || themeColors.default;

            return (
              <Pressable
                key={theme.id}
                onPress={() => handlePurchaseTheme(theme.id, theme.cost)}
                style={({ pressed }) => [
                  styles.itemCard,
                  active && styles.activeCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.themePreview}>
                  <LinearGradient
                    colors={[...colors, colors[1]]}
                    style={styles.themeGradient}
                  >
                    <View style={styles.miniGrid}>
                      {[0, 1, 2].map((r) => (
                        <View key={r} style={styles.miniRow}>
                          {[0, 1, 2].map((c) => (
                            <View
                              key={c}
                              style={[
                                styles.miniCell,
                                (r + c) % 2 === 0 && styles.miniCellFilled,
                              ]}
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{theme.name}</Text>
                  {active ? (
                    <View style={styles.equippedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={Colors.green}
                      />
                      <Text style={styles.equippedText}>Active</Text>
                    </View>
                  ) : owned ? (
                    <Text style={styles.ownedText}>Owned</Text>
                  ) : (
                    <View style={styles.priceBadge}>
                      <Ionicons name="ellipse" size={12} color={Colors.gold} />
                      <Text style={styles.priceText}>{theme.cost}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
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
  coinBadge: {
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
  coinText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  activeCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  previewRow: {
    flexDirection: "row",
    gap: 4,
  },
  previewBlock: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  themePreview: {
    borderRadius: 10,
    overflow: "hidden",
    width: 88,
    height: 56,
  },
  themeGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  miniGrid: {
    gap: 2,
  },
  miniRow: {
    flexDirection: "row",
    gap: 2,
  },
  miniCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  miniCellFilled: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  equippedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  equippedText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.green,
  },
  ownedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.gold,
  },
  vipCard: {
    borderColor: Colors.goldDim,
    overflow: "hidden",
  },
  vipGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  vipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 1,
  },
  vipDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  iapDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  iapPrice: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  iapPriceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.green,
  },
});
