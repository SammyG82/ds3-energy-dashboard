export interface Badge {
  label: string;
  color?: "teal" | "amber" | "blue";
}

export interface PageHeaderProps {
  title: string;
  titleAccent?: string;
  subtitle: string;
  badges?: Badge[];
  isDark?: boolean;
}

const badgeColors = {
  teal:  "bg-teal-50 text-teal-700 border-teal-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue:  "bg-blue-50 text-blue-700 border-blue-200",
};

const badgeColorsDark = {
  teal:  "bg-teal-900/40 text-teal-400 border-teal-700",
  amber: "bg-amber-900/40 text-amber-400 border-amber-700",
  blue:  "bg-blue-900/40 text-blue-400 border-blue-700",
};

export default function PageHeader({ title, titleAccent, subtitle, badges, isDark = false }: PageHeaderProps) {
  return (
    <div className={`border-b transition-colors duration-300 ${isDark ? "border-white/10 bg-black" : "border-slate-200 bg-slate-50"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            {title}{" "}
            {titleAccent && <span className="text-teal-500">{titleAccent}</span>}
          </h1>
          <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${isDark ? "text-white/60" : "text-slate-500"}`}>{subtitle}</p>
        </div>
        {badges && badges.length > 0 && (
          <div className="flex flex-col gap-1.5 self-end">
            {badges.map(({ label, color = "blue" }) => (
              <span
                key={label}
                className={`text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded border ${isDark ? badgeColorsDark[color] : badgeColors[color]}`}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
