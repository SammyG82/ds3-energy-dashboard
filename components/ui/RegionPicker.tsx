"use client";

import { useState, useMemo, useEffect } from "react";

const EUROPE = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Iceland", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg",
  "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Slovakia",
  "Slovenia", "Spain", "Sweden", "Switzerland", "Turkiye", "United Kingdom",
];

export interface PresetItem {
  label: string;
  description: string;
  detail: string;
  regions: string[] | null;
}

const PRESETS: PresetItem[] = [
  {
    label: "Top 5 Markets",
    description: "The five largest EV markets by total sales volume",
    detail: "China, USA, Germany, France, and the United Kingdom were the five largest EV markets in 2023 by total vehicles sold. China alone accounts for over half of all global EV sales.",
    regions: ["China", "USA", "Germany", "France", "United Kingdom"],
  },
  {
    label: "EV Pioneers",
    description: "Countries with the highest EV share of new car sales",
    detail: "Norway, Iceland, Sweden, Denmark, Finland, and the Netherlands have the world's highest EV share of new car sales. Norway leads at ~90%. These countries show what a near-fully transitioned market looks like.",
    regions: ["Norway", "Iceland", "Sweden", "Denmark", "Finland", "Netherlands"],
  },
  {
    label: "Emerging Markets",
    description: "Fast-growing EV adoption in developing economies",
    detail: "India, Indonesia, Thailand, Brazil, and Viet Nam are large developing economies where EV adoption is growing rapidly from a low base — the fastest-moving part of the global transition.",
    regions: ["India", "Indonesia", "Thailand", "Brazil", "Viet Nam"],
  },
  {
    label: "Europe",
    description: "All European countries in the dataset",
    detail: "All 31 European countries in the IEA dataset. Norway stands out despite its small population (~5M) — nearly 90% of new cars sold there are electric, the highest share in the world.",
    regions: EUROPE,
  },
  {
    label: "All Regions",
    description: "Every country and region in the dataset",
    detail: "All 56 countries and regional aggregates in the IEA dataset. Useful for a broad overview, though the chart will be busy.",
    regions: null,
  },
];

interface Props {
  options: string[];
  selected: string[];
  onToggle: (region: string) => void;
  onSelectGroup: (regions: string[]) => void;
  colorMap: Record<string, string>;
  displayNames?: Record<string, string>;
  presets?: PresetItem[];
}

export default function RegionPicker({ options, selected, onToggle, onSelectGroup, colorMap, displayNames = {}, presets = PRESETS }: Props) {
  const dn = (r: string) => displayNames[r] ?? r;
  const [showCustom, setShowCustom] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const activePreset = useMemo(
    () => presets.find((p) => {
        const regions = (p.regions ?? options).filter((r) => options.includes(r));
        return (
          regions.length > 0 &&
          regions.length === selected.length &&
          regions.every((r) => selectedSet.has(r))
        );
      }),
    [presets, options, selected, selectedSet]
  );

  const base = useMemo(
    () => query.trim()
      ? options.filter((r) => r.toLowerCase().includes(query.toLowerCase()))
      : options,
    [options, query]
  );

  const filtered = useMemo(
    () => query.trim()
      ? base
      : [
          ...base.filter((r) => selectedSet.has(r)),
          ...base.filter((r) => !selectedSet.has(r)),
        ],
    [base, selectedSet, query]
  );

  useEffect(() => {
    setQuery("");
  }, [options, showCustom]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <button
              key={preset.label}
              title={preset.description}
              aria-label={preset.label}
              onClick={() => {
                const regions = (preset.regions ?? options).filter((r) => options.includes(r));
                if (regions.length === 0) return;
                onSelectGroup(regions);
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-300 ${
                isActive
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700"
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        <button
          onClick={() => setShowCustom((v) => !v)}
          aria-pressed={showCustom}
          className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-300 ${
            showCustom
              ? "bg-slate-700 text-white border-slate-700"
              : "bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600"
          }`}
        >
          Custom…
        </button>

        <button
          onClick={() => setShowInfo((v) => !v)}
          title="Why these presets?"
          aria-label="Why these presets?"
          aria-pressed={showInfo}
          className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
            showInfo
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white text-slate-400 border-slate-300 hover:border-teal-400 hover:text-teal-600"
          }`}
        >
          ?
        </button>
      </div>

      {showInfo && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Why these groups?</p>
          {presets.map(({ label, detail }) => (
            <div key={label}>
              <p className="text-sm font-semibold text-slate-700 mb-0.5">{label}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      )}

      {showCustom && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search regions…"
            aria-label="Search regions"
            className="w-full pl-3 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />

          <div
            className="border border-slate-200 rounded-lg overflow-y-auto bg-white"
            style={{ maxHeight: 200 }}
          >
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono px-3 py-2">No regions match.</p>
            ) : (
              filtered.map((region) => (
                <label
                  key={region}
                  className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-slate-50 select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(region)}
                    onChange={() => onToggle(region)}
                    className="accent-teal-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-700 flex-1">{dn(region)}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colorMap[region] ?? "#94a3b8" }}
                  />
                </label>
              ))
            )}
          </div>

          <p className="text-xs text-slate-400 font-mono">
            {selected.length} of {options.length} selected
          </p>
        </div>
      )}
    </div>
  );
}
