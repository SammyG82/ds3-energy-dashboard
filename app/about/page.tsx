import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About — DS3 Energy Dashboard",
  description: "Project background, data sources, and research methodology for the DS3 Energy Dashboard.",
};

export default function AboutPage() {
  return <AboutClient />;
}
