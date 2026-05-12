import * as d3 from "d3";

const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

// d3.csv returns "" for empty cells (not null/undefined), so both checks are required
function parseCI(value: string | undefined): number | null {
  return value != null && value !== "" ? +value : null;
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
};

export function fmtEvSales(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${Math.round(v)}`;
}

export async function fetchEvSales(): Promise<EvRow[]> {
  const raw = await d3.csv(`${BASE}/data/ev_sales.csv`);
  return raw.map((d) => ({
    region_country: d.region_country ?? "",
    year: +(d.year ?? 0),
    ev_sales: +(d.ev_sales ?? 0),
    type: d.type ?? "",
  }));
}

export async function fetchEvData(): Promise<EvRow[]> {
  const raw = (await d3.json<Array<{ region_country: string; year: number; ev_sales: number; type: string }>>(`${BASE}/data/ev_data.json`)) ?? [];
  return raw.map((d) => ({
    region_country: d.region_country ?? "",
    year: +(d.year ?? 0),
    ev_sales: +(d.ev_sales ?? 0),
    type: d.type ?? "",
  }));
}

export async function fetchOilForecast(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/oil_forecast.csv`);
  return raw.map((d) => ({
    Country: d.Country === "Usa" ? "USA" : (d.Country ?? ""),
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
  return raw
    .filter((d) => +d.year === 2024 && d.state?.length === 2 && d.state !== "US")
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
    Country: d.Country === "Usa" ? "USA" : (d.Country ?? ""),
    Year: +(d.Year ?? 0),
    Type: d.Type ?? "",
    value: +(d["Value"] ?? 0),
    ciLow: parseCI(d["Lower_CI"]),
    ciHigh: parseCI(d["Upper_CI"]),
  }));
}

export async function fetchGdpMeta(): Promise<GdpMeta[]> {
  const raw = await d3.json<GdpMeta[]>(`${BASE}/data/gdp_country_meta.json`);
  return raw ?? [];
}
