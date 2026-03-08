import { apiRequest } from "./query-client";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  type: "coins" | "gems" | "vip";
  amount: number;
}

export const COIN_BUNDLES: Product[] = [
  {
    id: "coins_500",
    name: "Starter Pack",
    description: "500 Coins",
    price: "$0.99",
    type: "coins",
    amount: 500,
  },
  {
    id: "coins_1500",
    name: "Value Pack",
    description: "1,500 Coins",
    price: "$2.99",
    type: "coins",
    amount: 1500,
  },
  {
    id: "coins_5000",
    name: "Super Pack",
    description: "5,000 Coins",
    price: "$4.99",
    type: "coins",
    amount: 5000,
  },
  {
    id: "coins_12000",
    name: "Mega Pack",
    description: "12,000 Coins",
    price: "$9.99",
    type: "coins",
    amount: 12000,
  },
];

export const GEM_PACKS: Product[] = [
  {
    id: "gems_50",
    name: "Gem Pouch",
    description: "50 Gems",
    price: "$0.99",
    type: "gems",
    amount: 50,
  },
  {
    id: "gems_200",
    name: "Gem Chest",
    description: "200 Gems",
    price: "$2.99",
    type: "gems",
    amount: 200,
  },
];

export const VIP_SUBSCRIPTION: Product = {
  id: "vip_monthly",
  name: "VIP Pass",
  description: "Ad-free, 2x coins, exclusive skins",
  price: "$2.99/mo",
  type: "vip",
  amount: 0,
};

export async function purchaseProduct(product: Product): Promise<boolean> {
  try {
    await apiRequest("POST", "/api/purchases", {
      productId: product.id,
      receipt: `mock_receipt_${Date.now()}`,
      amount: parseFloat(product.price.replace(/[^0-9.]/g, "")),
      currency: "USD",
    });
    return true;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<string[]> {
  return [];
}
