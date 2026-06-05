"use client";

import { useTheme } from "@/lib/theme-context";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

export default function ChartLoader() {
  const { isDark } = useTheme();
  return <LoadingPlaceholder text="Loading chart…" isDark={isDark} />;
}
