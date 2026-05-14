import * as d3 from "d3";

const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

// d3.csv returns "" for empty cells (not null/undefined), so both checks are required
function parseCI(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = +value;
  return Number.isFinite(n) ? n : null;
}

export interface EvRow {
  region_country: string;
  year: number;
  ev_sales: number;
  type: string;
}

export interface OilRow {
  Country: string;
  Year: number;
  Type: string;
  value: number;
  ciLow: number | null;
  ciHigh: number | null;
}

function normalizeEvRow(d: { region_country?: unknown; year?: unknown; ev_sales?: unknown; type?: unknown }): EvRow {
  return {
    region_country: String(d.region_country ?? ""),
    year: +(d.year ?? 0),
    ev_sales: +(d.ev_sales ?? 0),
    type: String(d.type ?? ""),
  };
}

function normalizeOilCountry(c: string | undefined): string {
  return c === "Usa" ? "USA" : (c ?? "");
}

export interface GdpMeta {
  country: string;
  region: string;
  gdp: number;
  oilImports: number;
  costPerBarrel: number;
}

export const EV_DISPLAY_NAMES: Record<string, string> = {
  "Korea": "South Korea",
  "Viet Nam": "Vietnam",
  "World": "Global Total",
  "Rest of the world": "Other Countries",
  "United Kingdom": "UK",
};

export const dn = (r: string): string => EV_DISPLAY_NAMES[r] ?? r;

export const AGGREGATES = new Set(["World", "Rest of the world", "Central and South America"]);

export const COUNTRY_COLORS: Record<string, string> = {
  // EV + shared countries — EV palette is canonical
  China: "#e85d04", USA: "#2563eb", Germany: "#7c3aed", India: "#059669",
  Japan: "#0891b2", "United Kingdom": "#db2777", UK: "#db2777", France: "#ca8a04",
  Norway: "#16a34a", Netherlands: "#dc2626", Korea: "#9333ea", Australia: "#0284c7",
  Sweden: "#15803d", Canada: "#b45309", Spain: "#be185d", Brazil: "#0d9488",
  Italy: "#f97316", World: "#64748b",
  // European EV markets not in the canonical shared list
  Belgium: "#4338ca", Denmark: "#0369a1", Finland: "#be123c", Austria: "#5b21b6",
  Switzerland: "#0c4a6e", "Czech Republic": "#78350f", Poland: "#9a3412",
  Ireland: "#064e3b", Portugal: "#1e3a8a",
  // Asian / Oceania / other EV markets
  Thailand: "#c026d3", "Viet Nam": "#65a30d", Malaysia: "#831843",
  "New Zealand": "#713f12", Israel: "#525252", Turkiye: "#6366f1",
  // Oil-only — no EV conflict
  UAE: "#1d4ed8", Kuwait: "#d97706", Iran: "#7c2d12", Qatar: "#0f766e",
  Nigeria: "#166534", Algeria: "#92400e", Angola: "#c2410c", Indonesia: "#4d7c0f",
  Libya: "#1e3a5f", Venezuela: "#7f1d1d", Kazakhstan: "#a16207",
  // Oil-only — color changed to avoid collision with EV canonical colors
  Mexico: "#f59e0b",       // was #ca8a04 = France
  Singapore: "#06b6d4",    // was #0284c7 = Australia
  "Saudi Arabia": "#854d0e", // was #b45309 = Canada
  Russia: "#991b1b",       // was #dc2626 = Netherlands
  Iraq: "#86198f",         // was #be185d = Spain
};

export function fmtEvSales(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) {
    const k = Math.round(v / 1_000);
    return k >= 1_000 ? `${(k / 1_000).toFixed(1)}M` : `${k}k`;
  }
  return `${Math.round(v)}`;
}

export async function fetchEvSales(): Promise<EvRow[]> {
  const raw = await d3.csv(`${BASE}/data/ev_sales.csv`);
  return raw.map(normalizeEvRow);
}

export async function fetchEvData(): Promise<EvRow[]> {
  const raw = await d3.json<EvRow[]>(`${BASE}/data/ev_data.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid EV data");
  return raw.map(normalizeEvRow);
}

export async function fetchOilForecast(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/oil_forecast.csv`);
  return raw.map((d) => ({
    Country: normalizeOilCountry(d.Country),
    Year: +(d.Year ?? 0),
    Type: d.Type ?? "",
    value: +(d["Oil Imports (KBD)"] ?? 0),
    ciLow: parseCI(d["CI Low (KBD)"]),
    ciHigh: parseCI(d["CI High (KBD)"]),
  }));
}

export interface EnergyAccessRow {
  state: string;
  year: number;
  saidi: number;
  saifi: number;
  energy_burden_pct: number;
  avg_price_cents_kwh: number;
  est_annual_bill: number | null;
  median_income_2024: number | null;
  avg_customers: number | null;
}

export interface TargetRow {
  country_code: string;
  country_name: string;
  capacity_target_gw: number;
  share_target_pct: number | null;
}

export async function fetchEnergyAccess(): Promise<EnergyAccessRow[]> {
  const raw = await d3.csv(`${BASE}/data/energy_access_with_burden.csv`);
  const latestYear = d3.max(raw, (d) => +(d.year ?? 0)) ?? 2024;
  return raw
    .filter((d) => +d.year === latestYear && d.state?.length === 2 && d.state !== "US" && d.state !== "DC")
    .map((d) => ({
      state: d.state,
      year: +d.year,
      saidi: +(d.saidi ?? 0),
      saifi: +(d.saifi ?? 0),
      energy_burden_pct: +(d.energy_burden_pct ?? 0),
      avg_price_cents_kwh: +(d.avg_price_cents_kwh ?? 0),
      est_annual_bill: parseCI(d.est_annual_bill),
      median_income_2024: parseCI(d.median_income_2024),
      avg_customers: parseCI(d.avg_customers),
    }));
}

export async function fetchTargets(): Promise<TargetRow[]> {
  const raw = await d3.csv(`${BASE}/data/merged_targets_clean.csv`);
  return raw
    .filter((d) => +d.capacity_target_gw > 0 && d.country_code !== "EU")
    .map((d) => ({
      country_code: d.country_code ?? "",
      country_name: d.country_name ?? "",
      capacity_target_gw: +d.capacity_target_gw,
      share_target_pct: d.share_target_pct ? +d.share_target_pct : null,
    }));
}

const NET_TRADE_NAMES: Record<string, string> = {
  Usa: "USA",
  Saudiarab: "Saudi Arabia",
  Uae: "UAE",
  Kazakhsta: "Kazakhstan",
};

export async function fetchNetTrade(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/net_trade_forecast.csv`);
  return raw
    .map((d) => ({
      Country: NET_TRADE_NAMES[d.Country ?? ""] ?? d.Country ?? "",
      Year: +(d.Year ?? 0),
      Type: d.Type ?? "",
      value: +(d["Net_Trade"] ?? 0),
      ciLow: parseCI(d["Net_CI_Low"]),
      ciHigh: parseCI(d["Net_CI_High"]),
    }))
    .filter((row) => !(row.value === 0 && row.Type === "Historical"));
}

export async function fetchOilExports(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/exports.csv`);
  return raw.map((d) => ({
    Country: normalizeOilCountry(d.Country),
    Year: +(d.Year ?? 0),
    Type: d.Type ?? "",
    value: +(d["Value"] ?? 0),
    ciLow: parseCI(d["Lower_CI"]),
    ciHigh: parseCI(d["Upper_CI"]),
  }));
}

export async function fetchGdpMeta(): Promise<GdpMeta[]> {
  const raw = await d3.json<GdpMeta[]>(`${BASE}/data/gdp_country_meta.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid GDP metadata");
  return raw;
}
