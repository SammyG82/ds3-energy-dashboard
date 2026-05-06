"use client";

interface ChipFilterProps {
  options: string[];
  selected: Set<string>;
  onToggle: (option: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  colorMap?: Record<string, string>;
}

export default function ChipFilter({
  options,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  colorMap = {},
}: ChipFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {onSelectAll && (
        <button
          onClick={onSelectAll}
          className="text-xs font-mono px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 transition-colors"
        >
          All
        </button>
      )}
      {onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs font-mono px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 transition-colors"
        >
          Clear
        </button>
      )}
      {options.map((opt) => {
        const active = selected.has(opt);
        const color = colorMap[opt] ?? "#2563eb";
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
              active
                ? "text-white border-transparent"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
            style={active ? { backgroundColor: color, borderColor: color } : {}}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
