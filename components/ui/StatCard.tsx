export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "teal" | "amber";
  size?: "xl" | "2xl";
}

const accentMap = {
  blue:  "text-blue-600",
  teal:  "text-teal-600",
  amber: "text-amber-600",
};

export default function StatCard({ label, value, sub, accent = "blue", size = "2xl" }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`${size === "xl" ? "text-xl" : "text-2xl leading-none"} font-bold ${accentMap[accent]}`}>{value}</p>
      {sub && <p className={size === "xl" ? "text-xs text-slate-400 mt-0.5" : "text-sm text-slate-500 mt-1"}>{sub}</p>}
    </div>
  );
}
