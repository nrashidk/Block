import { db } from "./db";
import {
  battlePass,
  battlePassTiers,
  playerBattlePass,
  users,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface TierReward {
  type: "coins" | "gems" | "skin" | "theme" | "powerup" | "xp_boost";
  amount?: number;
  id?: string;
  name: string;
}

export async function getOrCreateCurrentSeason() {
  const [current] = await db
    .select()
    .from(battlePass)
    .where(eq(battlePass.isActive, true))
    .limit(1);

  if (current) return current;

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 28);

  const [season] = await db
    .insert(battlePass)
    .values({
      seasonNumber: 1,
      startDate: now,
      endDate: end,
      isActive: true,
    })
    .returning();

  const tiers: {
    battlePassId: number;
    tierNumber: number;
    xpRequired: number;
    freeReward: TierReward;
    premiumReward: TierReward;
  }[] = [];

  for (let i = 1; i <= 30; i++) {
    const xpReq = i * 100 + Math.floor(i / 5) * 50;

    let freeReward: TierReward;
    let premiumReward: TierReward;

    if (i % 10 === 0) {
      freeReward = { type: "coins", amount: 500, name: `${500} Coins` };
      premiumReward = {
        type: "skin",
        id: `bp_skin_s1_${i}`,
        name: `Season 1 Exclusive Skin`,
      };
    } else if (i % 5 === 0) {
      freeReward = { type: "coins", amount: 200, name: `${200} Coins` };
      premiumReward = { type: "gems", amount: 50, name: `${50} Gems` };
    } else if (i % 3 === 0) {
      freeReward = { type: "powerup", amount: 2, name: "2 Power-ups" };
      premiumReward = { type: "coins", amount: 300, name: `${300} Coins` };
    } else {
      freeReward = {
        type: "coins",
        amount: 50 + i * 5,
        name: `${50 + i * 5} Coins`,
      };
      premiumReward = {
        type: "xp_boost",
        amount: 50,
        name: "50 XP Bonus",
      };
    }

    tiers.push({
      battlePassId: season.id,
      tierNumber: i,
      xpRequired: xpReq,
      freeReward,
      premiumReward,
    });
  }

  await db.insert(battlePassTiers).values(tiers);

  return season;
}

export async function getPlayerBattlePass(playerId: string) {
  const season = await getOrCreateCurrentSeason();

  let [pbp] = await db
    .select()
    .from(playerBattlePass)
    .where(
      and(
        eq(playerBattlePass.playerId, playerId),
        eq(playerBattlePass.battlePassId, season.id)
      )
    )
    .limit(1);

  if (!pbp) {
    [pbp] = await db
      .insert(playerBattlePass)
      .values({
        playerId,
        battlePassId: season.id,
        currentTier: 0,
        xpEarned: 0,
        isPremium: false,
        claimedTiers: [],
      })
      .returning();
  }

  const tiers = await db
    .select()
    .from(battlePassTiers)
    .where(eq(battlePassTiers.battlePassId, season.id));

  tiers.sort((a, b) => a.tierNumber - b.tierNumber);

  return { season, playerProgress: pbp, tiers };
}

export async function addBattlePassXp(playerId: string, xpAmount: number) {
  const season = await getOrCreateCurrentSeason();

  let [pbp] = await db
    .select()
    .from(playerBattlePass)
    .where(
      and(
        eq(playerBattlePass.playerId, playerId),
        eq(playerBattlePass.battlePassId, season.id)
      )
    )
    .limit(1);

  if (!pbp) {
    [pbp] = await db
      .insert(playerBattlePass)
      .values({
        playerId,
        battlePassId: season.id,
        currentTier: 0,
        xpEarned: 0,
        isPremium: false,
        claimedTiers: [],
      })
      .returning();
  }

  const newXp = pbp.xpEarned + xpAmount;
  const tiers = await db
    .select()
    .from(battlePassTiers)
    .where(eq(battlePassTiers.battlePassId, season.id));

  tiers.sort((a, b) => a.tierNumber - b.tierNumber);

  let newTier = 0;
  let totalXpNeeded = 0;
  for (const tier of tiers) {
    totalXpNeeded += tier.xpRequired;
    if (newXp >= totalXpNeeded) {
      newTier = tier.tierNumber;
    } else {
      break;
    }
  }

  await db
    .update(playerBattlePass)
    .set({ xpEarned: newXp, currentTier: newTier })
    .where(eq(playerBattlePass.id, pbp.id));

  return { newXp, newTier };
}

export async function claimTierReward(
  playerId: string,
  tierNumber: number
) {
  const season = await getOrCreateCurrentSeason();

  const [pbp] = await db
    .select()
    .from(playerBattlePass)
    .where(
      and(
        eq(playerBattlePass.playerId, playerId),
        eq(playerBattlePass.battlePassId, season.id)
      )
    )
    .limit(1);

  if (!pbp) throw new Error("No battle pass progress found");
  if (pbp.currentTier < tierNumber)
    throw new Error("Tier not yet reached");

  const claimed = (pbp.claimedTiers || []) as number[];
  if (claimed.includes(tierNumber))
    throw new Error("Tier already claimed");

  const [tier] = await db
    .select()
    .from(battlePassTiers)
    .where(
      and(
        eq(battlePassTiers.battlePassId, season.id),
        eq(battlePassTiers.tierNumber, tierNumber)
      )
    )
    .limit(1);

  if (!tier) throw new Error("Tier not found");

  const newClaimed = [...claimed, tierNumber];
  await db
    .update(playerBattlePass)
    .set({ claimedTiers: newClaimed })
    .where(eq(playerBattlePass.id, pbp.id));

  const rewards = [tier.freeReward as TierReward];
  if (pbp.isPremium) {
    rewards.push(tier.premiumReward as TierReward);
  }

  let totalCoins = 0;
  let totalGems = 0;
  let totalXp = 0;
  for (const reward of rewards) {
    if (reward.type === "coins" && reward.amount) {
      totalCoins += reward.amount;
    } else if (reward.type === "gems" && reward.amount) {
      totalGems += reward.amount;
    } else if (reward.type === "xp_boost" && reward.amount) {
      totalXp += reward.amount;
    }
  }

  if (totalCoins > 0 || totalGems > 0 || totalXp > 0) {
    const updates: Record<string, unknown> = {};
    if (totalCoins > 0) updates.coins = sql`coins + ${totalCoins}`;
    if (totalGems > 0) updates.gems = sql`gems + ${totalGems}`;
    if (totalXp > 0) updates.xp = sql`xp + ${totalXp}`;
    await db.update(users).set(updates).where(eq(users.id, playerId));
  }

  return { rewards, claimedTiers: newClaimed };
}
