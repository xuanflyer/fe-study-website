// Heuristic parser: turn raw doc text into Question seeds.
// Strategy: split into "blocks" by lines starting with `数字.` / `Q:` / `题：`.
// Within a block, detect options A./B., answer, explanation, code blocks.

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface Seed {
  type: "SINGLE" | "MULTI" | "FILL" | "CODING" | "PRINT" | "QA";
  title: string;
  body: string;
  difficulty: Difficulty;
  tags: string[];
  source: string;
  payload: unknown;
  explanation: string;
}

export interface ParseWarning {
  source: string;
  reason: string;
  excerpt: string;
}

const Q_START = /^\s*(?:Q[:：]|题[:：]|\d{1,3}[.、)）]\s*)/;
const OPTION_LINE = /^\s*([A-Z])[.、)）]\s*(.+)$/;
const ANSWER_LINE = /^\s*(?:答案|Answer|参考答案)\s*[:：]\s*(.+)$/i;
const EXPLAIN_LINE = /^\s*(?:解析|说明|解答|Explanation)\s*[:：]\s*(.+)$/i;
const TAG_LINE = /^\s*(?:标签|分类|Tags)\s*[:：]\s*(.+)$/i;
const DIFF_LINE = /^\s*(?:难度|Difficulty)\s*[:：]\s*(.+)$/i;

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  easy: "EASY", "简单": "EASY", "初级": "EASY",
  medium: "MEDIUM", "中等": "MEDIUM", "中级": "MEDIUM",
  hard: "HARD", "困难": "HARD", "高级": "HARD", "难": "HARD",
};

function splitIntoBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (Q_START.test(line) && cur.length > 0) {
      blocks.push(cur.join("\n"));
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) blocks.push(cur.join("\n"));
  return blocks.filter((b) => b.trim().length > 10);
}

interface ParsedBlock {
  title: string;
  bodyLines: string[];
  options: { id: string; label: string }[];
  answer: string;
  explanation: string;
  difficulty: Difficulty;
  tags: string[];
  codeBlocks: string[];
}

function parseBlock(raw: string): ParsedBlock | null {
  const lines = raw.split("\n");
  const result: ParsedBlock = {
    title: "",
    bodyLines: [],
    options: [],
    answer: "",
    explanation: "",
    difficulty: "MEDIUM",
    tags: [],
    codeBlocks: [],
  };

  // Title: first non-empty line (strip prefix)
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx === -1) return null;
  result.title = lines[firstIdx].replace(Q_START, "").trim().slice(0, 200);

  // Code block tracking
  let inCode = false;
  let codeBuf: string[] = [];

  for (let i = firstIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      if (inCode) {
        result.codeBlocks.push(codeBuf.join("\n"));
        codeBuf = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    const opt = line.match(OPTION_LINE);
    if (opt) {
      result.options.push({ id: opt[1], label: opt[2].trim() });
      continue;
    }
    const ans = line.match(ANSWER_LINE);
    if (ans) {
      result.answer = ans[1].trim();
      continue;
    }
    const expl = line.match(EXPLAIN_LINE);
    if (expl) {
      result.explanation = expl[1].trim();
      continue;
    }
    const tag = line.match(TAG_LINE);
    if (tag) {
      result.tags = tag[1].split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean);
      continue;
    }
    const diff = line.match(DIFF_LINE);
    if (diff) {
      const key = diff[1].trim().toLowerCase();
      if (DIFFICULTY_MAP[key]) result.difficulty = DIFFICULTY_MAP[key];
      continue;
    }
    if (line.trim().length > 0) {
      result.bodyLines.push(line);
    }
  }
  if (inCode && codeBuf.length > 0) {
    result.codeBlocks.push(codeBuf.join("\n"));
  }

  return result;
}

function inferType(b: ParsedBlock): Seed["type"] | null {
  if (b.codeBlocks.length > 0 && /print|console\.log|输出/.test(b.title + "\n" + b.bodyLines.join("\n"))) {
    return "PRINT";
  }
  if (b.codeBlocks.length > 0) return "CODING";
  if (b.options.length >= 2) {
    const letters = b.answer.match(/[A-Z]/g) ?? [];
    return letters.length > 1 ? "MULTI" : "SINGLE";
  }
  // long-form Q&A / fill-blank fallback
  if (b.bodyLines.join(" ").length > 80) return "QA";
  if (b.answer.length > 0 && b.answer.length < 60) return "FILL";
  return "QA";
}

function buildPayload(b: ParsedBlock, type: Seed["type"]): unknown {
  switch (type) {
    case "SINGLE":
    case "MULTI": {
      const answers = (b.answer.match(/[A-Z]/g) ?? []).filter((c) =>
        b.options.some((o) => o.id === c)
      );
      return { options: b.options, answer: answers };
    }
    case "FILL":
      return { answers: [b.answer], caseSensitive: false };
    case "QA":
      return { referenceAnswer: b.answer || b.explanation, keywords: [] };
    case "CODING":
      return {
        language: "javascript",
        entryFn: "solve",
        starterCode: b.codeBlocks[0] ?? "function solve(){}",
        tests: [
          { name: "示例", input: [], expected: null },
        ],
      };
    case "PRINT":
      return { expectedOutput: b.answer || "" };
  }
}

export function parseDocText(
  text: string,
  source: string,
  warnings: ParseWarning[]
): Seed[] {
  const seeds: Seed[] = [];
  const blocks = splitIntoBlocks(text);
  for (const raw of blocks) {
    const parsed = parseBlock(raw);
    if (!parsed || !parsed.title) {
      warnings.push({ source, reason: "no title", excerpt: raw.slice(0, 120) });
      continue;
    }
    const type = inferType(parsed);
    if (!type) {
      warnings.push({ source, reason: "cannot infer type", excerpt: parsed.title });
      continue;
    }
    if ((type === "SINGLE" || type === "MULTI") && !parsed.answer) {
      warnings.push({ source, reason: "choice without answer", excerpt: parsed.title });
      continue;
    }
    seeds.push({
      type,
      title: parsed.title,
      body: parsed.bodyLines.join("\n").trim() || parsed.title,
      difficulty: parsed.difficulty,
      tags: parsed.tags.length > 0 ? parsed.tags : ["飞书"],
      source,
      payload: buildPayload(parsed, type),
      explanation: parsed.explanation,
    });
  }
  return seeds;
}
