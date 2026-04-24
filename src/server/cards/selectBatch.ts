import { prisma } from "@/server/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CardCandidate {
  id: string;
  type: string;
  difficulty: string;
}

function fisherYates<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Round-robin across type buckets so question types interleave; avoid
// >2 same difficulty in a row by skipping to the next bucket when possible.
export function shapeBatch<T extends CardCandidate>(pool: T[], size: number): T[] {
  const buckets = new Map<string, T[]>();
  for (const q of pool) {
    if (!buckets.has(q.type)) buckets.set(q.type, []);
    buckets.get(q.type)!.push(q);
  }
  const order = Array.from(buckets.keys());
  const out: T[] = [];
  let bi = 0;
  let lastDiff: string | null = null;
  let runLen = 0;
  let safety = pool.length * order.length + 1;

  while (out.length < size && safety-- > 0) {
    if (order.length === 0) break;
    let attempts = 0;
    while (attempts < order.length) {
      const key = order[bi % order.length];
      const bucket = buckets.get(key);
      if (bucket && bucket.length > 0) {
        const candidate = bucket[0];
        const wouldRun = candidate.difficulty === lastDiff ? runLen + 1 : 1;
        if (wouldRun > 2 && order.length > 1 && attempts < order.length - 1) {
          bi++;
          attempts++;
          continue;
        }
        bucket.shift();
        out.push(candidate);
        if (candidate.difficulty === lastDiff) runLen++;
        else { lastDiff = candidate.difficulty; runLen = 1; }
        bi++;
        break;
      }
      bi++;
      attempts++;
    }
    if (attempts >= order.length) break; // all empty
  }
  return out;
}

export async function selectCardBatch(size = 8): Promise<string[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + DAY_MS);

  // Tier 1: overdue (mastered=false, due <= now)
  const overdueStates = await prisma.reviewState.findMany({
    where: { mastered: false, nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: "asc" },
    take: size * 3,
    include: { question: { select: { id: true, type: true, difficulty: true } } },
  });
  const tier1 = overdueStates.map((s) => s.question);

  let picked = shapeBatch(tier1, size);
  picked = picked.slice(); // mutable below
  const used = new Set(picked.map((q) => q.id));

  if (picked.length < size) {
    // Tier 2: upcoming within 1 day
    const upcoming = await prisma.reviewState.findMany({
      where: {
        mastered: false,
        nextReviewAt: { gt: now, lte: tomorrow },
        questionId: { notIn: Array.from(used) },
      },
      orderBy: { nextReviewAt: "asc" },
      take: size * 3,
      include: { question: { select: { id: true, type: true, difficulty: true } } },
    });
    const filled = shapeBatch(upcoming.map((s) => s.question), size - picked.length);
    for (const q of filled) {
      picked.push(q);
      used.add(q.id);
    }
  }

  if (picked.length < size) {
    // Tier 3: never-attempted (no ReviewState row)
    const fresh = await prisma.question.findMany({
      where: {
        reviewState: null,
        ...(used.size > 0 ? { id: { notIn: Array.from(used) } } : {}),
      },
      select: { id: true, type: true, difficulty: true },
      take: size * 5,
    });
    const shuffled = fisherYates(fresh);
    const filled = shapeBatch(shuffled, size - picked.length);
    for (const q of filled) {
      picked.push(q);
      used.add(q.id);
    }
  }

  return picked.map((q) => q.id);
}
