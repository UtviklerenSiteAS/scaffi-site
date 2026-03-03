import { prisma } from "@/lib/prisma";

type TierLimits = {
  searchesPerMonth: number;
  websitesTotal: number;
};

export const TIER_LIMITS: Record<string, TierLimits> = {
  FREE: { searchesPerMonth: Infinity, websitesTotal: 1 },
  STARTER: { searchesPerMonth: 50, websitesTotal: 5 },
  PRO: { searchesPerMonth: Infinity, websitesTotal: Infinity },
};

export async function checkWebsiteLimit(userId: string, tier: string): Promise<boolean> {
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;
  if (limits.websitesTotal === Infinity) return true;

  const count = await prisma.website.count({ where: { userId } });
  return count < limits.websitesTotal;
}

export function isPaidTier(tier: string): boolean {
  return tier === "STARTER" || tier === "PRO";
}
