import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import {
  PuzzleData,
  PuzzleProgress,
  CHAPTER_NAMES,
  CHAPTER_COLORS,
} from "@/lib/puzzle-data";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

const PROGRESS_KEY = "@blockblast_puzzle_progress";

export default function TargetsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [progress, setProgress] = useState<Record<number, PuzzleProgress>>({});
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [loading, setLoading] = useState(true);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await apiRequest("GET", "/api/target-puzzles");
      const data = await res.json();
      setPuzzles(data);

      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const map: Record<number, PuzzleProgress> = {};
        parsed.forEach((p: PuzzleProgress) => {
          map[p.puzzleId] = p;
        });
        setProgress(map);
      }
    } catch (err) {
      console.error("Failed to load puzzles:", err);
    } finally {
      setLoading(false);
    }
  };

  const chapterPuzzles = puzzles.filter((p) => p.chapter === selectedChapter);

  const getChapterStats = (chapter: number) => {
    const cp = puzzles.filter((p) => p.chapter === chapter);
    let completed = 0;
    let totalStars = 0;
    cp.forEach((p) => {
      const prog = progress[p.id];
      if (prog?.completed) completed++;
      totalStars += prog?.stars || 0;
    });
    return { completed, total: cp.length, totalStars, maxStars: cp.length * 3 };
  };

  const isLevelUnlocked = (puzzle: PuzzleData) => {
    if (puzzle.levelNumber === 1) return true;
    const prevLevel = puzzles.find(
      (p) => p.chapter === puzzle.chapter && p.levelNumber === puzzle.levelNumber - 1
    );
    if (!prevLevel) return true;
    return progress[prevLevel.id]?.completed || false;
  };

  const handlePlayPuzzle = (puzzle: PuzzleData) => {
    if (!isLevelUnlocked(puzzle)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/puzzle",
      params: { puzzleId: puzzle.id.toString() },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopPadding }]}>
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

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopPadding,
          paddingBottom: insets.bottom + webBottomPadding,
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
        <Text style={styles.headerTitle}>Target Mode</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chapterTabs}
        contentContainerStyle={styles.chapterTabsContent}
      >
        {[1, 2, 3].map((ch) => {
          const stats = getChapterStats(ch);
          const isSelected = selectedChapter === ch;
          return (
            <Pressable
              key={ch}
              onPress={() => setSelectedChapter(ch)}
              style={[
                styles.chapterTab,
                isSelected && {
                  borderColor: CHAPTER_COLORS[ch - 1],
                  backgroundColor: CHAPTER_COLORS[ch - 1] + "15",
                },
              ]}
            >
              <Text
                style={[
                  styles.chapterName,
                  isSelected && { color: CHAPTER_COLORS[ch - 1] },
                ]}
              >
                {CHAPTER_NAMES[ch - 1]}
              </Text>
              <View style={styles.chapterProgress}>
                <Ionicons
                  name="star"
                  size={12}
                  color={Colors.gold}
                />
                <Text style={styles.chapterStars}>
                  {stats.totalStars}/{stats.maxStars}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.levelGrid}
        showsVerticalScrollIndicator={false}
      >
        {chapterPuzzles.map((puzzle) => {
          const prog = progress[puzzle.id];
          const unlocked = isLevelUnlocked(puzzle);
          const stars = prog?.stars || 0;

          return (
            <Pressable
              key={puzzle.id}
              onPress={() => handlePlayPuzzle(puzzle)}
              style={({ pressed }) => [
                styles.levelCard,
                !unlocked && styles.levelLocked,
                pressed && unlocked && styles.pressed,
              ]}
            >
              {!unlocked && (
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={Colors.textMuted}
                />
              )}
              {unlocked && (
                <>
                  <Text
                    style={[
                      styles.levelNumber,
                      prog?.completed && { color: CHAPTER_COLORS[selectedChapter - 1] },
                    ]}
                  >
                    {puzzle.levelNumber}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= stars ? "star" : "star-outline"}
                        size={12}
                        color={s <= stars ? Colors.gold : Colors.textMuted}
                      />
                    ))}
                  </View>
                </>
              )}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  chapterTabs: {
    maxHeight: 72,
    marginHorizontal: 16,
  },
  chapterTabsContent: {
    gap: 10,
    paddingVertical: 8,
  },
  chapterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  chapterName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  chapterProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  chapterStars: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
    justifyContent: "center",
  },
  levelCard: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelLocked: {
    opacity: 0.4,
  },
  levelNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
});
