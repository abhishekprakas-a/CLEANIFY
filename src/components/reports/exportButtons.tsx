"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportCsv, exportExcel, exportPdf } from "@/lib/export/reportExport";
import type { ReportPayload } from "@/types";

export function ExportButtons({ payload }: { payload: ReportPayload }) {
  const [busy, setBusy] = useState(false);

  async function run(fn: () => void | Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || payload.rows.length === 0;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          run(() => exportCsv(payload.title, payload.columns, payload.rows))
        }
      >
        CSV
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          run(() => exportExcel(payload.title, payload.columns, payload.rows))
        }
      >
        Excel
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          run(() => exportPdf(payload.title, payload.columns, payload.rows))
        }
      >
        PDF
      </Button>
    </div>
  );
}
