/** Escape a user string for safe use inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip ASCII control characters from free text and trim. */
export function cleanText(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    // Keep printable characters (drop C0 controls and DEL).
    if (code >= 32 && code !== 127) out += ch;
  }
  return out.trim();
}

/**
 * Recursively strip MongoDB operator keys (`$...`) and dotted keys from an
 * object to prevent NoSQL operator injection. Zod schemas already whitelist
 * fields, so this is defence in depth for any raw object reaching a query.
 */
export function stripMongoOperators<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((v) => stripMongoOperators(v)) as unknown as T;
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = stripMongoOperators(value);
    }
    return out as T;
  }
  return input;
}
