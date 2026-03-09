import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { WEB_TOP_PADDING } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, loginAsGuest, loginWithSocial } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);


  const handleGuest = async () => {
    setError("");
    setLoadingType("guest");
    try {
      await loginAsGuest();
      router.back();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoadingType(null);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoadingType("google");
    try {
      const mockGoogleId = "google_" + Date.now().toString(36);
      await loginWithSocial("google", mockGoogleId, "Player");
      router.back();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoadingType(null);
    }
  };

  const handleApple = async () => {
    setError("");
    setLoadingType("apple");
    try {
      const mockAppleId = "apple_" + Date.now().toString(36);
      await loginWithSocial("apple", mockAppleId, "Player");
      router.back();
    } catch (err: any) {
      setError(err.message || "Apple sign-in failed");
    } finally {
      setLoadingType(null);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoadingType("email");
    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      router.back();
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      if (msg.includes(":")) {
        setError(msg.split(":").slice(1).join(":").trim());
      } else {
        setError(msg);
      }
    } finally {
      setLoadingType(null);
    }
  };

  const isLoading = loadingType !== null;

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
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Ionicons
            name="game-controller"
            size={56}
            color={Colors.primary}
          />
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Create an account to make purchases and save progress
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleGoogle}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.socialBtn,
              styles.googleBtn,
              pressed && styles.pressed,
            ]}
          >
            {loadingType === "google" ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#333" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {Platform.OS === "ios" || Platform.OS === "web" ? (
            <Pressable
              onPress={handleApple}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.socialBtn,
                styles.appleBtn,
                pressed && styles.pressed,
              ]}
            >
              {loadingType === "apple" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text style={styles.appleBtnText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              setShowEmailForm(!showEmailForm);
              setError("");
            }}
            style={styles.emailToggle}
          >
            <Ionicons name="mail" size={16} color={Colors.textSecondary} />
            <Text style={styles.emailToggleText}>
              {showEmailForm ? "Hide" : "Use username & password"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleGuest}
            disabled={isLoading}
            style={styles.skipBtn}
          >
            {loadingType === "guest" ? (
              <ActivityIndicator color={Colors.textSecondary} size="small" />
            ) : (
              <Text style={styles.skipText}>Continue without account</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {showEmailForm ? (
            <>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person"
                  size={18}
                  color={Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={Colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed"
                  size={18}
                  color={Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.pressed,
                ]}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDim]}
                  style={styles.submitGradient}
                >
                  {loadingType === "email" ? (
                    <ActivityIndicator color={Colors.background} />
                  ) : (
                    <Text style={styles.submitText}>
                      {isLogin ? "Sign In" : "Create Account"}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                style={styles.toggleBtn}
              >
                <Text style={styles.toggleText}>
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Sign In"}
                </Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  header: {
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
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.accent,
    textAlign: "center",
    backgroundColor: "rgba(255, 45, 120, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    width: "100%" as any,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%" as any,
    paddingVertical: 15,
    borderRadius: 14,
  },
  
  googleBtn: {
    backgroundColor: "#fff",
  },
  googleBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#333",
  },
  appleBtn: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
  },
  appleBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%" as any,
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  emailToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  emailToggleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    width: "100%" as any,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
  },
  submitBtn: {
    width: "100%" as any,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  submitGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  submitText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.background,
    letterSpacing: 1,
  },
  toggleBtn: {
    padding: 8,
  },
  toggleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.primary,
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: "underline",
  },
});
