import type { Metadata } from "next";
import EvGdpImpactClient from "./EvGdpImpactClient";

export const metadata: Metadata = {
  title: "EV Impact — DS3 Energy Dashboard",
  description: "Model how EV adoption reduces oil import spending and what those savings represent as a share of GDP.",
};

export default function EvGdpImpactPage() {
  return <EvGdpImpactClient />;
}
