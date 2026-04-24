import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const rows = await prisma.question.findMany({ select: { tags: true } });
  const set = new Set<string>();
  for (const r of rows) {
    try {
      for (const t of JSON.parse(r.tags) as string[]) set.add(t);
    } catch {
      /* skip */
    }
  }
  return NextResponse.json({ tags: Array.from(set).sort() });
}
