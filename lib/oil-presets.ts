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
    detail: "China, India, Japan, South Korea, and Singapore account for the majority of Asia-Pacific oil import demand. This region is where EV adoption growth is most consequential for global oil markets.",
    regions: ["China", "India", "Japan", "Korea", "Singapore"],
  },
  {
    label: "All Countries",
    description: "All 10 countries in the imports dataset",
    detail: "All 10 major oil importing nations tracked in the IEA dataset.",
    regions: null,
  },
];
