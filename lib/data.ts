import * as d3 from "d3";

export const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

// d3.csv returns "" for empty cells (not null/undefined), so both checks are required
function parseCI(value: string | undefined): number | null {
  if (value === undefined || value === "" || value.trim() === "") return null;
  const n = +value;
  return Number.isFinite(n) ? n : null;
}

export interface EvRow {
  region_country: string;
  year: number;
  ev_sales: number;
  type: "Actual" | "Forecast";
}

export interface OilRow {
  Country: string;
  Year: number;
  Type: "Historical" | "Forecast";
  value: number;
  ciLow: number | null;
  ciHigh: number | null;
}

function normalizeEvRow(d: { region_country?: unknown; year?: unknown; ev_sales?: unknown; type?: unknown }): EvRow | null {
  const type = String(d.type ?? "");
  if (type !== "Actual" && type !== "Forecast") return null;
  const evSales = +(d.ev_sales ?? 0);
  if (!Number.isFinite(evSales)) return null;
  const year = +(d.year ?? 0);
  if (!Number.isFinite(year)) return null;
  return {
    region_country: String(d.region_country ?? ""),
    year,
    ev_sales: evSales,
    type,
  };
}

function assertOilType(t: string | undefined): OilRow["Type"] | null {
  const v = t ?? "";
  return v === "Historical" || v === "Forecast" ? v : null;
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

// Raw region keys only — do not call AGGREGATES.has(dn(r))
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
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
}

export async function fetchEvSales(): Promise<EvRow[]> {
  const raw = await d3.csv(`${BASE}/data/ev_sales.csv`);
  return raw.map(normalizeEvRow).filter((r): r is EvRow => r !== null && r.region_country !== "" && r.year > 1900);
}

export async function fetchEvData(): Promise<EvRow[]> {
  const raw = await d3.json<unknown[]>(`${BASE}/data/ev_data.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid EV data");
  return (raw as Parameters<typeof normalizeEvRow>[0][])
    .map(normalizeEvRow)
    .filter((r): r is EvRow => r !== null && r.region_country !== "" && r.year > 1900);
}

export async function fetchOilForecast(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/oil_forecast.csv`);
  return raw
    .flatMap((d) => {
      const Type = assertOilType(d.Type);
      if (!Type) return [];
      const value = +(d["Oil Imports (KBD)"] ?? 0);
      return [{
        Country: normalizeOilCountry(d.Country),
        Year: +(d.Year ?? 0),
        Type,
        value: Number.isFinite(value) ? value : 0,
        ciLow: parseCI(d["CI Low (KBD)"]),
        ciHigh: parseCI(d["CI High (KBD)"]),
      }];
    })
    .filter((row) => row.Year > 1900 && row.Country !== "");
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
    .flatMap((d) => {
      const Type = assertOilType(d.Type);
      if (!Type) return [];
      const value = +(d["Net_Trade"] ?? 0);
      return [{
        Country: NET_TRADE_NAMES[d.Country ?? ""] ?? d.Country ?? "",
        Year: +(d.Year ?? 0),
        Type,
        value: Number.isFinite(value) ? value : 0,
        ciLow: parseCI(d["Net_CI_Low"]),
        ciHigh: parseCI(d["Net_CI_High"]),
      }];
    })
    // IEA missing-2024 entries arrive as 0.0, not NaN — filter to avoid misleading chart drops
    .filter((row) => row.Country !== "" && row.Year > 1900 && !(row.value === 0 && row.Type === "Historical"));
}

export async function fetchOilExports(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/exports.csv`);
  return raw
    .flatMap((d) => {
      const Type = assertOilType(d.Type);
      if (!Type) return [];
      const value = +(d["Value"] ?? 0);
      return [{
        Country: normalizeOilCountry(d.Country),
        Year: +(d.Year ?? 0),
        Type,
        value: Number.isFinite(value) ? value : 0,
        ciLow: parseCI(d["Lower_CI"]),
        ciHigh: parseCI(d["Upper_CI"]),
      }];
    })
    .filter((row) => row.Year > 1900 && row.Country !== "");
}

export async function fetchGdpMeta(): Promise<GdpMeta[]> {
  const raw = await d3.json<unknown[]>(`${BASE}/data/gdp_country_meta.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid GDP metadata");
  return raw.map((item, idx) => {
    if (
      typeof (item as GdpMeta).country !== "string" ||
      typeof (item as GdpMeta).region !== "string" ||
      typeof (item as GdpMeta).gdp !== "number" ||
      typeof (item as GdpMeta).oilImports !== "number" ||
      typeof (item as GdpMeta).costPerBarrel !== "number"
    ) {
      throw new Error(`Invalid GDP metadata at row ${idx}`);
    }
    return item as GdpMeta;
  });
}

export interface OilPriceRow {
  year: number;
  brent_nominal: number | null;
  wti_nominal: number | null;
  brent_real: number | null;
  wti_real: number | null;
}

export async function fetchOilPrices(): Promise<OilPriceRow[]> {
  const raw = await d3.json<unknown[]>(`${BASE}/data/oil_prices.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid oil price data");
  const isNullableNum = (v: unknown) => v === null || typeof v === "number";
  return raw.map((item, idx) => {
    const r = item as Record<string, unknown>;
    if (
      typeof r.year !== "number" ||
      !isNullableNum(r.brent_nominal) ||
      !isNullableNum(r.wti_nominal) ||
      !isNullableNum(r.brent_real) ||
      !isNullableNum(r.wti_real)
    ) {
      throw new Error(`Invalid oil price data at row ${idx}`);
    }
    return item as OilPriceRow;
  });
}
