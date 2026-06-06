"use client";

import { useState, useMemo, useEffect, useRef, useId } from "react";
import { TOP_5_MARKETS } from "@/lib/data";
import type { PresetItem } from "@/lib/data";

const EUROPE = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Iceland", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg",
  "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Slovakia",
  "Slovenia", "Spain", "Sweden", "Switzerland", "Turkiye", "United Kingdom",
];

export type { PresetItem } from "@/lib/data";

const PRESETS: PresetItem[] = [
  {
    label: "Top 5 Markets",
    description: "The five largest EV markets by total sales volume",
    detail: "China, USA, Germany, France, and the United Kingdom were the five largest EV markets in 2023 by total vehicles sold. China alone accounts for over half of all global EV sales.",
    regions: TOP_5_MARKETS,
  },
  {
    label: "EV Pioneers",
    description: "Countries with the highest EV share of new car sales",
    detail: "Norway, Iceland, Sweden, Denmark, Finland, and the Netherlands have some of the world's highest EV shares of new car sales. Norway leads at ~90%. These countries show what a near-fully transitioned market looks like.",
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
  /** Must be a stable module-level constant — inline object literals cause unnecessary recomputation. */
  displayNames?: Record<string, string>;
  presets?: PresetItem[];
  isDark?: boolean;
}

export default function RegionPicker({ options, selected, onToggle, onSelectGroup, colorMap, displayNames = {}, presets = PRESETS, isDark = false }: Props) {
  const uid = useId();
  const dn = (r: string) => displayNames[r] ?? r;
  const [showCustom, setShowCustom] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [query, setQuery] = useState("");
  const customBtnRef = useRef<HTMLButtonElement>(null);
  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCustom) searchInputRef.current?.focus();
  }, [showCustom]);

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

  const base = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (r) => r.toLowerCase().includes(q) || dn(r).toLowerCase().includes(q)
    );
  }, [options, query, displayNames]);

  const filtered = useMemo(() => {
    if (query.trim()) return base;
    return [
      ...base.filter((r) => selectedSet.has(r)),
      ...base.filter((r) => !selectedSet.has(r)),
    ];
  }, [base, query, selectedSet]);

  useEffect(() => {
    setQuery("");
  }, [options]);

  useEffect(() => { if (!showCustom) setQuery(""); }, [showCustom]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <button
              type="button"
              key={preset.label}
              title={preset.description}
              aria-label={preset.label}
              aria-pressed={isActive}
              onClick={() => {
                const regions = (preset.regions ?? options).filter((r) => options.includes(r));
                if (regions.length === 0) return;
                onSelectGroup(regions);
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                isActive
                  ? "bg-teal-600 text-white border-teal-600"
                  : isDark
                    ? "bg-slate-800 text-slate-300 border-white/10 hover:border-teal-400 hover:text-teal-400"
                    : "bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700"
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        <button
          type="button"
          ref={customBtnRef}
          onClick={() => setShowCustom((v) => !v)}
          aria-label="Select custom regions"
          aria-expanded={showCustom}
          aria-controls={`${uid}-custom`}
          className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 ${
            showCustom
              ? "bg-slate-700 text-white border-slate-700"
              : isDark
                ? "bg-slate-800 text-slate-400 border-white/10 hover:border-slate-400 hover:text-slate-300"
                : "bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600"
          }`}
        >
          Custom…
        </button>

        <button
          type="button"
          ref={infoBtnRef}
          onClick={() => setShowInfo((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Escape" && showInfo) { e.preventDefault(); setShowInfo(false); infoBtnRef.current?.focus(); } }}
          aria-label="Why these groups?"
          aria-expanded={showInfo}
          aria-controls={`${uid}-info`}
          className={`w-11 h-11 md:w-8 md:h-8 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 ${
            showInfo
              ? "bg-teal-600 text-white border-teal-600"
              : isDark
                ? "bg-slate-800 text-slate-400 border-white/10 hover:border-teal-400 hover:text-teal-400"
                : "bg-white text-slate-400 border-slate-300 hover:border-teal-400 hover:text-teal-600"
          }`}
        >
          ?
        </button>
      </div>

      {showInfo && (
        <div id={`${uid}-info`} role="region" aria-label="Why these groups?" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setShowInfo(false); infoBtnRef.current?.focus(); } }} className={`border rounded-xl p-4 flex flex-col gap-3 ${isDark ? "bg-white/10 border-white/10" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-xs uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Why these groups?</p>
          {presets.map(({ label, detail }) => (
            <div key={label}>
              <p className={`text-sm font-semibold mb-0.5 ${isDark ? "text-white" : "text-slate-700"}`}>{label}</p>
              <p className={`text-sm leading-relaxed ${isDark ? "text-white/60" : "text-slate-500"}`}>{detail}</p>
            </div>
          ))}
        </div>
      )}

      {showCustom && (
        <div id={`${uid}-custom`} className="flex flex-col gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setShowCustom(false); customBtnRef.current?.focus(); } }}
            placeholder="Search regions…"
            aria-label="Search countries and regions"
            className={`w-full pl-3 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDark ? "bg-slate-800 border-white/10 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-700 placeholder-slate-400"}`}
          />

          <div
            ref={listRef}
            className={`border rounded-lg overflow-y-auto pb-1.5 ${isDark ? "border-white/10 bg-white/10" : "border-slate-200 bg-white"}`}
            style={{ maxHeight: "clamp(150px, 40vh, 250px)" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); setShowCustom(false); customBtnRef.current?.focus(); return; }
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
              e.preventDefault();
              const checks = Array.from(listRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]") ?? []);
              if (checks.length === 0) return;
              const idx = checks.indexOf(document.activeElement as HTMLInputElement);
              let next: HTMLInputElement | undefined;
              if (e.key === "ArrowDown") next = checks[idx + 1] ?? checks[0];
              else if (e.key === "ArrowUp") next = checks[idx - 1] ?? checks[checks.length - 1];
              else if (e.key === "Home") next = checks[0];
              else next = checks[checks.length - 1];
              next?.focus();
              next?.closest("label")?.scrollIntoView({ block: "nearest" });
            }}
          >
            {filtered.length === 0 ? (
              <p role="status" className={`text-xs px-3 py-2 ${isDark ? "text-white/40" : "text-slate-400"}`}>No regions match.</p>
            ) : (
              filtered.map((region) => (
                <label
                  key={region}
                  className={`flex items-center gap-2.5 px-3 py-1.5 min-h-11 cursor-pointer select-none rounded focus-within:ring-2 ${isDark ? "hover:bg-white/5 focus-within:ring-slate-400" : "hover:bg-slate-50 focus-within:ring-slate-500"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(region)}
                    onChange={() => onToggle(region)}
                    className="w-3.5 h-3.5 shrink-0 focus:outline-none rounded"
                  />
                  <span className={`text-sm flex-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{dn(region)}</span>
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorMap[region] ?? "#94a3b8" }}
                  />
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Always in the DOM so the live region is registered before the first announcement */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className={`text-xs ${!showCustom ? "sr-only" : ""} ${isDark ? "text-white/40" : "text-slate-400"}`}
      >
        {showCustom ? `${selected.length} of ${options.length} selected` : ""}
      </p>
    </div>
  );
}
