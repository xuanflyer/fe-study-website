import type { GradeResult, TestCaseResult } from "@/lib/types";

// Coding 题：客户端 WebContainer 跑完之后把 TestCaseResult[] 回传给服务端，
// 服务端不重新执行代码，只校验结果并算分。
export function gradeCoding(
  results: TestCaseResult[],
  fullScore: number
): GradeResult {
  const total = results.length;
  if (total === 0) return { correct: false, score: 0, details: { results } };
  const passed = results.filter((r) => r.passed).length;
  const score = Math.round((passed / total) * fullScore);
  return {
    correct: passed === total,
    score,
    details: { results, passed, total },
  };
}
