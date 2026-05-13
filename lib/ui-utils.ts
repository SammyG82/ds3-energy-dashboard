import type { CSSProperties } from "react";

export function tooltipStyle(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  clampN: number
): CSSProperties {
  return {
    left: x < containerWidth * 0.6 ? x + 14 : undefined,
    right: x >= containerWidth * 0.6 ? containerWidth - x + 14 : undefined,
    top: Math.max(4, Math.min(y - 10, containerHeight - clampN)),
  };
}
