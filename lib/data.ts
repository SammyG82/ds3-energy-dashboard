import * as d3 from "d3";

const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

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
    ciLow: d["CI Low (KBD)"] ? +d["CI Low (KBD)"] : null,
    ciHigh: d["CI High (KBD)"] ? +d["CI High (KBD)"] : null,
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
    .filter((d) => +d.year === 2024 && d.state?.length === 2)
    .map((d) => ({
      state: d.state,
      year: +d.year,
      saidi: d.saidi ? +d.saidi : 0,
      saifi: d.saifi ? +d.saifi : 0,
      energy_burden_pct: d.energy_burden_pct ? +d.energy_burden_pct : 0,
      avg_price_cents_kwh: d.avg_price_cents_kwh ? +d.avg_price_cents_kwh : 0,
      est_annual_bill: d.est_annual_bill ? +d.est_annual_bill : null,
      median_income_2024: d.median_income_2024 ? +d.median_income_2024 : null,
      avg_customers: d.avg_customers ? +d.avg_customers : null,
    }));
}

export async function fetchTargets(): Promise<TargetRow[]> {
  const raw = await d3.csv(`${BASE}/data/merged_targets_clean.csv`);
  return raw
    .filter((d) => d.capacity_target_gw && +d.capacity_target_gw > 0 && d.country_code !== "EU")
    .map((d) => ({
      country_code: d.country_code ?? "",
      country_name: d.country_name ?? "",
      capacity_target_gw: +d.capacity_target_gw,
      share_target_pct: d.share_target_pct ? +d.share_target_pct : null,
    }));
}

export async function fetchNetTrade(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/net_trade_forecast.csv`);
  return raw.map((d) => ({
    Country: d.Country === "Usa" ? "USA" : (d.Country ?? ""),
    Year: +(d.Year ?? 0),
    Type: d.Type ?? "",
    value: +(d["Net_Trade"] ?? 0),
    ciLow: d["Net_CI_Low"] ? +d["Net_CI_Low"] : null,
    ciHigh: d["Net_CI_High"] ? +d["Net_CI_High"] : null,
  }));
}

export async function fetchOilExports(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/exports.csv`);
  return raw.map((d) => ({
    Country: d.Country === "Usa" ? "USA" : (d.Country ?? ""),
    Year: +(d.Year ?? 0),
    Type: d.Type ?? "",
    value: +(d["Value"] ?? 0),
    ciLow: d["Lower_CI"] ? +d["Lower_CI"] : null,
    ciHigh: d["Upper_CI"] ? +d["Upper_CI"] : null,
  }));
}

export async function fetchGdpMeta(): Promise<GdpMeta[]> {
  const raw = await d3.json<GdpMeta[]>(`${BASE}/data/gdp_country_meta.json`);
  return raw ?? [];
}
