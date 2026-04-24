export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "purple" | "orange";
}) {
  const accentMap = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
  };
  const valueClass = accent ? accentMap[accent] : "text-zinc-900 dark:text-zinc-100";

  return (
    <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-sm transition-shadow">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
    </div>
  );
}
