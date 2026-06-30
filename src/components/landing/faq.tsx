"use client";

import { useState } from "react";

const items = [
  {
    q: "How often should I clean my water tank?",
    a: "We recommend a professional cleaning every 6 months to keep your water safe and free of sediment, algae, and bacteria.",
  },
  {
    q: "How long does a cleaning take?",
    a: "Most residential tanks take 45–90 minutes. Larger commercial tanks may take a couple of hours. We always share before & after photos.",
  },
  {
    q: "Are your chemicals safe?",
    a: "Yes — we use food-grade, eco-friendly disinfectants that are safe for drinking-water tanks and leave no harmful residue.",
  },
  {
    q: "Do I need to be home during the service?",
    a: "Not necessarily. Many customers share gate access; our technician checks in, completes the job, and you approve the photos from your phone.",
  },
  {
    q: "What areas do you serve?",
    a: "We currently operate across the city and nearby suburbs. Enter your area at booking to confirm availability.",
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-slate-800">{item.q}</span>
              <span
                className={`text-brand-600 transition-transform ${isOpen ? "rotate-45" : ""}`}
              >
                ＋
              </span>
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
