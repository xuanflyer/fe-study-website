export type QuestionType =
  | "SINGLE"
  | "MULTI"
  | "FILL"
  | "CODING"
  | "PRINT"
  | "QA";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface ChoicePayload {
  options: ChoiceOption[];
  answer: string[];
}

export interface FillPayload {
  answers: string[];
  caseSensitive?: boolean;
}

export interface CodingTest {
  name: string;
  input: unknown[];
  expected: unknown;
}

export interface CodingPayload {
  language: "js" | "ts";
  entryFn: string;
  starterCode: string;
  tests: CodingTest[];
}

export interface PrintPayload {
  language: "js" | "ts";
  starterCode: string;
  expectedOutput: string;
}

export interface QAPayload {
  referenceAnswer: string;
  keywords: string[];
}

export type QuestionPayload =
  | { type: "SINGLE"; data: ChoicePayload }
  | { type: "MULTI"; data: ChoicePayload }
  | { type: "FILL"; data: FillPayload }
  | { type: "CODING"; data: CodingPayload }
  | { type: "PRINT"; data: PrintPayload }
  | { type: "QA"; data: QAPayload };

export interface TestCaseResult {
  name: string;
  passed: boolean;
  expected: unknown;
  actual?: unknown;
  error?: string;
}

export interface GradeResult {
  correct: boolean;
  score: number;
  details: Record<string, unknown>;
}

export type Feedback = "LEARNED" | "SKIP" | "STAR";
