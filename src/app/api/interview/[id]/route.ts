import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await prisma.interviewSession.findUnique({
    where: { id },
    include: { attempts: true },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const questionIds = JSON.parse(session.questionIds) as string[];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = questionIds
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => ({
      ...q,
      tags: JSON.parse(q.tags),
      payload: JSON.parse(q.payload),
      relatedIds: JSON.parse(q.relatedIds),
    }));

  return NextResponse.json({
    session: {
      ...session,
      config: JSON.parse(session.config),
      questionIds,
      attempts: session.attempts.map((a) => ({
        ...a,
        userAnswer: JSON.parse(a.userAnswer),
        details: JSON.parse(a.details),
      })),
    },
    questions: ordered,
  });
}

const Patch = z.object({
  endedAt: z.string().optional(),
  totalScore: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Patch.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const updated = await prisma.interviewSession.update({
    where: { id },
    data: {
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date(),
      totalScore: parsed.data.totalScore,
    },
  });
  return NextResponse.json({ session: updated });
}
