/**
 * A safe href for a user-pasted map link. Real http(s) links pass through;
 * a scheme-less link (e.g. `maps.app.goo.gl/…` from WhatsApp — BG-05) is
 * prefixed with `https://`. Prefixing also neutralizes dangerous schemes like
 * `javascript:`/`data:` (they become an inert `https://javascript:…`), so the
 * result is always safe to use as an anchor href. Returns null when empty.
 */
export function toMapHref(link?: string | null): string | null {
  const v = link?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
