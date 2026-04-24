"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Props {
  value: string;
  onChange: (v: string) => void;
  language?: string;
  height?: number | string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language = "javascript", height = 320, readOnly }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border dark:border-zinc-800">
      <MonacoEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        language={language}
        theme="vs-dark"
        height={height}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          readOnly,
          tabSize: 2,
        }}
      />
    </div>
  );
}
