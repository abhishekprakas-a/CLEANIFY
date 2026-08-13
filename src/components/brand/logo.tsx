"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Cleanify wordmark — the "cleanify" lettering with the teal wavy underline.
 *
 * If brand artwork exists in /public/brand it is used; otherwise a built-in
 * SVG wordmark (with the wave) renders, so the logo — including the line — is
 * always present. To use exact artwork, drop these files in /public/brand:
 *   • cleanify-wordmark.png       — dark text, for LIGHT backgrounds
 *   • cleanify-wordmark-dark.png  — light text, for DARK backgrounds
 *
 * Height is set via `className` (e.g. "h-9"); width scales automatically.
 */
const SRC = {
  light: "/brand/cleanify-wordmark.png",
  dark: "/brand/cleanify-wordmark-dark.png",
} as const;

const COLORS = {
  light: { text: "#0f2a30", wave: "#12a79a" },
  dark: { text: "#eaf7f4", wave: "#46d6c9" },
} as const;

function WordmarkSvg({
  variant,
  className,
}: {
  variant: "light" | "dark";
  className?: string;
}) {
  const c = COLORS[variant];
  return (
    <svg
      viewBox="0 0 212 66"
      className={cn("w-auto", className)}
      role="img"
      aria-label="Cleanify"
    >
      <text
        x="6"
        y="45"
        textLength="200"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="'Nunito','Baloo 2','Quicksand','Segoe UI',system-ui,sans-serif"
        fontSize="46"
        fontWeight="800"
        letterSpacing="-1.5"
        fill={c.text}
      >
        cleanify
      </text>
      <path
        d="M14 56 Q 62 46 110 55 T 200 53"
        fill="none"
        stroke={c.wave}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  variant = "light",
  alt = "Cleanify",
}: {
  className?: string;
  variant?: "light" | "dark";
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Catch images that already failed to load before React hydrated (onError
  // won't fire for those), so the SVG wordmark still shows.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return <WordmarkSvg variant={variant} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={SRC[variant]}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("w-auto object-contain", className)}
    />
  );
}
