// Feishu wiki → Question table ingestion.
// Run with:  pnpm ingest:feishu
//
// Reads FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_WIKI_TOKENS from env.
// Walks each wiki tree ≤2 hops, fetches doc content, parses into Seed[],
// upserts into Question table with stable sha1-derived ids.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

import {
  getDocRawContent,
  resolveWikiToRoot,
  walkWiki,
  type WikiNode,
} from "./client";
import { parseDocText, type ParseWarning, type Seed } from "./parse";

const MAX_DEPTH = 2;
const prisma = new PrismaClient();

function stableId(source: string, title: string): string {
  return createHash("sha1").update(`${source}::${title}`).digest("hex").slice(0, 16);
}

async function main() {
  const tokens = (process.env.FEISHU_WIKI_TOKENS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) {
    console.error("FEISHU_WIKI_TOKENS empty");
    process.exit(1);
  }

  const warnings: ParseWarning[] = [];
  const allSeeds: Seed[] = [];

  for (const token of tokens) {
    console.log(`\n[wiki] resolving ${token}`);
    try {
      const { spaceId, rootNodeToken } = await resolveWikiToRoot(token);
      console.log(`  spaceId=${spaceId} root=${rootNodeToken ?? "(top)"}`);

      const nodes = await walkWiki(spaceId, rootNodeToken, MAX_DEPTH);
      console.log(`  walked ${nodes.length} nodes`);

      const docs = nodes.filter(
        (n): n is WikiNode => n.obj_type === "docx" || n.obj_type === "doc"
      );
      console.log(`  ${docs.length} document nodes`);

      for (const node of docs) {
        const text = await getDocRawContent(node.obj_token);
        if (!text || text.length < 20) {
          warnings.push({
            source: `feishu/${token}/${node.title}`,
            reason: "empty doc content",
            excerpt: node.obj_token,
          });
          continue;
        }
        const seeds = parseDocText(text, `feishu/${token}/${node.title}`, warnings);
        console.log(`  • ${node.title}: ${seeds.length} seeds`);
        allSeeds.push(...seeds);
      }
    } catch (err) {
      console.error(`  [skip] wiki ${token}: ${(err as Error).message}`);
      warnings.push({
        source: `feishu/${token}`,
        reason: "wiki access failed",
        excerpt: (err as Error).message.slice(0, 200),
      });
    }
  }

  // Dedupe by stable id
  const byId = new Map<string, Seed>();
  for (const s of allSeeds) {
    byId.set(stableId(s.source, s.title), s);
  }
  console.log(`\nTotal unique seeds: ${byId.size}`);

  let written = 0;
  for (const [id, s] of byId) {
    await prisma.question.upsert({
      where: { id },
      create: {
        id,
        type: s.type,
        title: s.title,
        body: s.body,
        difficulty: s.difficulty,
        tags: JSON.stringify(s.tags),
        source: s.source,
        payload: JSON.stringify(s.payload),
        explanation: s.explanation,
      },
      update: {
        body: s.body,
        difficulty: s.difficulty,
        tags: JSON.stringify(s.tags),
        payload: JSON.stringify(s.payload),
        explanation: s.explanation,
      },
    });
    written++;
  }
  console.log(`Wrote ${written} questions.`);

  if (warnings.length > 0) {
    const path = resolve(process.cwd(), "scripts/feishu/parse-warnings.json");
    writeFileSync(path, JSON.stringify(warnings, null, 2), "utf8");
    console.log(`Wrote ${warnings.length} warnings → ${path}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
