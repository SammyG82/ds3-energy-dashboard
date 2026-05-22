"""
Extracts annual average WTI and Brent crude oil prices from the FRED Excel data,
deflates them to real 2024 USD using US CPI from the IMF CPI CSV, and writes
public/data/oil_prices.json.

Run this manually once a year when refreshing the data:
  1. Download updated Brent/WTI daily prices from FRED as an Excel file
     (DCOILBRENTEU + DCOILWTICO series) → replace analysis/fred-oil.xlsx
  2. Download updated US CPI data from the IMF → replace analysis/imf-cpi.csv
  3. Run: python scripts/process_oil_prices.py
  4. Commit the updated public/data/oil_prices.json

Usage:
    python scripts/process_oil_prices.py
"""

import json
import pandas as pd
from pathlib import Path

EXCEL_PATH = Path(__file__).parent.parent / "analysis" / "fred-oil.xlsx"
CPI_PATH   = Path(__file__).parent.parent / "analysis" / "imf-cpi.csv"
OUT_PATH   = Path(__file__).parent.parent / "public" / "data" / "oil_prices.json"

BASE_YEAR = 2024  # real prices expressed in 2024 USD


def load_oil_prices() -> pd.DataFrame:
    raw = pd.read_excel(EXCEL_PATH, sheet_name="Daily", header=None)

    header_row = None
    for i, row in raw.iterrows():
        vals = [str(v) for v in row.values]
        if any("DCOILBRENTEU" in v for v in vals) and any("DCOILWTICO" in v for v in vals):
            header_row = i
            break
    if header_row is None:
        raise ValueError("Could not find header row with both DCOILBRENTEU and DCOILWTICO.")

    df = pd.read_excel(EXCEL_PATH, sheet_name="Daily", header=header_row)
    date_col = df.columns[0]
    df = df.rename(columns={date_col: "date"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["DCOILBRENTEU"] = pd.to_numeric(df["DCOILBRENTEU"], errors="coerce")
    df["DCOILWTICO"]   = pd.to_numeric(df["DCOILWTICO"],   errors="coerce")
    df = df.dropna(subset=["date"]).set_index("date")

    brent_annual = df["DCOILBRENTEU"].resample("YE").mean()
    wti_annual   = df["DCOILWTICO"].resample("YE").mean()

    all_years = sorted(set(brent_annual.index.year) | set(wti_annual.index.year))
    rows = []
    for year in all_years:
        b = brent_annual[brent_annual.index.year == year].values
        w = wti_annual[wti_annual.index.year == year].values
        rows.append({
            "year":          year,
            "brent_nominal": round(float(b[0]), 2) if len(b) and pd.notna(b[0]) else None,
            "wti_nominal":   round(float(w[0]), 2) if len(w) and pd.notna(w[0]) else None,
        })
    return pd.DataFrame(rows).set_index("year")


def load_us_cpi() -> dict[int, float]:
    """Returns {year: cpi_index} for the United States from the IMF CSV."""
    df = pd.read_csv(CPI_PATH, encoding="utf-8-sig")
    us_row = df[df["COUNTRY"] == "United States"]
    if us_row.empty:
        raise ValueError("United States not found in IMF CPI file.")

    year_cols = [c for c in df.columns if c.isdigit()]
    cpi = {}
    for col in year_cols:
        val = pd.to_numeric(us_row.iloc[0][col], errors="coerce")
        if pd.notna(val):
            cpi[int(col)] = float(val)
    return cpi


def main():
    prices = load_oil_prices()
    us_cpi = load_us_cpi()

    base_cpi = us_cpi.get(BASE_YEAR)
    if base_cpi is None:
        raise ValueError(f"No US CPI data for base year {BASE_YEAR}.")
    print(f"US CPI base ({BASE_YEAR}): {base_cpi:.4f}")
    print(f"CPI years available: {sorted(us_cpi.keys())}\n")

    rows = []
    for year, row in prices.iterrows():
        cpi_year = us_cpi.get(year)
        if cpi_year is not None:
            deflator = base_cpi / cpi_year
            brent_real = round(row["brent_nominal"] * deflator, 2) if pd.notna(row["brent_nominal"]) else None
            wti_real   = round(row["wti_nominal"]   * deflator, 2) if pd.notna(row["wti_nominal"])   else None
        else:
            brent_real = None
            wti_real   = None

        rows.append({
            "year":          int(year),
            "brent_nominal": row["brent_nominal"] if pd.notna(row["brent_nominal"]) else None,
            "wti_nominal":   row["wti_nominal"]   if pd.notna(row["wti_nominal"])   else None,
            "brent_real":    brent_real,
            "wti_real":      wti_real,
        })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rows, indent=2))

    print(f"Written {len(rows)} years → {OUT_PATH}")
    last = next(r for r in reversed(rows) if r["brent_real"] is not None)
    print(f"Latest with real prices: {last['year']} — Brent ${last['brent_nominal']}/bbl nominal, ${last['brent_real']}/bbl real {BASE_YEAR} USD")


if __name__ == "__main__":
    main()
