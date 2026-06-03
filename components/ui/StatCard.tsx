export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "teal" | "amber";
  size?: "xl" | "2xl";
  isDark?: boolean;
}

const accentMap = {
  blue:  { light: "text-blue-600",  dark: "text-blue-400" },
  teal:  { light: "text-teal-600",  dark: "text-teal-400" },
  amber: { light: "text-amber-600", dark: "text-amber-400" },
};

export default function StatCard({ label, value, sub, accent = "blue", size = "2xl", isDark = false }: StatCardProps) {
  return (
    <div className={`rounded-xl p-4 border transition-colors ${isDark ? "bg-white/10 border-white/10 hover:border-white/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-white/40" : "text-slate-400"}`}>{label}</p>
      <p className={`${size === "xl" ? "text-base sm:text-xl" : "text-xl sm:text-2xl"} leading-none font-bold break-words ${accentMap[accent][isDark ? "dark" : "light"]}`}>{value}</p>
      {sub && <p className={`mt-1 ${size === "xl" ? "text-xs" : "text-sm"} ${isDark ? "text-white/50" : "text-slate-600"}`}>{sub}</p>}
    </div>
  );
}
