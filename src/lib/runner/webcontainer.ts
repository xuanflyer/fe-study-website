"use client";

import type { CodingTest, TestCaseResult } from "@/lib/types";
import type { WebContainer } from "@webcontainer/api";

let bootPromise: Promise<WebContainer> | null = null;

async function boot(): Promise<WebContainer> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const { WebContainer } = await import("@webcontainer/api");
    const wc = await WebContainer.boot();
    await wc.mount({
      "package.json": {
        file: { contents: JSON.stringify({ name: "runner", type: "module" }) },
      },
    });
    return wc;
  })();
  return bootPromise;
}

async function readAll(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

const MARKER = "__RESULT__";

function buildRunner(userCode: string, entryFn: string, input: unknown[]): string {
  return `${userCode}

const __input = ${JSON.stringify(input)};
(async () => {
  try {
    const __out = await ${entryFn}(...__input);
    console.log('${MARKER}' + JSON.stringify({ ok: true, value: __out }));
  } catch (e) {
    console.log('${MARKER}' + JSON.stringify({ ok: false, error: String(e && e.message || e) }));
  }
})();
`;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function runCodingTests(
  code: string,
  tests: CodingTest[],
  entryFn: string
): Promise<TestCaseResult[]> {
  const wc = await boot();
  const results: TestCaseResult[] = [];

  for (const t of tests) {
    const runnerSrc = buildRunner(code, entryFn, t.input);
    await wc.fs.writeFile("runner.mjs", runnerSrc);

    const proc = await wc.spawn("node", ["runner.mjs"]);
    const output = await readAll(proc.output);
    const exitCode = await proc.exit;

    const line = output.split("\n").find((l) => l.includes(MARKER));
    if (!line) {
      results.push({
        name: t.name,
        passed: false,
        expected: t.expected,
        error: `No output (exit ${exitCode}): ${output.slice(-200)}`,
      });
      continue;
    }
    const payload = line.slice(line.indexOf(MARKER) + MARKER.length);
    try {
      const parsed = JSON.parse(payload);
      if (!parsed.ok) {
        results.push({ name: t.name, passed: false, expected: t.expected, error: parsed.error });
      } else {
        const actual = parsed.value;
        results.push({
          name: t.name,
          passed: deepEqual(actual, t.expected),
          expected: t.expected,
          actual,
        });
      }
    } catch (e) {
      results.push({
        name: t.name,
        passed: false,
        expected: t.expected,
        error: `Parse error: ${String(e)}`,
      });
    }
  }

  return results;
}

export async function runPrint(code: string): Promise<{ output: string; error?: string }> {
  const wc = await boot();
  await wc.fs.writeFile("print.mjs", code);
  const proc = await wc.spawn("node", ["print.mjs"]);
  const output = await readAll(proc.output);
  const exitCode = await proc.exit;
  if (exitCode !== 0) return { output, error: `exit ${exitCode}` };
  return { output };
}
