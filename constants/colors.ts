import { Platform } from "react-native";

const Colors = {
  background: "#0A0E1A",
  backgroundLight: "#111827",
  surface: "#1A1F33",
  surfaceLight: "#242B45",
  surfaceHighlight: "#2D3555",
  border: "#2A3050",
  borderLight: "#3A4470",

  primary: "#00E5FF",
  primaryDim: "#00B8CC",
  primaryGlow: "rgba(0, 229, 255, 0.3)",

  accent: "#FF2D78",
  accentDim: "#CC2460",
  accentGlow: "rgba(255, 45, 120, 0.3)",

  gold: "#FFD700",
  goldDim: "#CC9900",
  goldGlow: "rgba(255, 215, 0, 0.3)",

  green: "#00FF88",
  greenDim: "#00CC6A",
  greenGlow: "rgba(0, 255, 136, 0.3)",

  purple: "#A855F7",
  purpleDim: "#8B3FD9",
  purpleGlow: "rgba(168, 85, 247, 0.3)",

  orange: "#FF8C00",
  orangeDim: "#CC7000",
  orangeGlow: "rgba(255, 140, 0, 0.3)",

  text: "#FFFFFF",
  textSecondary: "#8B95B0",
  textMuted: "#5A6380",

  blockColors: [
    "#00E5FF",
    "#FF2D78",
    "#FFD700",
    "#00FF88",
    "#A855F7",
    "#FF8C00",
    "#FF4444",
    "#4ECDC4",
  ],

  specialBlocks: {
    bomb: "#FF4444",
    lightning: "#FFD700",
    rainbow: "#A855F7",
    freeze: "#00B8FF",
    multiplier: "#FF8C00",
    ghost: "#8B95B0",
  },

  obstacleBlocks: {
    stone: "#6B7280",
    ice: "#87CEEB",
    virus: "#8B00FF",
  },
};

export default Colors;

export const WEB_TOP_PADDING = Platform.OS === "web" ? 67 : 0;
export const WEB_BOTTOM_PADDING = Platform.OS === "web" ? 34 : 0;
