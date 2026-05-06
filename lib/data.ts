import * as d3 from "d3";
import type { OilRow } from "@/components/charts/OilForecastChart";

const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

export async function fetchEvSales() {
  const raw = await d3.csv(`${BASE}/data/ev_sales.csv`);
  return raw.map((d) => ({
    region_country: d.region_country ?? "",
    year: +d.year,
    ev_sales: +d.ev_sales,
    type: d.type ?? "",
  }));
}

export async function fetchEvData() {
  const raw = (await d3.json<Array<{ region_country: string; year: number; ev_sales: number; type: string }>>(`${BASE}/data/ev_data.json`)) ?? [];
  return raw.map((d) => ({
    region_country: d.region_country,
    year: +d.year,
    ev_sales: +d.ev_sales,
    type: d.type,
  }));
}

export async function fetchOilForecast(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/oil_forecast.csv`);
  return raw.map((d) => ({
    Country: d.Country ?? "",
    Year: +d.Year,
    Type: d.Type ?? "",
    value: +(d["Oil Imports (KBD)"] ?? 0),
    ciLow: d["CI Low (KBD)"] ? +d["CI Low (KBD)"] : null,
    ciHigh: d["CI High (KBD)"] ? +d["CI High (KBD)"] : null,
  }));
}

export async function fetchEnergyAccess() {
  const raw = await d3.csv(`${BASE}/data/energy_access_with_burden.csv`);
  // Filter to 2024, 2-letter state codes only
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

export async function fetchTargets() {
  const raw = await d3.csv(`${BASE}/data/merged_targets_clean.csv`);
  return raw
    .filter((d) => d.capacity_target_gw && +d.capacity_target_gw > 0)
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
    Country: d.Country ?? "",
    Year: +d.Year,
    Type: d.Type ?? "",
    value: +(d["Net_Trade"] ?? 0),
    ciLow: d["Net_CI_Low"] ? +d["Net_CI_Low"] : null,
    ciHigh: d["Net_CI_High"] ? +d["Net_CI_High"] : null,
  }));
}

export async function fetchOilExports(): Promise<OilRow[]> {
  const raw = await d3.csv(`${BASE}/data/exports.csv`);
  return raw.map((d) => ({
    Country: d.Country ?? "",
    Year: +d.Year,
    Type: d.Type ?? "",
    value: +(d["Value"] ?? 0),
    ciLow: d["Lower_CI"] ? +d["Lower_CI"] : null,
    ciHigh: d["Upper_CI"] ? +d["Upper_CI"] : null,
  }));
}

export async function fetchGdpMeta() {
  return d3.json<Array<{
    country: string; region: string; gdp: number;
    oilImports: number; costPerBarrel: number;
  }>>(`${BASE}/data/gdp_country_meta.json`);
}
