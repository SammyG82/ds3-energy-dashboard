import * as d3 from "d3";

export const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

export const TOP_5_MARKETS = ["China", "USA", "Germany", "France", "United Kingdom"];

// d3.csv returns "" for empty cells; trim() catches whitespace-only values
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
  if (d.ev_sales == null || d.ev_sales === "") return null;
  const evSales = +d.ev_sales;
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
  return c ?? "";
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
  "EU27": "EU",
};

export const dn = (r: string): string => EV_DISPLAY_NAMES[r] ?? r;

// Raw region keys only — do not call AGGREGATES.has(dn(r))
export const AGGREGATES = new Set(["World", "Rest of the world", "Central and South America", "EU27"]);

export const COUNTRY_COLORS: Record<string, string> = {
  // EV + shared countries — EV palette is canonical
  China: "#e85d04", USA: "#2563eb", Germany: "#7c3aed", India: "#059669",
  Japan: "#0891b2", "United Kingdom": "#db2777", UK: "#db2777", France: "#ca8a04",
  Norway: "#16a34a", Netherlands: "#dc2626", Korea: "#9333ea", Australia: "#0284c7",
  Sweden: "#15803d", Canada: "#b45309", Spain: "#be185d", Brazil: "#0d9488",
  Italy: "#f97316", World: "#64748b", EU27: "#003399",
  // European EV markets not in the canonical shared list
  Belgium: "#4338ca", Denmark: "#0369a1", Finland: "#be123c", Austria: "#5b21b6",
  Switzerland: "#0c4a6e", "Czech Republic": "#78350f", Poland: "#9a3412",
  Ireland: "#064e3b", Portugal: "#1e3a8a",
  // Asian / Oceania / other EV markets
  Thailand: "#c026d3", "Viet Nam": "#65a30d", Malaysia: "#831843",
  "New Zealand": "#713f12", Israel: "#525252", Turkiye: "#6366f1",
  // Lower-ranked EV markets — visible when top countries are excluded
  Bulgaria: "#a78bfa", Chile: "#38bdf8", Colombia: "#fbbf24",
  "Costa Rica": "#84cc16", Croatia: "#f43f5e", Cyprus: "#fb923c",
  Estonia: "#67e8f9", Greece: "#3b82f6", Hungary: "#e11d48",
  Iceland: "#93c5fd", Latvia: "#881337", Lithuania: "#a3e635",
  Luxembourg: "#a855f7", Romania: "#3730a3", Seychelles: "#2dd4bf",
  Slovakia: "#2d6bc4", Slovenia: "#115e59", "South Africa": "#4ade80",
  Uzbekistan: "#5eead4", "Central and South America": "#10b981",
  "Rest of the world": "#94a3b8",
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
  return raw
    .filter((item): item is Parameters<typeof normalizeEvRow>[0] => item !== null && typeof item === "object")
    .map(normalizeEvRow)
    .filter((r): r is EvRow => r !== null && r.region_country !== "" && r.year > 1900);
}

// IEA missing-data entries arrive as 0.0 (not NaN) for net trade and exports — set
// filterZeroHistorical=true for those datasets to avoid misleading chart drops.
function createOilFetcher(
  filename: string,
  valKey: string,
  ciLowKey: string,
  ciHighKey: string,
  filterZeroHistorical = false
): () => Promise<OilRow[]> {
  return async () => {
    const raw = await d3.csv(`${BASE}/data/${filename}`);
    return raw
      .flatMap((d) => {
        const Type = assertOilType(d.Type);
        if (!Type) return [];
        const rawVal = d[valKey];
        if (rawVal === undefined || rawVal === "") return [];
        const value = +rawVal;
        if (!Number.isFinite(value)) return [];
        const Year = +(d.Year ?? 0);
        if (!Number.isFinite(Year)) return [];
        return [{
          Country: normalizeOilCountry(d.Country),
          Year,
          Type,
          value,
          ciLow: parseCI(d[ciLowKey]),
          ciHigh: parseCI(d[ciHighKey]),
        }];
      })
      .filter((row) =>
        row.Year > 1900 &&
        row.Country !== "" &&
        !(filterZeroHistorical && row.value === 0 && row.Type === "Historical")
      );
  };
}

export const fetchOilForecast = createOilFetcher(
  "oil_forecast.csv", "Oil Imports (KBD)", "CI Low (KBD)", "CI High (KBD)"
);
export const fetchNetTrade = createOilFetcher(
  "net_trade_forecast.csv", "Net_Trade", "Net_CI_Low", "Net_CI_High", true
);
export const fetchOilExports = createOilFetcher(
  "exports.csv", "Value", "Lower_CI", "Upper_CI", true
);

export async function fetchGdpMeta(): Promise<GdpMeta[]> {
  const raw = await d3.json<unknown[]>(`${BASE}/data/gdp_country_meta.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid GDP metadata");
  return raw.map((item, idx) => {
    if (item === null || typeof item !== "object") {
      throw new Error(`Invalid GDP metadata at row ${idx}`);
    }
    const obj = item as Record<string, unknown>;
    if (
      typeof obj.country !== "string" ||
      !obj.country.trim() ||
      typeof obj.region !== "string" ||
      !obj.region.trim() ||
      !Number.isFinite(obj.gdp) ||
      !Number.isFinite(obj.oilImports) ||
      !Number.isFinite(obj.costPerBarrel)
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

const isNullableNum = (v: unknown): v is number | null => v === null || (typeof v === "number" && Number.isFinite(v));

export async function fetchOilPrices(): Promise<OilPriceRow[]> {
  const raw = await d3.json<unknown[]>(`${BASE}/data/oil_prices.json`);
  if (!Array.isArray(raw)) throw new Error("Invalid oil price data");
  return raw.map((item, idx) => {
    if (item === null || typeof item !== "object") throw new Error(`Invalid oil price data at row ${idx}`);
    const r = item as Record<string, unknown>;
    if (
      typeof r.year !== "number" || !Number.isFinite(r.year) || r.year <= 1900 ||
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
