"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import type { PaginationMeta } from "@/types";

interface AuditRow {
  id: string;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export function AuditLogTable() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .list<AuditRow>(`/api/audit?page=${page}&limit=20`)
      .then(({ items, meta }) => {
        setRows(items);
        setMeta(meta ?? null);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Card className="overflow-x-auto">
      <CardTitle>Audit log</CardTitle>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="px-2 py-2">When</th>
            <th className="px-2 py-2">Actor</th>
            <th className="px-2 py-2">Action</th>
            <th className="px-2 py-2">Entity</th>
            <th className="px-2 py-2">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                No audit entries.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-2 text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-2 py-2 text-slate-700">
                  {r.actorName ?? "—"}
                </td>
                <td className="px-2 py-2 font-medium text-slate-800">
                  {r.action}
                </td>
                <td className="px-2 py-2 text-slate-500">
                  {r.entityType ? `${r.entityType}:${r.entityId ?? ""}` : "—"}
                </td>
                <td className="px-2 py-2 text-slate-400">{r.ip ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {meta && meta.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
