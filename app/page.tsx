import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "DS3 Energy Dashboard",
  description: "A data-driven dashboard exploring EV adoption, oil dependency, and clean energy infrastructure across 50+ countries.",
};

export default function LandingPage() {
  return <HomeClient />;
}
