import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiOk, toErrorResponse } from "@/lib/api";
import { CATEGORY_KEYS } from "@/server/scoring/score-engine";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  try {
    const history = await prisma.scoreHistory.findMany({
      select: { userId: true, type: true, score: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const latestByUser = new Map<string, Map<string, number>>();
    for (const h of history) {
      let userMap = latestByUser.get(h.userId);
      if (!userMap) {
        userMap = new Map();
        latestByUser.set(h.userId, userMap);
      }
      if (!userMap.has(h.type)) {
        userMap.set(h.type, h.score);
      }
    }

    const categoryAverages: Record<string, { sum: number; count: number }> = {};
    const categoryScores: Record<string, number[]> = {};

    for (const key of CATEGORY_KEYS) {
      categoryAverages[key] = { sum: 0, count: 0 };
      categoryScores[key] = [];
    }

    for (const [, userMap] of latestByUser) {
      for (const key of CATEGORY_KEYS) {
        const score = userMap.get(key);
        if (score != null) {
          categoryAverages[key].sum += score;
          categoryAverages[key].count += 1;
          categoryScores[key].push(score);
        }
      }
    }

    const averages: Record<string, number> = {};
    const topDeciles: Record<string, number> = {};

    for (const key of CATEGORY_KEYS) {
      const scores = categoryScores[key].sort((a, b) => b - a);
      if (scores.length > 0) {
        const avg = categoryAverages[key].sum / categoryAverages[key].count;
        averages[key] = Math.round(avg * 10) / 10;
        const topIdx = Math.max(0, Math.floor(scores.length * 0.1) - 1);
        topDeciles[key] = scores[topIdx] ?? scores[0];
      } else {
        averages[key] = 0;
        topDeciles[key] = 0;
      }
    }

    const userHistory = await prisma.scoreHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { type: true, score: true },
    });

    const userLatest = new Map<string, number>();
    for (const h of userHistory) {
      if (!userLatest.has(h.type)) userLatest.set(h.type, h.score);
    }

    let betterCount = 0;
    const totalUsers = latestByUser.size || 1;

    const userOverall =
      CATEGORY_KEYS.reduce((sum, key) => {
        const s = userLatest.get(key) ?? 0;
        return sum + s;
      }, 0) / CATEGORY_KEYS.length;

    for (const [, userMap] of latestByUser) {
      const otherOverall =
        CATEGORY_KEYS.reduce((sum, key) => {
          const s = userMap.get(key) ?? 0;
          return sum + s;
        }, 0) / CATEGORY_KEYS.length;
      if (otherOverall > userOverall) betterCount++;
    }

    const percentile = Math.round(((totalUsers - betterCount) / totalUsers) * 100);

    return apiOk({
      averages,
      topDeciles,
      userScores: Object.fromEntries(userLatest),
      percentile,
      totalUsers,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
