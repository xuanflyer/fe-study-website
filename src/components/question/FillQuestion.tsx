"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function FillQuestion({ value, onChange, disabled }: Props) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="请输入答案"
      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 focus:border-blue-500 outline-none disabled:opacity-60"
    />
  );
}
