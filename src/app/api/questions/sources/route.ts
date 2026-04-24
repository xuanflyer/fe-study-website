import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const rows = await prisma.question.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  const sources = rows
    .map((r) => ({ source: r.source, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
  return NextResponse.json({ sources });
}
