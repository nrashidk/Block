type AdRewardType = "double_coins" | "free_powerup" | "bonus_coins";

interface AdReward {
  type: AdRewardType;
  amount: number;
}

const AD_REWARDS: Record<AdRewardType, AdReward> = {
  double_coins: { type: "double_coins", amount: 2 },
  free_powerup: { type: "free_powerup", amount: 1 },
  bonus_coins: { type: "bonus_coins", amount: 100 },
};

let adReady = true;
let lastAdShown = 0;
const AD_COOLDOWN = 30000;

export function isAdReady(): boolean {
  const now = Date.now();
  if (now - lastAdShown < AD_COOLDOWN) return false;
  return adReady;
}

export async function showRewardedAd(
  rewardType: AdRewardType
): Promise<AdReward | null> {
  if (!isAdReady()) return null;

  lastAdShown = Date.now();
  adReady = false;

  await new Promise((resolve) => setTimeout(resolve, 1500));

  adReady = true;

  return AD_REWARDS[rewardType] || null;
}

export function getAdCooldownRemaining(): number {
  const elapsed = Date.now() - lastAdShown;
  return Math.max(0, AD_COOLDOWN - elapsed);
}
