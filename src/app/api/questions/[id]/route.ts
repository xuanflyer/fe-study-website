import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    question: {
      ...q,
      tags: JSON.parse(q.tags),
      relatedIds: JSON.parse(q.relatedIds),
      payload: JSON.parse(q.payload),
    },
  });
}
