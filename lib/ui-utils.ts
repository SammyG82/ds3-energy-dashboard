import { useState, useEffect, useRef, type RefObject } from "react";
import type { CSSProperties } from "react";

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export function tooltipStyle(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  clampN: number
): CSSProperties {
  return {
    position: 'absolute' as const,
    left: x < containerWidth * 0.6 ? x + 14 : undefined,
    right: x >= containerWidth * 0.6 ? containerWidth - x + 14 : undefined,
    top: Math.max(4, Math.min(y - 10, containerHeight - clampN)),
  };
}

const THRESHOLD_COLORS = [
  { color: "#16a34a", bg: "bg-green-100", text: "text-green-700" },
  { color: "#d97706", bg: "bg-amber-100", text: "text-amber-700" },
  { color: "#dc2626", bg: "bg-red-100", text: "text-red-700" },
];

export function thresholdRating(
  value: number,
  thresholds: [number, number],
  labels: [string, string, string]
): { label: string; color: string; bg: string; text: string } {
  const i = value < thresholds[0] ? 0 : value < thresholds[1] ? 1 : 2;
  return { label: labels[i], ...THRESHOLD_COLORS[i] };
}

export function toggleSelection(prev: string[], item: string, min = 1): string[] {
  return prev.includes(item)
    ? prev.length > min ? prev.filter((x) => x !== item) : prev
    : [...prev, item];
}

type HGridScale = ((v: number) => number) & { ticks: (count: number) => number[] };

export function drawHorizontalGridLines(
  g: { selectAll(sel: string): any },
  yScale: HGridScale,
  width: number,
  tickCount = 5
): void {
  g.selectAll(".grid-h")
    .data(yScale.ticks(tickCount))
    .enter().append("line")
    .attr("x1", 0).attr("x2", width)
    .attr("y1", (d: number) => yScale(d)).attr("y2", (d: number) => yScale(d))
    .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);
}

export function useDataFetch<T>(fn: () => Promise<T>, initial: T): { data: T; error: string | null } {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let mounted = true;
    fnRef.current().then((result) => {
      if (mounted) setData(result);
    }).catch((err) => {
      if (mounted) { if (process.env.NODE_ENV === "development") console.error(err); setError("Failed to load data."); }
    });
    return () => { mounted = false; };
  }, []);
  return { data, error };
}

export function useContainerSize(ref: RefObject<Element | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    let tid: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver((entries) => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        const { width, height } = entries[0].contentRect;
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }, 150);
    });
    obs.observe(ref.current);
    return () => { clearTimeout(tid); obs.disconnect(); };
  }, [ref]);
  return size;
}
