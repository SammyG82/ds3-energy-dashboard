export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "teal" | "amber";
  size?: "xl" | "2xl";
  isDark?: boolean;
}

const accentMap = {
  blue:  "text-blue-500",
  teal:  "text-teal-500",
  amber: "text-amber-500",
};

export default function StatCard({ label, value, sub, accent = "blue", size = "2xl", isDark = false }: StatCardProps) {
  return (
    <div className={`rounded-xl p-4 border transition-colors ${isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-white/40" : "text-slate-400"}`}>{label}</p>
      <p className={`${size === "xl" ? "text-xl" : "text-2xl leading-none"} font-bold break-words ${accentMap[accent]}`}>{value}</p>
      {sub && <p className={`mt-1 ${size === "xl" ? "text-xs" : "text-sm"} ${isDark ? "text-white/50" : "text-slate-500"}`}>{sub}</p>}
    </div>
  );
}
