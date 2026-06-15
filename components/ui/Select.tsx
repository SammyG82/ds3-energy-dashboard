import type { ChangeEvent } from "react";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** Maps an option value to its display label (defaults to identity) */
  displayName?: (option: string) => string;
  /** Stretch the control to fill its container width */
  fullWidth?: boolean;
  isDark?: boolean;
}

/**
 * Styled native <select> with a custom chevron. The visible <label> stays in the caller
 * so it can sit inline or stacked as the layout requires; pass a matching htmlFor={id}.
 */
export default function Select({ id, value, onChange, options, displayName, fullWidth = false, isDark = false }: Props) {
  return (
    <div className={`relative ${fullWidth ? "w-full" : ""}`}>
      <select
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className={`appearance-none text-sm font-semibold border rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 ${fullWidth ? "w-full" : ""} ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-slate-200 text-slate-700"}`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{displayName ? displayName(opt) : opt}</option>
        ))}
      </select>
      <svg className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? "text-white/40" : "text-slate-500"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 6 8 10 12 6" /></svg>
    </div>
  );
}
