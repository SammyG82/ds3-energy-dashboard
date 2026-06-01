"use client";
import { useEffect } from "react";
export default function PageInit() {
  useEffect(() => {
    document.documentElement.classList.remove("page-loading");
    document.head.querySelector('style[data-page-init]')?.remove();
  }, []);
  return null;
}
