import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

const E2E_SOURCE = "e2e";

export interface SeedQuestionInput {
  type: "SINGLE" | "MULTI" | "FILL" | "QA" | "CODING" | "PRINT";
  title: string;
  body?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  tags?: string[];
  payload: unknown;
  explanation?: string;
}

export async function seedQuestion(input: SeedQuestionInput): Promise<string> {
  const q = await prisma.question.create({
    data: {
      type: input.type,
      title: input.title,
      body: input.body ?? input.title,
      difficulty: input.difficulty ?? "EASY",
      tags: JSON.stringify(input.tags ?? ["e2e"]),
      source: E2E_SOURCE,
      payload: JSON.stringify(input.payload),
      explanation: input.explanation ?? "",
    },
  });
  return q.id;
}

export async function cleanupE2E(): Promise<void> {
  // Cascade deletes attempts + reviewState + customPlanItems via FK onDelete
  await prisma.question.deleteMany({ where: { source: E2E_SOURCE } });
  // Kill custom plans whose names start with our marker
  await prisma.customPlan.deleteMany({ where: { name: { startsWith: "e2e-" } } });
  // Kill interview sessions started in last 5 min with no maxScore? Too risky;
  // restrict to those whose questionIds reference our (now-gone) questions —
  // those get auto-orphaned at no harm, leave them.
}
