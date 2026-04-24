import type { PrintPayload, GradeResult } from "@/lib/types";

function normalize(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

export function gradePrint(
  payload: PrintPayload,
  userOutput: string,
  fullScore: number
): GradeResult {
  const exp = normalize(payload.expectedOutput);
  const got = normalize(userOutput ?? "");
  const ok = exp === got;
  return {
    correct: ok,
    score: ok ? fullScore : 0,
    details: { expected: exp, actual: got },
  };
}
