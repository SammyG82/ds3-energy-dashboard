import { useState, useEffect, type RefObject } from "react";
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

export function useContainerSize(ref: RefObject<Element | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    let tid: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver((entries) => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        const { width, height } = entries[0].contentRect;
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }, 150);
    });
    obs.observe(ref.current);
    return () => { clearTimeout(tid); obs.disconnect(); };
  }, [ref]);
  return size;
}
