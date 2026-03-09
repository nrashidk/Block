import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { WEB_TOP_PADDING, WEB_BOTTOM_PADDING } from "@/constants/colors";
import { CHAPTER_NAMES, CHAPTER_COLORS } from "@/lib/puzzle-data";
import { apiRequest } from "@/lib/query-client";

interface AdminPuzzle {
  id: number;
  chapter: number;
  levelNumber: number;
  difficulty: string;
  published: boolean;
  targetScore: number;
  movesLimit: number;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [puzzles, setPuzzles] = useState<AdminPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [promoting, setPromoting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPuzzles();
    }, [])
  );

  const loadPuzzles = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/puzzles");
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true);
        return;
      }
      const data = await res.json();
      setPuzzles(data);
      setAccessDenied(false);
    } catch (err) {
      console.error("Failed to load admin puzzles:", err);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const res = await apiRequest("POST", "/api/admin/promote-self");
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadPuzzles();
      } else {
        const data = await res.json();
        Alert.alert("Error", data.error || "Failed to promote");
      }
    } catch (err) {
      console.error("Promote failed:", err);
    } finally {
      setPromoting(false);
    }
  };

  const toggleChapter = async (chapter: number, publish: boolean) => {
    setToggling(chapter);
    try {
      await apiRequest("POST", `/api/admin/chapters/${chapter}/toggle-published`, {
        published: publish,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadPuzzles();
    } catch (err) {
      console.error("Failed to toggle chapter:", err);
    } finally {
      setToggling(null);
    }
  };

  const togglePuzzle = async (puzzleId: number) => {
    try {
      await apiRequest("POST", `/api/admin/puzzles/${puzzleId}/toggle-published`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadPuzzles();
    } catch (err) {
      console.error("Failed to toggle puzzle:", err);
    }
  };

  const handleReseed = () => {
    const doReseed = async () => {
      setLoading(true);
      try {
        await apiRequest("POST", "/api/admin/puzzles/reseed");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadPuzzles();
      } catch (err) {
        console.error("Reseed failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("This will delete all player puzzle progress and regenerate all puzzles. Continue?")) {
        doReseed();
      }
    } else {
      Alert.alert(
        "Reseed All Puzzles",
        "This will delete all player puzzle progress and regenerate all puzzles. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reseed", style: "destructive", onPress: doReseed },
        ]
      );
    }
  };

  const chapters = [...new Set(puzzles.map((p) => p.chapter))].sort((a, b) => a - b);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + WEB_TOP_PADDING }]}>
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

  if (accessDenied) {
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
          <Text style={styles.headerTitle}>Puzzle Admin</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
          <Text style={styles.deniedText}>Admin access required</Text>
          <Pressable
            onPress={handlePromote}
            disabled={promoting}
            style={({ pressed }) => [styles.promoteBtn, pressed && styles.pressed]}
          >
            {promoting ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.promoteBtnText}>Claim Admin</Text>
            )}
          </Pressable>
          <Text style={styles.deniedHint}>
            Only works if no admin exists yet
          </Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Puzzle Admin</Text>
        <Pressable
          onPress={handleReseed}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="refresh" size={22} color={Colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {chapters.map((ch) => {
          const chPuzzles = puzzles.filter((p) => p.chapter === ch);
          const publishedCount = chPuzzles.filter((p) => p.published).length;
          const allPublished = publishedCount === chPuzzles.length;
          const chapterName = CHAPTER_NAMES[ch - 1] || `Chapter ${ch}`;
          const chapterColor = CHAPTER_COLORS[ch - 1] || Colors.primary;

          return (
            <View key={ch} style={styles.chapterBlock}>
              <View style={styles.chapterHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chapterTitle, { color: chapterColor }]}>
                    {chapterName}
                  </Text>
                  <Text style={styles.chapterSubtitle}>
                    {publishedCount}/{chPuzzles.length} published
                    {"  "}
                    {chPuzzles[0]?.difficulty}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleChapter(ch, !allPublished)}
                  disabled={toggling === ch}
                  style={({ pressed }) => [
                    styles.toggleAllBtn,
                    allPublished && styles.toggleAllActive,
                    pressed && styles.pressed,
                  ]}
                >
                  {toggling === ch ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <Text style={styles.toggleAllText}>
                      {allPublished ? "Hide All" : "Publish All"}
                    </Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.levelGrid}>
                {chPuzzles.map((puzzle) => (
                  <Pressable
                    key={puzzle.id}
                    onPress={() => togglePuzzle(puzzle.id)}
                    style={({ pressed }) => [
                      styles.levelCard,
                      !puzzle.published && styles.levelHidden,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelNum,
                        puzzle.published && { color: chapterColor },
                      ]}
                    >
                      {puzzle.levelNumber}
                    </Text>
                    <Ionicons
                      name={puzzle.published ? "eye" : "eye-off"}
                      size={14}
                      color={
                        puzzle.published ? Colors.green : Colors.textMuted
                      }
                    />
                  </Pressable>
                ))}
              </View>
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
  content: {
    padding: 16,
    gap: 20,
  },
  chapterBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  chapterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  chapterTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  chapterSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggleAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary + "20",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  toggleAllActive: {
    backgroundColor: Colors.accent + "20",
    borderColor: Colors.accent + "40",
  },
  toggleAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  levelCard: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  levelHidden: {
    opacity: 0.35,
  },
  levelNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textMuted,
  },
  deniedText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginTop: 16,
  },
  promoteBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary + "20",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  promoteBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
  deniedHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
