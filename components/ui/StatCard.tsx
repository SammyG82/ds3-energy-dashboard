interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "teal" | "amber";
}

const accentMap = {
  blue:  "text-blue-600",
  teal:  "text-teal-600",
  amber: "text-amber-600",
};

export default function StatCard({ label, value, sub, accent = "blue" }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold leading-none ${accentMap[accent]}`}>{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
