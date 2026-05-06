# DS3 Energy Dashboard — EV Adoption & Oil Dependency

A data-driven dashboard exploring whether rising electric vehicle adoption measurably reduces oil dependency in non-producing countries, and how the resulting savings could fund clean energy infrastructure.

**Live site:** https://sammyg82.github.io/ds3-energy-dashboard/

---

## Overview

This project combines IEA oil import/export data with global EV sales figures across 50+ countries, spanning 1971–2023 for oil trade and 2010–2035 for EV sales. Forecasts extend through 2030 (oil) and 2035 (EV) using ARIMA and logistic S-curve models.

## Key Metrics

| Metric | Value |
|---|---|
| Global new-car EV share (2023) | ~18% |
| Oil displaced by EVs (2023) | ↓ 2.4 Mb/d |
| Countries in dataset | 50+ |
| Data time span | 1971–2035 |

## Pages

| Page | Description |
|---|---|
| **Dashboard** | Landing page with summary statistics, preview charts, and key findings |
| **EV Share Explorer** | Top EV sales countries ranked by year with interactive filters; single-country sales trend with S-curve forecast |
| **EV Forecast** | Logistic S-curve projections of EV sales by region through 2035 |
| **Oil Explorer** | Historical oil import, export, and net trade volumes (kb/d) with ARIMA forecasts through 2030 |
| **EV GDP Impact** | Analysis of EV adoption's economic impact — displaced barrels, cost savings, and GDP share by country |
| **Energy Access** | US state reliability metrics (SAIDI/SAIFI) and energy burden by state |
| **Affordability** | Energy burden % vs. electricity price scatter — colored by median income |
| **Global Targets** | 2030 renewable energy capacity targets across 88 countries |
| **Datasets** | Access to all underlying data files with source attribution |

## Data Sources

- **Oil data**: IEA Oil Information Database — import/export volumes by country, 1971–2023
- **EV data**: IEA Global EV Outlook 2024 — sales and market share figures, 2010–2035
- **US energy data**: EIA (Energy Information Administration) — state reliability, prices, and energy burden

## Methodology

- Country-level EV market share compared to year-over-year oil import changes, controlling for GDP growth and energy-mix shifts
- Oil forecasts use Log-ARIMA models fitted to historical IEA data (grid search over (p,d,q) by AIC, 95% CI bands)
- EV adoption projected via logistic S-curve `f(t) = L / (1 + e^(-k(t − t₀)))` fitted by nonlinear least-squares regression
- GDP impact estimates apply oil price to displaced barrels and scale to per-capita infrastructure benchmarks

## Project Structure

```
ds3-energy-dashboard/
├── public/data/                         # Static data files (CSV/JSON) for charts
├── app/                                 # All pages and layouts (Next.js App Router)
├── components/
│   ├── charts/                          # D3.js chart components
│   ├── layout/                          # Header and Footer
│   └── ui/                              # Reusable UI components
├── lib/
│   └── data.ts                          # Typed data fetching utilities
└── analysis/                            # Python notebooks and raw IEA data
```

## Local Development

**Frontend:**
```bash
npm install
npm run dev             # dev server at localhost:3000
npm run build           # static export to out/
```

**Python (for analysis notebooks only):**
```bash
conda env create -f environment.yml   # create the ds3-energy environment
conda activate ds3-energy
jupyter notebook                      # open notebooks in analysis/ or eda/
```

## Caveats

Oil demand is shaped by industry, heating, and shipping — not just cars. This analysis focuses on light-vehicle transport fuel and should be read as indicative rather than causal. GDP growth and energy-mix shifts are controlled for but not eliminated.

## License

Data sourced from the International Energy Agency (IEA) and the US Energy Information Administration (EIA). All data is subject to their respective terms of use.
