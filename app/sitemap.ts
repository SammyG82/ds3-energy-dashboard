import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/ev-forecast/` },
    { url: `${SITE_URL}/ev-gdp-impact/` },
    { url: `${SITE_URL}/about/` },
  ];
}
