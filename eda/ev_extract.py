"""
EV data extraction script.
Reads:  ../analysis/IEA_Global_EV_Data_2025.csv
Writes: ev_sales.csv   (same directory as this script)
        ev_data.json   (same directory as this script)

Run from eda/:  python ev_extract.py
"""
import pandas as pd
import numpy as np
import json
from scipy.optimize import curve_fit

# ── Load source data ──────────────────────────────────────────────────────────
ev_raw = pd.read_csv("../analysis/IEA_Global_EV_Data_2025.csv")
# Columns: region_country, category, parameter, mode, powertrain, year, unit, value, Aggregate group
# category values:  "Historical", "Projection-STEPS"
# powertrain values: "BEV" (battery-only), "PHEV", "EV" (BEV+PHEV combined)

# ── Filter to historical car-level EV sales only ──────────────────────────────
# Decision: BEV-only ("BEV") vs total EV sales ("EV"). See HANDOFF.md Decision 2.
POWERTRAIN = "BEV"  # Decision 2 Option A: BEV-only. Change to "EV" for BEV+PHEV total (Option B).

ev_hist = ev_raw[
    (ev_raw["parameter"] == "EV sales") &
    (ev_raw["mode"] == "Cars") &
    (ev_raw["powertrain"] == POWERTRAIN) &
    (ev_raw["category"] == "Historical")
].copy()

# ── Rename and remap columns ──────────────────────────────────────────────────
ev_hist = ev_hist.rename(columns={"value": "ev_sales"})
ev_hist["type"] = "Actual"  # frontend depends on "Actual" exactly — do not rename
ev_hist = ev_hist[["region_country", "year", "ev_sales", "type"]]

# ── Remove rogue "Actual" rows for future years ───────────────────────────────
# Some IEA regions have a 2030 "Historical" row that is actually a policy target.
ev_hist = ev_hist[ev_hist["year"] <= 2024]

# ── Exclude aggregate/regional groupings ─────────────────────────────────────
EXCLUDE_REGIONS = {
    "Africa", "Asia Pacific", "Europe",
    "Middle East and Caspian", "North America",
    "Rest of the world",
}

# Aggregates kept in the output but not fitted with an S-curve.
SKIP_FORECAST: set[str] = set()
ev_hist = ev_hist[~ev_hist["region_country"].isin(EXCLUDE_REGIONS)]

ev_hist = ev_hist.sort_values(["region_country", "year"]).reset_index(drop=True)

# ── Logistic S-curve projections through 2035 ─────────────────────────────────
def logistic_model(t, K, r, t0):
    return K / (1 + np.exp(-r * (t - t0)))

# setup years for projection
future_years = np.arange(2025, 2036)
forecast_rows = []

# iterate through each country to fit and forecast
for country in ev_hist["region_country"].unique():
    temp = ev_hist[ev_hist["region_country"] == country].sort_values("year")
    xdata = temp["year"].values
    ydata = temp["ev_sales"].values

    if len(ydata) < 3: # need at least 3 points to fit a curve
        continue
    if country in SKIP_FORECAST:
        continue

    current_max = ydata.max()
    lower_k = current_max * 1.2 # ensure K is at least 1.2x the current max to prevent "Flatlines"
    upper_k = current_max * 10  # cap K at 10x the current max to prevent "Explosions"
    p0 = [lower_k * 2, 0.3, 2030]

    try:
        params, _ = curve_fit(
            logistic_model,
            xdata,
            ydata,
            p0=p0,
            bounds=([lower_k, 0.01, 2010], [upper_k, 1.0, 2050]),
            maxfev=5000
        )
        K, r, t0 = params

        for year in future_years:
            forecast_rows.append({
                "region_country": country,
                "year": int(year),
                "ev_sales": float(logistic_model(year, K, r, t0)),
                "type": "Forecast",
            })
    except Exception as e:
        print(f"Skipping {country}: {e}")

forecast_df = pd.DataFrame(forecast_rows)

# ── Combine historical + S-curve forecasts ────────────────────────────────────
ev_out = pd.concat([ev_hist, forecast_df], ignore_index=True)
ev_out = ev_out.sort_values(["region_country", "year"]).reset_index(drop=True)

# ── Write outputs ─────────────────────────────────────────────────────────────
ev_out.to_csv("ev_sales.csv", index=False)
print(f"ev_sales.csv written — {len(ev_out)} rows")

ev_out["year"] = ev_out["year"].astype(int)
records = ev_out.to_dict("records")
with open("ev_data.json", "w") as f:
    json.dump(records, f, indent=2)
print(f"ev_data.json written — {len(records)} records")

# ── Sanity checks ─────────────────────────────────────────────────────────────
n_regions = ev_out["region_country"].nunique()
n_forecast = ev_out[ev_out["type"] == "Forecast"]["region_country"].nunique()
print(f"Distinct regions: {n_regions}  (expected: 56 — 55 countries + EU27 aggregate)")
print(f"Regions with S-curve forecast: {n_forecast}  (expected: 55 — Uzbekistan has <3 data points)")
if n_regions < 55:
    print("WARNING: fewer regions than expected — some may have LDV data only, not Cars.")
    print("Consider changing mode filter to 'LDV' or checking IEA data structure.")

china_2023 = ev_out[(ev_out["region_country"] == "China") & (ev_out["year"] == 2023)]
if not china_2023.empty:
    val = china_2023.iloc[0]["ev_sales"]
    note = "BEV-only" if abs(val - 5_400_000) < 500_000 else "BEV+PHEV" if abs(val - 8_100_000) < 500_000 else "UNEXPECTED"
    print(f"China 2023 ev_sales: {val:,.0f}  ({note})")