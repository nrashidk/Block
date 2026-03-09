import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerUser(username: string, password: string) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("Username already taken");
  }
  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ username, password: hashed, authProvider: "local", isGuest: false })
    .returning();
  return user;
}

export async function loginUser(username: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) {
    throw new Error("Invalid credentials");
  }
  if (user.isGuest || user.authProvider !== "local") {
    throw new Error("This account uses social login");
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }
  return user;
}

export async function createGuestUser() {
  const guestTag = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const username = `Player_${guestTag}`;
  const [user] = await db
    .insert(users)
    .values({
      username,
      password: "",
      authProvider: "guest",
      isGuest: true,
    })
    .returning();
  return user;
}

export async function findOrCreateSocialUser(
  provider: string,
  providerId: string,
  displayName: string
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.authProvider, provider),
        eq(users.authProviderId, providerId)
      )
    )
    .limit(1);
  if (existing) {
    return existing;
  }
  let baseUsername = displayName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  if (baseUsername.length < 3) {
    baseUsername = `${provider}_${Date.now().toString(36)}`;
  }
  let username = baseUsername;
  for (let attempt = 0; attempt < 5; attempt++) {
    const [check] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!check) break;
    username = `${baseUsername}_${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`;
  }
  const [user] = await db
    .insert(users)
    .values({
      username,
      password: "",
      authProvider: provider,
      authProviderId: providerId,
      isGuest: false,
    })
    .returning();
  return user;
}

export async function upgradeGuestAccount(
  guestUserId: string,
  provider: string,
  providerId: string,
  displayName: string
) {
  let baseUsername = displayName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  if (baseUsername.length < 3) {
    baseUsername = `${provider}_${Date.now().toString(36)}`;
  }
  let username = baseUsername;
  for (let attempt = 0; attempt < 5; attempt++) {
    const [check] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!check || check.id === guestUserId) break;
    username = `${baseUsername}_${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`;
  }
  const [user] = await db
    .update(users)
    .set({
      username,
      authProvider: provider,
      authProviderId: providerId,
      isGuest: false,
    })
    .where(eq(users.id, guestUserId))
    .returning();
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await getUserById(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function getLeague(elo: number): string {
  if (elo >= 1800) return "diamond";
  if (elo >= 1500) return "gold";
  if (elo >= 1200) return "silver";
  return "bronze";
}

export function calculateElo(
  playerRating: number,
  opponentRating: number,
  won: boolean
): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const score = won ? 1 : 0;
  const newRating = Math.round(playerRating + K * (score - expected));
  return Math.max(100, newRating);
}
