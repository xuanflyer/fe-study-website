"use client";

import type { ChoicePayload } from "@/lib/types";

interface Props {
  payload: ChoicePayload;
  multi: boolean;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  showCorrect?: boolean;
}

export function ChoiceQuestion({ payload, multi, value, onChange, disabled, showCorrect }: Props) {
  function toggle(id: string) {
    if (disabled) return;
    if (multi) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange([id]);
    }
  }

  return (
    <div className="space-y-2">
      {payload.options.map((opt) => {
        const selected = value.includes(opt.id);
        const isCorrect = payload.answer.includes(opt.id);
        let cls =
          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-blue-400";
        if (selected && !showCorrect) cls += " border-blue-500 bg-blue-50 dark:bg-blue-950/30";
        if (showCorrect) {
          if (isCorrect) cls += " border-green-500 bg-green-50 dark:bg-green-950/30";
          else if (selected) cls += " border-red-500 bg-red-50 dark:bg-red-950/30";
        }
        return (
          <label key={opt.id} className={cls}>
            <input
              type={multi ? "checkbox" : "radio"}
              name="choice"
              checked={selected}
              onChange={() => toggle(opt.id)}
              disabled={disabled}
              className="mt-1"
            />
            <span>
              <span className="font-mono mr-2">{opt.id}.</span>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
