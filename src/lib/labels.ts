export const TYPE_LABEL: Record<string, string> = {
  SINGLE: "单选",
  MULTI: "多选",
  FILL: "填空",
  CODING: "编程",
  PRINT: "打印结果",
  QA: "问答",
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "简单",
  MEDIUM: "中等",
  HARD: "困难",
};

export const DIFFICULTY_CLASS: Record<string, string> = {
  EASY: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  HARD: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
