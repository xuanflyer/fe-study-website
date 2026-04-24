import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { selectCardBatch } from "@/server/cards/selectBatch";

export async function GET() {
  const ids = await selectCardBatch(8);
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }
  const rows = await prisma.question.findMany({ where: { id: { in: ids } } });
  // preserve selectBatch order
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => Boolean(r))
    .map((q) => ({
      ...q,
      tags: JSON.parse(q.tags),
      relatedIds: JSON.parse(q.relatedIds),
      payload: JSON.parse(q.payload),
    }));
  return NextResponse.json({ items });
}
