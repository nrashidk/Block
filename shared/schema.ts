import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  json,
  serial,
  date,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull().default(""),
  authProvider: text("auth_provider").notNull().default("local"),
  authProviderId: text("auth_provider_id"),
  isGuest: boolean("is_guest").notNull().default(false),
  eloRating: integer("elo_rating").notNull().default(1000),
  league: text("league").notNull().default("bronze"),
  coins: integer("coins").notNull().default(0),
  gems: integer("gems").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  vipActive: boolean("vip_active").notNull().default(false),
  vipExpiresAt: timestamp("vip_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  player1Id: varchar("player1_id")
    .notNull()
    .references(() => users.id),
  player2Id: varchar("player2_id")
    .notNull()
    .references(() => users.id),
  winnerId: varchar("winner_id"),
  player1Score: integer("player1_score").notNull().default(0),
  player2Score: integer("player2_score").notNull().default(0),
  pieceSeed: text("piece_seed").notNull(),
  status: text("status").notNull().default("waiting"),
  duration: integer("duration").notNull().default(120),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const battlePass = pgTable("battle_pass", {
  id: serial("id").primaryKey(),
  seasonNumber: integer("season_number").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const battlePassTiers = pgTable("battle_pass_tiers", {
  id: serial("id").primaryKey(),
  battlePassId: integer("battle_pass_id")
    .notNull()
    .references(() => battlePass.id),
  tierNumber: integer("tier_number").notNull(),
  xpRequired: integer("xp_required").notNull(),
  freeReward: json("free_reward"),
  premiumReward: json("premium_reward"),
});

export const playerBattlePass = pgTable("player_battle_pass", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id")
    .notNull()
    .references(() => users.id),
  battlePassId: integer("battle_pass_id")
    .notNull()
    .references(() => battlePass.id),
  currentTier: integer("current_tier").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  isPremium: boolean("is_premium").notNull().default(false),
  claimedTiers: json("claimed_tiers").$type<number[]>().default([]),
});

export const targetPuzzles = pgTable("target_puzzles", {
  id: serial("id").primaryKey(),
  chapter: integer("chapter").notNull(),
  levelNumber: integer("level_number").notNull(),
  gridSetup: json("grid_setup").notNull(),
  pieceSequence: json("piece_sequence").notNull(),
  targetScore: integer("target_score").notNull(),
  movesLimit: integer("moves_limit").notNull(),
  difficulty: text("difficulty").notNull().default("easy"),
  published: boolean("published").notNull().default(true),
}, (table) => [
  { name: "uniq_chapter_level", columns: [table.chapter, table.levelNumber], unique: true },
]);

export const dailyPuzzles = pgTable("daily_puzzles", {
  id: serial("id").primaryKey(),
  puzzleDate: date("puzzle_date").notNull().unique(),
  gridSetup: json("grid_setup").notNull(),
  pieceSequence: json("piece_sequence").notNull(),
  targetScore: integer("target_score").notNull(),
});

export const playerPuzzleProgress = pgTable("player_puzzle_progress", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id")
    .notNull()
    .references(() => users.id),
  puzzleId: integer("puzzle_id")
    .notNull()
    .references(() => targetPuzzles.id),
  stars: integer("stars").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
});

export const dailyPuzzleScores = pgTable("daily_puzzle_scores", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id")
    .notNull()
    .references(() => users.id),
  dailyPuzzleId: integer("daily_puzzle_id")
    .notNull()
    .references(() => dailyPuzzles.id),
  score: integer("score").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id")
    .notNull()
    .references(() => users.id),
  productId: text("product_id").notNull(),
  receipt: text("receipt"),
  amount: real("amount"),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type BattlePass = typeof battlePass.$inferSelect;
export type BattlePassTier = typeof battlePassTiers.$inferSelect;
export type TargetPuzzle = typeof targetPuzzles.$inferSelect;
export type DailyPuzzle = typeof dailyPuzzles.$inferSelect;
