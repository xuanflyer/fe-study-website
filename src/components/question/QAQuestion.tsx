"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function QAQuestion({ value, onChange, disabled, placeholder }: Props) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder ?? "请输入你的回答"}
      rows={8}
      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 focus:border-blue-500 outline-none disabled:opacity-60 font-mono text-sm"
    />
  );
}
