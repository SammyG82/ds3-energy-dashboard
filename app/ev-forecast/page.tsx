import type { Metadata } from "next";
import EvForecastClient from "./EvForecastClient";

export const metadata: Metadata = {
  title: "EV Forecast — DS3 Energy Dashboard",
  description: "Historical EV sales from 2010 across 50+ countries, with DS3 logistic S-curve projections through 2035.",
};

export default function EvForecastPage() {
  return <EvForecastClient />;
}
