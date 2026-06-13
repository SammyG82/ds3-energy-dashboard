interface Props { isForecast: boolean; isDark?: boolean }

export default function ForecastBadge({ isForecast, isDark = false }: Props) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${
      isForecast
        ? isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
        : isDark ? "bg-white/10 text-white/70"      : "bg-slate-100 text-slate-600"
    }`}>
      {isForecast ? "Forecast" : "Historical data"}
    </span>
  );
}
