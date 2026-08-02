"use client";

import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormGetValues,
  type FieldValues,
  type ArrayPath,
  type Path,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { serviceConfig, type ServiceType } from "@/constants";

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

/** A fresh empty line item for the given service (first variant selected). */
export function emptyItemFor(service: ServiceType = "waterTank") {
  const cfg = serviceConfig[service];
  return {
    name: "",
    tankType: cfg.variantOptions[0],
    capacityLitres: service === "waterTank" ? 1000 : undefined,
    quantity: 1,
    risk: undefined,
  };
}

/** Back-compat default (water tank) used by forms that start on that service. */
export const emptyTank = emptyItemFor("waterTank");

/**
 * Repeatable list of service line items bound to a react-hook-form `tanks`
 * field array. Labels/options adapt to `serviceType`. Count-driven services
 * (water tank) show a single "Number of …" control that generates one card per
 * item — each with its own capacity/risk — instead of manual add/remove rows.
 */
export function TanksField<T extends FieldValues>({
  control,
  register,
  errors,
  getValues,
  serviceType = "waterTank",
}: {
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  getValues: UseFormGetValues<T>;
  serviceType?: ServiceType;
}) {
  const cfg = serviceConfig[serviceType];
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "tanks" as ArrayPath<T>,
  });

  const row = (i: number, leaf: string) => `tanks.${i}.${leaf}` as Path<T>;
  const tanksError = (errors as Record<string, unknown>).tanks as
    | { message?: string; [k: number]: Record<string, { message?: string }> }
    | undefined;

  const item = cfg.itemLabel.toLowerCase();

  /** Grow/shrink the item cards to `n`, preserving already-entered values. */
  function setCount(n: number) {
    const count = Math.max(1, Math.min(100, Math.floor(n) || 1));
    const current = (getValues("tanks" as Path<T>) as unknown[]) ?? [];
    const next = Array.from(
      { length: count },
      (_, i) => current[i] ?? emptyItemFor(serviceType),
    );
    replace(next as never);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          {cfg.itemLabel}s
        </label>
        {cfg.countDriven ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{cfg.quantityLabel}</span>
            <input
              type="number"
              min={1}
              max={100}
              value={fields.length}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-sm"
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append(emptyItemFor(serviceType) as never)}
          >
            + Add {item}
          </Button>
        )}
      </div>

      {typeof tanksError?.message === "string" && (
        <p className="text-xs text-red-600">{tanksError.message}</p>
      )}

      {fields.map((field, i) => (
        <div
          key={field.id}
          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400">
              {cfg.itemLabel} {i + 1}
            </span>
            {!cfg.countDriven && fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!cfg.countDriven && (
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-slate-500">
                  Name / identifier (optional)
                </label>
                <input
                  className={fieldClass}
                  placeholder={`e.g. ${cfg.itemLabel} label`}
                  {...register(row(i, "name"))}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">
                {cfg.variantLabel}
              </label>
              <select
                className={`${fieldClass} capitalize`}
                {...register(row(i, "tankType"))}
              >
                {cfg.variantOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {cfg.measureLabel && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">
                  {cfg.measureLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  {...register(row(i, "capacityLitres"))}
                />
                {tanksError?.[i]?.capacityLitres?.message && (
                  <span className="text-xs text-red-600">
                    {tanksError[i].capacityLitres!.message}
                  </span>
                )}
              </div>
            )}

            {!cfg.countDriven && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">
                  {cfg.quantityLabel} (optional)
                </label>
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  {...register(row(i, "quantity"))}
                />
              </div>
            )}

            {cfg.hasRisk && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">
                  Risk (1 low – 10 high)
                </label>
                <select className={fieldClass} {...register(row(i, "risk"))}>
                  <option value="">—</option>
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
