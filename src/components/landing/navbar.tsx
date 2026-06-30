"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#services", label: "Services" },
  { href: "#pricing", label: "Pricing" },
  { href: "#why", label: "Why us" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar({
  isAuthed,
  homeHref,
}: {
  isAuthed: boolean;
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-brand-700"
        >
          <span className="text-2xl">💧</span>
          <span>AquaClean</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 hover:text-brand-700"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthed ? (
            <Link href={homeHref}>
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-brand-700"
              >
                Log in
              </Link>
              <a href="#pricing">
                <Button>Book now</Button>
              </a>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-2xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-600"
              >
                {l.label}
              </a>
            ))}
            <Link
              href={isAuthed ? homeHref : "/login"}
              className="text-sm font-semibold text-brand-700"
            >
              {isAuthed ? "Go to dashboard" : "Log in"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
