"use client";
import { useEffect } from "react";
export default function PageInit() {
  useEffect(() => {
    document.documentElement.classList.remove("page-loading");
  }, []);
  return null;
}
