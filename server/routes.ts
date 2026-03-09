import type { Express } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { db } from "./db";
import {
  users,
  matches,
  targetPuzzles,
  dailyPuzzles,
  dailyPuzzleScores,
  playerPuzzleProgress,
  purchases,
  playerBattlePass,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  registerUser,
  loginUser,
  createGuestUser,
  findOrCreateSocialUser,
  upgradeGuestAccount,
  getUserById,
  requireAuth,
  requireAdmin,
} from "./auth";
import { setupWebSocket } from "./multiplayer";
import {
  generateDailyPuzzle,
  generateTargetPuzzles,
} from "./puzzle-generator";
import {
  getPlayerBattlePass,
  addBattlePassXp,
  claimTierReward,
} from "./battle-pass";

export async function registerRoutes(app: Express): Promise<Server> {
  const PgSession = ConnectPgSimple(session);

  const sessionMiddleware = session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
    },
  });

  app.use(sessionMiddleware);

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      if (username.length < 3 || password.length < 4) {
        return res
          .status(400)
          .json({ error: "Username must be 3+ chars, password 4+ chars" });
      }
      const user = await registerUser(username, password);
      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        eloRating: user.eloRating,
        league: user.league,
        coins: user.coins,
        gems: user.gems,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const user = await loginUser(username, password);
      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        eloRating: user.eloRating,
        league: user.league,
        coins: user.coins,
        gems: user.gems,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        vipActive: user.vipActive,
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({
      id: user.id,
      username: user.username,
      eloRating: user.eloRating,
      league: user.league,
      coins: user.coins,
      gems: user.gems,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      vipActive: user.vipActive,
      xp: user.xp,
      level: user.level,
      isGuest: user.isGuest,
      authProvider: user.authProvider,
      isAdmin: user.isAdmin,
    });
  });

  app.post("/api/admin/promote-self", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const adminCount = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);
    if (adminCount.length > 0) {
      return res.status(403).json({ error: "Admin already exists" });
    }
    await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, userId));
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.post("/api/auth/guest", async (req, res) => {
    try {
      const user = await createGuestUser();
      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        eloRating: user.eloRating,
        league: user.league,
        coins: user.coins,
        gems: user.gems,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        vipActive: user.vipActive,
        isGuest: user.isGuest,
        authProvider: user.authProvider,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/social", async (req, res) => {
    try {
      const { provider, providerId, displayName, idToken } = req.body;
      if (!provider || !providerId || !displayName) {
        return res.status(400).json({ error: "Missing provider info" });
      }
      if (provider === "google" && idToken) {
        try {
          const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
          );
          const payload = await response.json();
          if (payload.error || payload.sub !== providerId) {
            return res.status(401).json({ error: "Invalid Google token" });
          }
        } catch {
          return res.status(401).json({ error: "Token verification failed" });
        }
      }
      const currentUserId = req.session?.userId;
      let user;
      if (currentUserId) {
        const currentUser = await getUserById(currentUserId);
        if (currentUser && currentUser.isGuest) {
          user = await upgradeGuestAccount(
            currentUserId,
            provider,
            providerId,
            displayName
          );
        } else {
          user = await findOrCreateSocialUser(provider, providerId, displayName);
        }
      } else {
        user = await findOrCreateSocialUser(provider, providerId, displayName);
      }
      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        eloRating: user.eloRating,
        league: user.league,
        coins: user.coins,
        gems: user.gems,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        vipActive: user.vipActive,
        isGuest: user.isGuest,
        authProvider: user.authProvider,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/player/profile", requireAuth, async (req, res) => {
    const user = await getUserById(req.session.userId!);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({
      id: user.id,
      username: user.username,
      eloRating: user.eloRating,
      league: user.league,
      coins: user.coins,
      gems: user.gems,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      xp: user.xp,
      level: user.level,
      vipActive: user.vipActive,
    });
  });

  app.get("/api/player/match-history", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const history = await db
      .select()
      .from(matches)
      .where(
        sql`(${matches.player1Id} = ${userId} OR ${matches.player2Id} = ${userId}) AND ${matches.status} = 'completed'`
      )
      .orderBy(desc(matches.createdAt))
      .limit(20);
    res.json(history);
  });

  app.get("/api/target-puzzles", async (_req, res) => {
    const existing = await db.select().from(targetPuzzles);
    if (existing.length === 0) {
      const puzzles = generateTargetPuzzles();
      try {
        await db.insert(targetPuzzles).values(puzzles).onConflictDoNothing();
      } catch (e) {
        console.error("Target puzzle seed conflict (likely concurrent request):", e);
      }
    } else if (existing.length < 90) {
      const puzzles = generateTargetPuzzles();
      try {
        await db.insert(targetPuzzles).values(puzzles).onConflictDoNothing();
      } catch (e) {
        console.error("Target puzzle upgrade conflict:", e);
      }
    }
    const all = await db
      .select()
      .from(targetPuzzles)
      .where(eq(targetPuzzles.published, true));
    all.sort((a, b) => a.chapter - b.chapter || a.levelNumber - b.levelNumber);
    res.json(all);
  });

  app.get("/api/admin/puzzles", requireAdmin, async (_req, res) => {
    const all = await db.select().from(targetPuzzles);
    all.sort((a, b) => a.chapter - b.chapter || a.levelNumber - b.levelNumber);
    res.json(all);
  });

  app.post("/api/admin/puzzles/:id/toggle-published", requireAdmin, async (req, res) => {
    const puzzleId = parseInt(req.params.id as string);
    const [puzzle] = await db
      .select()
      .from(targetPuzzles)
      .where(eq(targetPuzzles.id, puzzleId))
      .limit(1);
    if (!puzzle) return res.status(404).json({ error: "Puzzle not found" });
    await db
      .update(targetPuzzles)
      .set({ published: !puzzle.published })
      .where(eq(targetPuzzles.id, puzzleId));
    res.json({ ok: true, published: !puzzle.published });
  });

  app.post("/api/admin/chapters/:chapter/toggle-published", requireAdmin, async (req, res) => {
    const chapter = parseInt(req.params.chapter as string);
    const { published } = req.body;
    await db
      .update(targetPuzzles)
      .set({ published: !!published })
      .where(eq(targetPuzzles.chapter, chapter));
    res.json({ ok: true, chapter, published: !!published });
  });

  app.post("/api/admin/puzzles/reseed", requireAdmin, async (_req, res) => {
    await db.delete(playerPuzzleProgress);
    await db.delete(targetPuzzles);
    const puzzles = generateTargetPuzzles();
    await db.insert(targetPuzzles).values(puzzles);
    res.json({ ok: true, count: puzzles.length });
  });

  app.get("/api/target-puzzles/progress", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const progress = await db
      .select()
      .from(playerPuzzleProgress)
      .where(eq(playerPuzzleProgress.playerId, userId));
    res.json(progress);
  });

  app.post("/api/target-puzzles/:id/complete", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const puzzleId = parseInt(req.params.id as string);
    const { score, stars } = req.body;

    if (!Number.isInteger(puzzleId) || puzzleId <= 0) {
      return res.status(400).json({ error: "Invalid puzzle ID" });
    }
    if (typeof score !== "number" || score < 0 || typeof stars !== "number" || ![1, 2, 3].includes(stars)) {
      return res.status(400).json({ error: "Invalid score or stars" });
    }

    const [existing] = await db
      .select()
      .from(playerPuzzleProgress)
      .where(
        and(
          eq(playerPuzzleProgress.playerId, userId),
          eq(playerPuzzleProgress.puzzleId, puzzleId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(playerPuzzleProgress)
        .set({
          stars: Math.max(existing.stars, stars),
          bestScore: Math.max(existing.bestScore, score),
          completed: true,
        })
        .where(eq(playerPuzzleProgress.id, existing.id));
    } else {
      await db.insert(playerPuzzleProgress).values({
        playerId: userId,
        puzzleId,
        stars,
        bestScore: score,
        completed: true,
      });
    }

    const xpReward = 30 + stars * 20;
    await addBattlePassXp(userId, xpReward);

    const coinsReward = 20 + stars * 15;
    await db
      .update(users)
      .set({ coins: sql`coins + ${coinsReward}` })
      .where(eq(users.id, userId));

    res.json({ ok: true, xpReward, coinsReward });
  });

  app.get("/api/daily-puzzle", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    let [puzzle] = await db
      .select()
      .from(dailyPuzzles)
      .where(eq(dailyPuzzles.puzzleDate, today))
      .limit(1);

    if (!puzzle) {
      const generated = generateDailyPuzzle(today);
      [puzzle] = await db
        .insert(dailyPuzzles)
        .values({
          puzzleDate: today,
          gridSetup: generated.gridSetup,
          pieceSequence: generated.pieceSequence,
          targetScore: generated.targetScore,
        })
        .returning();
    }

    res.json(puzzle);
  });

  app.post("/api/daily-puzzle/score", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { dailyPuzzleId, score } = req.body;

    if (typeof dailyPuzzleId !== "number" || dailyPuzzleId <= 0 || typeof score !== "number" || score < 0) {
      return res.status(400).json({ error: "Invalid dailyPuzzleId or score" });
    }

    const [existing] = await db
      .select()
      .from(dailyPuzzleScores)
      .where(
        and(
          eq(dailyPuzzleScores.playerId, userId),
          eq(dailyPuzzleScores.dailyPuzzleId, dailyPuzzleId)
        )
      )
      .limit(1);

    if (existing) {
      if (score > existing.score) {
        await db
          .update(dailyPuzzleScores)
          .set({ score })
          .where(eq(dailyPuzzleScores.id, existing.id));
      }
    } else {
      await db.insert(dailyPuzzleScores).values({
        playerId: userId,
        dailyPuzzleId,
        score,
      });
    }

    await addBattlePassXp(userId, 50);

    res.json({ ok: true });
  });

  const gameCompleteCooldowns = new Map<string, number>();
  const GAME_COMPLETE_COOLDOWN_MS = 30_000;

  app.post("/api/game/complete", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { score, mode } = req.body;

    if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
      return res.status(400).json({ error: "Invalid score" });
    }
    const validModes = ["classic", "survival", "practice"];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: "Invalid game mode" });
    }

    const now = Date.now();
    const lastCompletion = gameCompleteCooldowns.get(userId) || 0;
    if (now - lastCompletion < GAME_COMPLETE_COOLDOWN_MS) {
      return res.status(429).json({ error: "Too many completions, please wait" });
    }
    gameCompleteCooldowns.set(userId, now);

    const xpEarned = Math.min(Math.floor(score / 10), 500);
    const coinsEarned = Math.min(Math.floor(score / 20), 250);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await db
      .update(users)
      .set({
        xp: user.xp + xpEarned,
        coins: user.coins + coinsEarned,
      })
      .where(eq(users.id, userId));

    await addBattlePassXp(userId, xpEarned);

    res.json({
      xpEarned,
      coinsEarned,
      totalXp: user.xp + xpEarned,
      totalCoins: user.coins + coinsEarned,
    });
  });

  app.get("/api/daily-puzzle/leaderboard", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const [puzzle] = await db
      .select()
      .from(dailyPuzzles)
      .where(eq(dailyPuzzles.puzzleDate, today))
      .limit(1);

    if (!puzzle) return res.json([]);

    const scores = await db
      .select({
        username: users.username,
        score: dailyPuzzleScores.score,
      })
      .from(dailyPuzzleScores)
      .innerJoin(users, eq(dailyPuzzleScores.playerId, users.id))
      .where(eq(dailyPuzzleScores.dailyPuzzleId, puzzle.id))
      .orderBy(desc(dailyPuzzleScores.score))
      .limit(50);

    res.json(scores);
  });

  app.get("/api/battle-pass/current", requireAuth, async (req, res) => {
    const data = await getPlayerBattlePass(req.session.userId!);
    res.json(data);
  });

  app.post("/api/battle-pass/claim/:tier", requireAuth, async (req, res) => {
    try {
      const tierNum = parseInt(req.params.tier as string);
      const result = await claimTierReward(req.session.userId!, tierNum);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/battle-pass/upgrade", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const premiumCost = 500;
    if (user.gems < premiumCost) {
      return res.status(400).json({ error: "Not enough gems" });
    }

    await db
      .update(users)
      .set({ gems: sql`gems - ${premiumCost}` })
      .where(eq(users.id, userId));

    const data = await getPlayerBattlePass(userId);
    await db
      .update(playerBattlePass)
      .set({ isPremium: true })
      .where(eq(playerBattlePass.id, data.playerProgress.id));

    res.json({ ok: true });
  });

  // Battle pass XP is awarded internally only — no public endpoint

  const VALID_PRODUCT_IDS = new Set([
    "coins_500", "coins_1500", "coins_5000", "coins_12000",
    "gems_50", "gems_200", "vip_monthly",
  ]);
  const purchaseTimestamps = new Map<string, number[]>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of purchaseTimestamps) {
      const recent = timestamps.filter((t) => now - t < 60_000);
      if (recent.length === 0) {
        purchaseTimestamps.delete(key);
      } else {
        purchaseTimestamps.set(key, recent);
      }
    }
  }, 60_000);

  app.post("/api/purchases", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { productId, receipt, amount, currency } = req.body;

    if (!productId || !VALID_PRODUCT_IDS.has(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!receipt || typeof receipt !== "string" || receipt.length < 10) {
      return res.status(400).json({ message: "Valid purchase receipt required" });
    }

    const isMockReceipt = receipt.startsWith("dev_mock_receipt_");
    if (isMockReceipt && process.env.NODE_ENV === "production" && !process.env.MOCK_IAP_ENABLED) {
      return res.status(501).json({
        message: "Real receipt validation not implemented. Mock purchases are disabled in production.",
      });
    }

    const now = Date.now();
    const userPurchases = purchaseTimestamps.get(userId) || [];
    const recentPurchases = userPurchases.filter((t) => now - t < 60_000);
    if (recentPurchases.length >= 5) {
      return res.status(429).json({ message: "Too many purchase requests" });
    }
    recentPurchases.push(now);
    purchaseTimestamps.set(userId, recentPurchases);

    const [existingReceipt] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.receipt, receipt))
      .limit(1);
    if (existingReceipt) {
      return res.status(409).json({ message: "Receipt already redeemed" });
    }

    await db.insert(purchases).values({
      playerId: userId,
      productId,
      receipt,
      amount: amount || "0",
      currency: currency || "USD",
    });

    if (productId.startsWith("coins_")) {
      const coinAmounts: Record<string, number> = {
        coins_500: 500,
        coins_1500: 1500,
        coins_5000: 5000,
        coins_12000: 12000,
      };
      const coins = coinAmounts[productId] || 0;
      await db
        .update(users)
        .set({ coins: sql`coins + ${coins}` })
        .where(eq(users.id, userId));
    } else if (productId.startsWith("gems_")) {
      const gemAmounts: Record<string, number> = {
        gems_50: 50,
        gems_200: 200,
      };
      const gems = gemAmounts[productId] || 0;
      await db
        .update(users)
        .set({ gems: sql`gems + ${gems}` })
        .where(eq(users.id, userId));
    } else if (productId === "vip_monthly") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await db
        .update(users)
        .set({ vipActive: true, vipExpiresAt: expires })
        .where(eq(users.id, userId));
    }

    res.json({ ok: true });
  });

  app.get("/api/leaderboard", async (_req, res) => {
    const top = await db
      .select({
        username: users.username,
        eloRating: users.eloRating,
        league: users.league,
        wins: users.wins,
      })
      .from(users)
      .orderBy(desc(users.eloRating))
      .limit(50);
    res.json(top);
  });

  const httpServer = createServer(app);

  setupWebSocket(httpServer, sessionMiddleware);

  return httpServer;
}
