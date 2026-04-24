// Ingest the "2026前端AI面试题集" wiki bitable into the Question table.
// Reads pre-fetched markdown files in /tmp/feishu-qs (produced via lark-cli docs +fetch),
// splits each by H2 (`## title`), and upserts each as a QA-type question.
//
// Run with: pnpm tsx scripts/feishu/ingest-2026.ts

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Category {
  file: string;
  docToken: string;
  category: string;
  tag: string;
}

const CATEGORIES: Category[] = [
  { file: "01-typescript.md", docToken: "HY0IdNiFUoUlbExEXHSce5dynzd", category: "TypeScript与类型系统", tag: "TypeScript" },
  { file: "02-streaming.md", docToken: "UaREd6AeMondsCxSpY4c2x0hn6e", category: "流式处理与实时通信", tag: "流式处理" },
  { file: "03-state.md", docToken: "NNOOdeg15o00yfxUoCncn6zDnkh", category: "前端状态管理与数据流", tag: "状态管理" },
  { file: "04-perf.md", docToken: "YTVUdQGlOoQXSHxyba5cbZKJnWc", category: "性能优化与渲染", tag: "性能优化" },
  { file: "05-ai-arch.md", docToken: "P97XdjNyQoQL3zx70XEc7nAinpd", category: "前端AI架构设计", tag: "AI架构" },
  { file: "06-ai-eng.md", docToken: "F2pedk6proabWIxJzH7csA3xnUg", category: "AI特性与前端工程实践", tag: "AI工程" },
  { file: "07-ai-tools.md", docToken: "CwDzdnJiNoyGEjxM4o0cbSEMn4d", category: "AI工程化与前端工具链", tag: "工具链" },
  { file: "08-llm.md", docToken: "TJxydiCbeoXHsfxyhrPcOPuTnkh", category: "大模型前端集成", tag: "大模型集成" },
];

const DOC_DIR = "/tmp/feishu-qs";
const FEISHU_HOST = "https://y03l2iufsbl.feishu.cn";

interface Block {
  title: string;
  content: string;
}

function splitByH2(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let curTitle: string | null = null;
  let curBuf: string[] = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (curTitle) blocks.push({ title: curTitle, content: curBuf.join("\n").trim() });
      curTitle = m[1].trim();
      curBuf = [];
    } else if (curTitle) {
      curBuf.push(line);
    }
  }
  if (curTitle) blocks.push({ title: curTitle, content: curBuf.join("\n").trim() });
  return blocks;
}

function stableId(source: string, title: string): string {
  return createHash("sha1").update(`${source}::${title}`).digest("hex").slice(0, 16);
}

function extractKeywords(content: string): string[] {
  // Pull bolded **terms** as candidate keywords (limited set).
  const set = new Set<string>();
  for (const m of content.matchAll(/\*\*([^*\n]{2,30})\*\*/g)) {
    const t = m[1].trim().replace(/[：:].*$/, "");
    if (t && t.length <= 30 && !/^[A-Za-z]?\d+\.?$/.test(t)) set.add(t);
    if (set.size >= 8) break;
  }
  return [...set];
}

async function main() {
  let total = 0;
  let written = 0;
  const seenIds = new Set<string>();

  for (const cat of CATEGORIES) {
    const path = resolve(DOC_DIR, cat.file);
    if (!existsSync(path)) {
      console.warn(`[skip] missing ${path}`);
      continue;
    }
    const md = readFileSync(path, "utf8");
    const blocks = splitByH2(md);
    console.log(`\n[${cat.category}] ${blocks.length} questions`);

    const sourceUrl = `${FEISHU_HOST}/docx/${cat.docToken}`;

    for (const b of blocks) {
      if (!b.title || b.content.length < 20) continue;
      total++;
      const source = `${sourceUrl}#${cat.category}`;
      const id = stableId(source, b.title);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const payload = {
        referenceAnswer: b.content,
        keywords: extractKeywords(b.content),
      };

      await prisma.question.upsert({
        where: { id },
        create: {
          id,
          type: "QA",
          title: b.title,
          body: b.title,
          difficulty: "HARD",
          tags: JSON.stringify([cat.tag, "AI", "2026面试"]),
          source,
          score: 20,
          payload: JSON.stringify(payload),
          explanation: b.content,
        },
        update: {
          title: b.title,
          body: b.title,
          difficulty: "HARD",
          tags: JSON.stringify([cat.tag, "AI", "2026面试"]),
          source,
          score: 20,
          payload: JSON.stringify(payload),
          explanation: b.content,
        },
      });
      written++;
    }
  }

  console.log(`\nParsed ${total} blocks, wrote ${written} questions.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
