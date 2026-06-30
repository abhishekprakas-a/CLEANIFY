import { pagination } from "@/constants";
import type { ListQuery, PaginationMeta } from "@/types";

/** Parse standard list query params (page, limit, sort, q) with safe bounds. */
export function parseListQuery(searchParams: URLSearchParams): ListQuery {
  const page = Math.max(
    pagination.defaultPage,
    Number(searchParams.get("page")) || pagination.defaultPage,
  );
  const rawLimit = Number(searchParams.get("limit")) || pagination.defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), pagination.maxLimit);

  return {
    page,
    limit,
    sort: searchParams.get("sort") || "-createdAt",
    q: searchParams.get("q") || undefined,
  };
}

export function buildMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
