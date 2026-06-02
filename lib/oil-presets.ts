import type { PresetItem } from "@/components/ui/RegionPicker";

export const OIL_IMPORT_PRESETS: PresetItem[] = [
  {
    label: "Top 5 Importers",
    description: "The five largest end-consumer oil importers",
    detail: "China, India, USA, Japan, and South Korea are the five largest oil importers by domestic consumption. Singapore and the Netherlands import more by volume but are re-export hubs — their figures don't reflect domestic demand.",
    regions: ["China", "India", "USA", "Japan", "Korea"],
  },
  {
    label: "Asia Pacific",
    description: "Major oil importers in the Asia-Pacific region",
    detail: "China, India, Japan, and South Korea are the four major net oil importers in the Asia-Pacific region. Singapore is also included as a regional hub, though its import volumes reflect refinery throughput and re-exports rather than domestic consumption — its figures are not directly comparable to the others.",
    regions: ["China", "India", "Japan", "Korea", "Singapore"],
  },
  {
    label: "All Countries",
    description: "All countries in the imports dataset",
    detail: "All major oil importing nations tracked in the IEA dataset.",
    regions: null,
  },
];
