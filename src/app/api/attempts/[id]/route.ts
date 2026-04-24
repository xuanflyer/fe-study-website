import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

const Body = z.object({
  feedback: z.enum(["LEARNED", "SKIP", "STAR"]).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = await prisma.attempt.findUnique({
    where: { id },
    include: { question: true },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    attempt: {
      ...a,
      userAnswer: JSON.parse(a.userAnswer),
      details: JSON.parse(a.details),
      question: {
        ...a.question,
        tags: JSON.parse(a.question.tags),
        relatedIds: JSON.parse(a.question.relatedIds),
        payload: JSON.parse(a.question.payload),
      },
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const a = await prisma.attempt.update({
    where: { id },
    data: { feedback: parsed.data.feedback ?? null },
  });
  return NextResponse.json({ attempt: a });
}
