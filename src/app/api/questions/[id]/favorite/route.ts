import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

const Body = z.object({ isFavorite: z.boolean() });

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
  const q = await prisma.question.findUnique({ where: { id }, select: { id: true } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.question.update({
    where: { id },
    data: { isFavorite: parsed.data.isFavorite },
  });
  return NextResponse.json({ ok: true });
}
