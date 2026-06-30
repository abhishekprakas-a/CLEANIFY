/**
 * Convert a Mongoose lean/document object into a plain JSON-safe DTO:
 * - `_id` -> `id` (string)
 * - nested ObjectIds -> strings
 * - Dates -> ISO strings
 * Safe to send to client components.
 */
export function serialize<T = Record<string, unknown>>(input: unknown): T {
  return JSON.parse(JSON.stringify(input, replacer)) as T;
}

function replacer(_key: string, value: unknown): unknown {
  return value;
}

/** Normalise a single document: rename _id to id. */
export function toDto<T = Record<string, unknown>>(doc: unknown): T {
  const plain = serialize<Record<string, unknown>>(doc);
  if (plain && typeof plain === "object" && "_id" in plain) {
    plain.id = String(plain._id);
    delete plain._id;
    delete (plain as Record<string, unknown>).__v;
  }
  return plain as T;
}

export function toDtoList<T = Record<string, unknown>>(docs: unknown[]): T[] {
  return docs.map((d) => toDto<T>(d));
}
