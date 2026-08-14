import { NextResponse } from "next/server";
import type { PaginationMeta } from "@/types";

// Every API response is per-user/dynamic — never let a browser, CDN, or proxy
// cache authenticated JSON.
const NO_STORE = { "Cache-Control": "no-store" } as const;

export function ok<T>(data: T, meta?: PaginationMeta) {
  return NextResponse.json(
    { success: true as const, data, ...(meta ? { meta } : {}) },
    { status: 200, headers: NO_STORE },
  );
}

export function created<T>(data: T) {
  return NextResponse.json(
    { success: true as const, data },
    { status: 201, headers: NO_STORE },
  );
}

export function failure(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { success: false as const, error: { code, message, details } },
    { status: statusCode, headers: NO_STORE },
  );
}
