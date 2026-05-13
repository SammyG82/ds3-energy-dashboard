import PageHeader from "@/components/ui/PageHeader";

const datasets = [
  {
    name: "IEA Oil Information Database",
    file: "oil_forecast.csv",
    description: "Historical oil import/export volumes by country (1971–2023) with Log-ARIMA forecasts and 95% CI bands through 2030.",
    rows: "610 rows",
    columns: "Country, Year, Type, Oil Imports (KBD), CI Low (KBD), CI High (KBD)",
    source: "International Energy Agency (IEA)",
    license: "IEA Terms of Use",
  },
  {
    name: "IEA Global EV Outlook — Sales",
    file: "ev_sales.csv",
    description: "EV sales by country and year, including actual figures (2010–2023) and projections through 2035.",
    rows: "1,302 rows",
    columns: "region_country, year, ev_sales, type",
    source: "International Energy Agency (IEA) — Global EV Outlook 2024",
    license: "IEA Terms of Use",
  },
  {
    name: "EV Forecast Data (S-Curve)",
    file: "ev_data.json",
    description: "Logistic S-curve projections of EV sales by region through 2035, fitted by nonlinear least-squares regression.",
    rows: "1,302 records",
    columns: "region_country, year, ev_sales, type",
    source: "Derived from IEA data — DS3 model",
    license: "Open",
  },
  {
    name: "Net Trade Forecast",
    file: "net_trade_forecast.csv",
    description: "Combined ARIMA forecasts for oil exports and imports with derived net trade position per country through 2030.",
    rows: "1,220 rows",
    columns: "Country, Year, Type, Net_Trade, Net_CI_Low, Net_CI_High, Exports, Imports, Exports_Order, Imports_Order, Avg_MAPE",
    source: "Derived from JODI Oil World Database — DS3 model",
    license: "Open",
  },
  {
    name: "US Energy Access & Burden",
    file: "energy_access_with_burden.csv",
    description: "US state-level energy metrics including SAIDI, SAIFI reliability indices, electricity prices, and energy burden (2001–2025).",
    rows: "1,550 rows",
    columns: "state, year, saidi, saifi, energy_burden_pct, avg_price_cents_kwh, median_income_2024, est_annual_bill, avg_customers",
    source: "EIA (Energy Information Administration)",
    license: "Public Domain",
  },
  {
    name: "Global Renewable Targets 2030",
    file: "merged_targets_clean.csv",
    description: "88-country renewable energy capacity and generation share targets for 2030.",
    rows: "88 rows",
    columns: "country_code, country_name, capacity_target_gw, share_target_pct",
    source: "Ember — Global Electricity Review",
    license: "CC BY 4.0",
  },
  {
    name: "Oil Exports Forecast",
    file: "exports.csv",
    description: "Historical oil export volumes by country (1971–2023) with Log-ARIMA forecasts and 95% CI bands through 2030.",
    rows: "610 rows",
    columns: "Country, Year, Type, Value, Lower_CI, Upper_CI, ARIMA_Order, MAPE",
    source: "International Energy Agency (IEA)",
    license: "IEA Terms of Use",
  },
  {
    name: "EV GDP Impact Metadata",
    file: "gdp_country_meta.json",
    description: "Country-level GDP, oil import volumes, and cost-per-barrel figures used for the EV GDP impact calculations.",
    rows: "10 countries",
    columns: "country, region, gdp (B USD), oilImports (Mb/d), costPerBarrel (USD)",
    source: "World Bank / IEA — DS3 compilation",
    license: "Open",
  },
];

const methodology = [
  {
    label: "Oil Forecasting",
    body: "Log-ARIMA models fitted per country using AIC-based grid search over (p, d, q) ∈ [0,2]³ with d ≤ 1 stability constraint. Forecasts generated with 95% confidence intervals. MAPE calculated on held-out validation split.",
  },
  {
    label: "EV Adoption Projection",
    body: "Logistic S-curve f(t) = L / (1 + e^(-k(t−t₀))) fitted by nonlinear least-squares regression per region. Parameters: L (carrying capacity), k (growth rate), t₀ (inflection point).",
  },
  {
    label: "GDP Impact Estimate",
    body: "Each EV assumed to displace ~1,300 gallons/year (≈ 31 barrels). Total displaced barrels × country-specific cost/barrel = annual savings. Expressed as % of nominal GDP for cross-country comparison.",
  },
  {
    label: "Energy Burden",
    body: "Annual electricity bill (kWh per customer × average price) divided by median household income for 2024. Sourced from EIA SEDS and reliability data.",
  },
];

export default function DatasetsPage() {
  return (
    <>
      <PageHeader
        title="Datasets &"
        titleAccent="Methods"
        subtitle="All datasets used in this project, their sources, coverage, and the methodology behind each model."
        badges={[
          { label: "IEA · EIA · Ember", color: "teal" },
          { label: "Open Data", color: "blue" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 flex flex-col gap-12">

        {/* Dataset table */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6">Data Files</h2>
          <div className="flex flex-col gap-4">
            {datasets.map(({ name, file, description, rows, columns, source, license }) => (
              <div
                key={file}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-slate-900">{name}</h3>
                  <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{file}</code>
                </div>
                <p className="text-sm text-slate-500 mb-3">{description}</p>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                  <span><span className="text-slate-600">Rows:</span> {rows}</span>
                  <span><span className="text-slate-600">Source:</span> {source}</span>
                  <span><span className="text-slate-600">License:</span> {license}</span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  <span className="text-slate-600">Columns:</span> {columns}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6">Methodology</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {methodology.map(({ label, body }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-mono uppercase tracking-widest text-teal-600 mb-2">{label}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Attribution */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-bold text-amber-800 mb-2">Data Attribution</h3>
          <p className="text-sm text-amber-700 leading-relaxed">
            Oil and EV data is sourced from the{" "}
            <strong>International Energy Agency (IEA)</strong>. All IEA data is subject to their{" "}
            <a
              href="https://www.iea.org/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              terms of use
            </a>
            . US energy access data is sourced from the{" "}
            <strong>US Energy Information Administration (EIA)</strong> and is in the public domain.
            Renewable targets data is sourced from <strong>Ember</strong> under CC BY 4.0.
          </p>
        </section>

        {/* Contributing */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-2">Contributing</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Open project. Chart implementations live in{" "}
            <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">components/charts/</code>,
            datasets in{" "}
            <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">public/data/</code>.
            Pull requests welcome on{" "}
            <a
              href="https://github.com/SammyG82/ds3-energy-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 underline"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
