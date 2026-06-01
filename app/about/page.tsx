"use client";

import { useTheme } from "@/lib/theme-context";
import FadeIn from "@/components/ui/FadeIn";

export default function AboutPage() {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen pb-16 transition-colors duration-300 ${isDark ? "bg-black text-white" : "bg-white text-slate-900"}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 md:px-12 py-16">
        <FadeIn>
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-light mb-16 ${isDark ? "text-white" : "text-slate-900"}`}>About</h1>
        </FadeIn>

        {/* The Project */}
        <FadeIn><section className="mb-16">
          <h2 className="text-xl font-bold mb-6">The Project</h2>
          <p className={`text-lg leading-relaxed mb-8 ${isDark ? "text-white/60" : "text-slate-700"}`}>
            The central research question is whether rising EV adoption in non-oil-producing countries leads to measurable reductions in oil imports, and what the potential fiscal dividend of those savings might be.
          </p>

          <div className="space-y-4 mt-6">
            {[
              { title: "EV Growth", body: "Global BEV sales have followed a predictable S-curve trajectory from 2010 onward, with adoption driven primarily by falling battery costs and expanding model availability. IEA Stated Policies Scenario (STEPS) projections extend this trajectory forward through 2035." },
              { title: "Oil Import Pressure", body: "Light vehicle transport is a primary driver of road-fuel demand. The dashboard correlates country-level EV penetration with observed oil import volumes, estimating how many barrels are displaced as EVs replace gasoline-powered cars." },
              { title: "Infrastructure Dividend", body: "Reduced oil imports free foreign exchange reserves. Conservative estimates of fuel and import displacement translate to billions of dollars in available public sector savings to invest in electricity grid and clean-transition infrastructure." },
              { title: "Caveats", body: "Oil demand is shaped by many factors beyond passenger vehicles — industry, shipping, and heating. These estimates are indicative, not causal: GDP growth and energy-mix shifts are not controlled for. The analysis focuses specifically on light-vehicle transport fuel displacement." },
            ].map(({ title, body }) => (
              <div key={title} className={`p-4 rounded-2xl border backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200/50"}`}>
                <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-black/70"}`}>{body}</p>
              </div>
            ))}
          </div>
        </section></FadeIn>

        {/* Key Variables */}
        <FadeIn><section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Key Variables</h2>
          <p className={`text-lg leading-relaxed mb-6 ${isDark ? "text-white/60" : "text-slate-700"}`}>
            The table below lists the primary variables used across the project's data files. Each chart reads its own independent file at runtime — there is no single merged dataset. Derived columns are computed in the browser from source data.
          </p>

          <div className={`relative p-6 rounded-3xl border backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200/50"}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? "border-white/10" : "border-slate-200"}`}>
                    <th className={`text-left py-3 px-4 text-xs uppercase tracking-widest ${isDark ? "text-white/50" : "text-black/40"}`}>Variable</th>
                    <th className={`text-left py-3 px-4 text-xs uppercase tracking-widest ${isDark ? "text-white/50" : "text-black/40"}`}>Description</th>
                    <th className={`text-left py-3 px-4 text-xs uppercase tracking-widest ${isDark ? "text-white/50" : "text-black/40"}`}>Unit</th>
                    <th className={`text-left py-3 px-4 text-xs uppercase tracking-widest ${isDark ? "text-white/50" : "text-black/40"}`}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "country", desc: "ISO country name / region identifier", unit: "—", tags: ["OIL", "EV"] },
                    { name: "year", desc: "Calendar year of observation", unit: "YYYY", tags: ["OIL", "EV"] },
                    { name: "ev_sales", desc: "Total BEV new vehicle sales in a given country and year", unit: "Vehicles (units)", tags: ["EV"] },
                    { name: "ev_share", desc: "EV sales as a share of the selected countries' combined sales total. Computed from ev_sales — not stored in source data.", unit: "% (0–100)", tags: ["DERIVED"] },
                    { name: "ev_growth_rate", desc: "Year-over-year percentage change in EV sales volume", unit: "% change", tags: ["DERIVED"] },
                    { name: "oil_import", desc: "Total crude oil and petroleum product imports", unit: "kb/d", tags: ["OIL"] },
                    { name: "oil_export", desc: "Total crude oil and petroleum product exports", unit: "kb/d", tags: ["OIL"] },
                    { name: "net_oil_import", desc: "Oil imports minus oil exports; positive = net importer", unit: "kb/d", tags: ["DERIVED"] },
                    { name: "oil_import_delta", desc: "Year-over-year change in oil import volume", unit: "kb/d (Δ)", tags: ["DERIVED"] },
                    { name: "estimated_savings", desc: "Estimated financial value of oil import reduction attributed to EV adoption, at a reference oil price.", unit: "USD billions", tags: ["DERIVED"] },
                  ].map((row, i, arr) => (
                    <tr key={row.name} className={i < arr.length - 1 ? `border-b ${isDark ? "border-white/5" : "border-slate-100"}` : ""}>
                      <td className={`py-3 px-4 text-sm font-mono ${isDark ? "text-teal-400" : "text-teal-600"}`}>{row.name}</td>
                      <td className={`py-3 px-4 text-sm ${isDark ? "text-white/90" : "text-black/80"}`}>{row.desc}</td>
                      <td className={`py-3 px-4 text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>{row.unit}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col gap-1.5 items-start">
                          {row.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`inline-block px-2 py-1 rounded ${isDark ? "bg-white/10 text-white/50" : "bg-black/5 text-black/40"}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-6 w-12 bg-linear-to-l from-slate-50 dark:from-black to-transparent sm:hidden" aria-hidden="true" />
          </div>
        </section></FadeIn>

        {/* Methodology */}
        <FadeIn><section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Methodology</h2>

          <div className="mb-8">
            <h3 className={`text-lg font-medium mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Dataset Sources</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "IEA Oil Information Database",
                  desc: "Historical oil import volumes by country (1971–2023) with Log-ARIMA forecasts and 95% CI bands through 2030.",
                  rows: "600 rows",
                  source: "International Energy Agency (IEA)",
                  license: "IEA Terms of Use",
                  columns: "Country, Year, Type, Oil Imports (KBD), CI Low (KBD), CI High (KBD)",
                },
                {
                  title: "EV Sales & Forecast Data",
                  desc: "BEV sales by country and year — historical figures (2010–2024) from the IEA Global EV Outlook plus DS3 logistic S-curve projections through 2035. Available as ev_sales.csv and ev_data.json; both files are identical in content.",
                  rows: "1,297 rows",
                  source: "IEA Global EV Outlook 2025 (historical) + DS3 logistic S-curve model (projections)",
                  license: "IEA Terms of Use (historical data)",
                  columns: "region_country, year, ev_sales, type",
                },
                {
                  title: "Historical Crude Oil Prices",
                  desc: "Annual average Brent and WTI spot prices (1986–2026), with inflation-adjusted real prices in 2024 USD using BLS CPI-U deflation.",
                  rows: "41 rows",
                  source: "EIA (RBRTE / RWTC series) · Energy Institute Statistical Review (1986 Brent) · BLS CPI-U (deflation)",
                  license: "Public domain",
                  columns: "year, brent_nominal, wti_nominal, brent_real, wti_real",
                },
                {
                  title: "Net Trade Forecast",
                  desc: "Combined ARIMA forecasts for oil exports and imports with derived net trade position per country through 2030.",
                  rows: "1,200 rows",
                  source: "Derived from IEA Oil Information Database — DS3 model",
                  license: "Open",
                  columns: "Country, Year, Type, Net_Trade, Net_CI_Low, Net_CI_High, Exports, Imports, Exports_Order, Imports_Order, Avg_MAPE",
                },
                {
                  title: "Oil Exports Forecast",
                  desc: "Historical oil export volumes by country (1971–2023) with Log-ARIMA forecasts and 95% CI bands through 2030.",
                  rows: "1,200 rows",
                  source: "International Energy Agency (IEA)",
                  license: "IEA Terms of Use",
                  columns: "Country, Year, Type, Value, Lower_CI, Upper_CI, ARIMA_Order, MAPE",
                },
                {
                  title: "EV GDP Impact Metadata",
                  desc: "Country-level GDP, oil import volumes, and cost-per-barrel figures used for the EV GDP impact calculations.",
                  rows: "13 countries",
                  source: "World Bank Open Data 2023 (GDP) · IEA Oil Information Database (oil imports) · IEA/EIA estimates (cost per barrel)",
                  license: "Open",
                  columns: "country, region, gdp (B USD), oilImports (Mb/d), costPerBarrel (USD)",
                },
              ].map(({ title, desc, rows, source, license, columns }) => (
                <div
                  key={title}
                  className={`p-4 rounded-2xl border backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200/50"}`}
                >
                  <h4 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h4>
                  <p className={`text-sm mb-3 ${isDark ? "text-white/60" : "text-black/70"}`}>{desc}</p>
                  <div className={`text-xs space-y-1 ${isDark ? "text-white/60" : "text-black/60"}`}>
                    <div><span className="font-medium">Rows:</span> {rows}</div>
                    <div><span className="font-medium">Source:</span> {source}</div>
                    <div><span className="font-medium">License:</span> {license}</div>
                    <div><span className="font-medium">Columns:</span> {columns}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className={`text-lg font-medium mb-3 mt-8 ${isDark ? "text-white" : "text-slate-900"}`}>Dataset description</h3>
            <p className={`text-base leading-relaxed mb-6 ${isDark ? "text-white/60" : "text-slate-700"}`}>
              All charts draw on publicly available International Energy Agency (IEA) datasets. Historical oil trade data spans 1971–2023, with ARIMA forecasts through 2030 — the imports model covers the top 10 importers by 2023 volume; exports and net trade cover 20 countries each. EV data spans 56 regions from 2010–2035: historical figures (2010–2024) from the IEA Global EV Outlook, extended through 2035 via DS3 logistic S-curve models fitted per country.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <div className={`relative p-6 rounded-3xl border overflow-hidden backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200/50"}`}>
                <div className="mb-4">
                  <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Oil Import / Export Dataset</h4>
                </div>
                <p className={`text-xs font-mono uppercase tracking-widest mb-4 ${isDark ? "text-white/50" : "text-black/40"}`}>International Energy Agency (IEA)</p>
                <div className="space-y-3 mb-4">
                  {[
                    { label: "SOURCE", value: "IEA Oil Information" },
                    { label: "COVERAGE", value: "1971–2030 (annual)" },
                    { label: "UNIT", value: "Thousand barrels per day (kb/d)" },
                    { label: "COUNTRIES", value: "10 (imports), 20 (exports / net trade)" },
                    { label: "GRANULARITY", value: "Country-level, annual" },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                      <span className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/50" : "text-black/40"}`}>{label}</span>
                      <span className={`text-sm ${isDark ? "text-white/90" : "text-black/80"}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <p className={`text-sm leading-relaxed ${isDark ? "text-white/60" : "text-black/60"}`}>
                  Records crude oil and petroleum product import and export volumes by country. Used to derive net import position and to identify countries whose oil supply is predominantly import-dependent (i.e. non-major-exporters).
                </p>
              </div>

              <div className={`relative p-6 rounded-3xl border overflow-hidden backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200/50"}`}>
                <div className="mb-4">
                  <h4 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>EV Sales & Market Growth Dataset</h4>
                </div>
                <p className={`text-xs font-mono uppercase tracking-widest mb-4 ${isDark ? "text-white/50" : "text-black/40"}`}>International Energy Agency (IEA)</p>
                <div className="space-y-3 mb-4">
                  {[
                    { label: "SOURCE", value: "IEA Global EV Outlook 2025 + DS3 S-curve (projections)" },
                    { label: "COVERAGE", value: "2010–2035 (annual)" },
                    { label: "UNIT", value: "Vehicles sold; market share (%)" },
                    { label: "COUNTRIES", value: "56 countries / regions" },
                    { label: "GRANULARITY", value: "Country-level, annual" },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                      <span className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/50" : "text-black/40"}`}>{label}</span>
                      <span className={`text-sm ${isDark ? "text-white/90" : "text-black/80"}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <p className={`text-sm leading-relaxed ${isDark ? "text-white/60" : "text-black/60"}`}>
                  Captures annual BEV sales figures by country and region, enabling calculation of each market's EV growth trajectory and relative share across selected countries.
                </p>
              </div>
            </div>
          </div>
        </section></FadeIn>

        {/* Data Processing */}
        <FadeIn><section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Data Processing</h2>
          <p className={`text-lg leading-relaxed mb-6 ${isDark ? "text-white/60" : "text-slate-700"}`}>
            The following pipeline was applied to transform raw IEA data into the analytical dataset used throughout this project:
          </p>

          <div className={`relative p-6 rounded-3xl border overflow-hidden backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200/50"}`}>
            <div className="space-y-6">
              {[
                {
                  num: "01",
                  bgLight: "bg-black/5",   bgDark: "bg-white/10",
                  textLight: "text-black/40", textDark: "text-white/50",
                  title: "Extract",
                  body: <>Raw IEA files were loaded by Python notebooks in <span className="font-mono text-xs">analysis/oil_info/</span> and <span className="font-mono text-xs">eda/</span>. EV historical sales data comes from IEA Global EV Outlook 2025; oil trade data from the IEA Oil Information Database (<span className="font-mono text-xs">OIWORLD.csv</span>).</>,
                },
                {
                  num: "02",
                  bgLight: "bg-black/5",   bgDark: "bg-white/10",
                  textLight: "text-black/40", textDark: "text-white/50",
                  title: "Clean",
                  body: <>Country names were standardised across datasets — capitalisation anomalies corrected (e.g. <span className="font-mono text-xs">Usa → USA</span>), regional aggregate rows removed, and zero-value rows for years with missing data filtered out to prevent misleading drops in charts.</>,
                },
                {
                  num: "03",
                  bgLight: "bg-black/5",   bgDark: "bg-white/10",
                  textLight: "text-black/40", textDark: "text-white/50",
                  title: "Forecast (Oil)",
                  body: <>A Log-ARIMA model was fitted per country using grid search over <span className="font-mono text-xs">(p, d, q)</span> with AIC selection (<span className="font-mono text-xs">d ≤ 1</span>). Each model produces a point forecast and 95% confidence intervals through 2030. MAPE is stored per country in the output CSV.</>,
                },
                {
                  num: "04",
                  bgLight: "bg-black/5",   bgDark: "bg-white/10",
                  textLight: "text-black/40", textDark: "text-white/50",
                  title: "Forecast (EV)",
                  body: <>A logistic S-curve model is fitted per country using <span className="font-mono text-xs">scipy.optimize.curve_fit</span> on IEA historical BEV sales. The model projects adoption through 2035, constrained to 1.2–10× the historical peak. Historical rows are tagged <span className="font-mono text-xs">Actual</span>; projected rows <span className="font-mono text-xs">Forecast</span>. Uzbekistan has fewer than 3 data points, so no S-curve forecast is generated for it; its historical rows are still included in the output.</>,
                },
                {
                  num: "05",
                  bgLight: "bg-black/5",   bgDark: "bg-white/10",
                  textLight: "text-black/40", textDark: "text-white/50",
                  title: "Export",
                  body: <>Each notebook outputs a standalone file to <span className="font-mono text-xs">public/data/</span>. No single merged analytical dataset exists — each chart reads its own file independently at runtime.</>,
                },
                {
                  num: "06",
                  bgLight: "bg-black/5",   bgDark: "bg-white/10",
                  textLight: "text-black/40", textDark: "text-white/50",
                  title: "Derive (client-side)",
                  body: <>Oil displacement, estimated savings, and GDP impact percentages are computed in the browser using the adoption-rate and year sliders on the EV GDP Impact page — they are not stored in any data file.</>,
                },
              ].map(({ num, bgLight, bgDark, textLight, textDark, title, body }) => (
                <div key={num} className="flex gap-3 items-start">
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center -mt-2 ${isDark ? bgDark : bgLight}`}>
                    <span className={`text-xs font-semibold ${isDark ? textDark : textLight}`}>{num}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-white/60" : "text-black/60"}`}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section></FadeIn>

      </div>
    </div>
  );
}
