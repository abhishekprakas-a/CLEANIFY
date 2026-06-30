import { env } from "@/lib/env";

type Level = "debug" | "info" | "warn" | "error";

/** Minimal structured (JSON-line) logger — swap the sink for a log service. */
function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta } : {}),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => {
    if (!env.isProd) emit("debug", m, meta);
  },
  info: (m: string, meta?: Record<string, unknown>) => emit("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit("error", m, meta),
};
