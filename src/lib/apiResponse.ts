import { NextResponse } from "next/server";
import type { PaginationMeta } from "@/types";

export function ok<T>(data: T, meta?: PaginationMeta) {
  return NextResponse.json(
    { success: true as const, data, ...(meta ? { meta } : {}) },
    { status: 200 },
  );
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true as const, data }, { status: 201 });
}

export function failure(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { success: false as const, error: { code, message, details } },
    { status: statusCode },
  );
}
