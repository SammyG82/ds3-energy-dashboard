"use client";

import React, { useState } from "react";

interface MethodologyItem {
  label: string;
  body: React.ReactNode;
  plain?: React.ReactNode;
}

interface Props {
  items: MethodologyItem[];
  cols?: 1 | 2 | 3 | 4;
}

const COL_CLASS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export default function MethodologySection({ items, cols = 3 }: Props) {
  const [openPlain, setOpenPlain] = useState<string | null>(null);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">Behind the numbers</p>
      <div className={`grid grid-cols-1 ${COL_CLASS[cols] ?? "sm:grid-cols-3"} gap-6`}>
        {items.map(({ label, body, plain }) => {
          const isOpen = openPlain === label;
          return (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-mono uppercase tracking-widest text-teal-600">{label}</p>
                {plain && (
                  <button
                    type="button"
                    onClick={() => setOpenPlain(isOpen ? null : label)}
                    title="Plain-English explanation"
                    aria-label="Plain-English explanation"
                    aria-expanded={isOpen}
                    className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                      isOpen
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-slate-400 border-slate-300 hover:border-teal-400 hover:text-teal-600"
                    }`}
                  >
                    ?
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              {plain && isOpen && (
                <div className="mt-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1.5">In plain English</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{plain}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
