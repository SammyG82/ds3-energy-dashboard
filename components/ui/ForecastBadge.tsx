interface Props { isForecast: boolean }

export default function ForecastBadge({ isForecast }: Props) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono whitespace-nowrap ${isForecast ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
      {isForecast ? "Projected forecast" : "Historical data"}
    </span>
  );
}
