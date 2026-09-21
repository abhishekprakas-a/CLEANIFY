import { cn } from "@/lib/cn";

/**
 * Cleanify wordmark — the "cleanify" lettering with the teal wavy underline,
 * drawn as an inline SVG. No external image (avoids a network request / 404),
 * scales crisply, and themes via the `variant`. Height is set via `className`
 * (e.g. "h-9"); width scales automatically.
 *
 * If real PNG artwork is ever supplied, drop it in /public/brand and swap this
 * back to an <img> with an SVG fallback.
 */
const COLORS = {
  light: { text: "#0f2a30", wave: "#12a79a" },
  dark: { text: "#eaf7f4", wave: "#46d6c9" },
} as const;

export function Logo({
  className,
  variant = "light",
  alt = "Cleanify",
}: {
  className?: string;
  variant?: "light" | "dark";
  alt?: string;
}) {
  const c = COLORS[variant];
  return (
    <svg
      viewBox="0 0 212 66"
      className={cn("w-auto", className)}
      role="img"
      aria-label={alt}
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
