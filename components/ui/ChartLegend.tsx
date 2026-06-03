import { FORECAST_DASH } from "@/lib/ui-utils";

interface Props {
  isDark: boolean;
  forecastLabel?: string;
  showCI?: boolean;
}

export default function ChartLegend({ isDark, forecastLabel = "Forecast", showCI = false }: Props) {
  return (
    <div aria-label="Chart legend" className={`flex justify-end text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="block w-4 h-[1.5px] rounded-full bg-current" aria-hidden="true" />
          Historical
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="3" viewBox="0 0 16 3" className="shrink-0" aria-hidden="true">
            <line x1="0" y1="1.5" x2="16" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray={FORECAST_DASH} strokeLinecap="round" />
          </svg>
          {forecastLabel}
        </span>
        {showCI && (
          <span className="flex items-center gap-1.5">
            <span className="block w-4 h-2.5 rounded-sm bg-current opacity-20" aria-hidden="true" />
            95% CI
          </span>
        )}
      </div>
    </div>
  );
}
