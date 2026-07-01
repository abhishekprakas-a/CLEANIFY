"use client";

import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type FieldValues,
  type ArrayPath,
  type Path,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { allTankTypes } from "@/constants";

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

/** Empty tank line used when adding a row. */
export const emptyTank = {
  name: "",
  tankType: "overhead",
  capacityLitres: 1000,
  quantity: 1,
  cleaningCharge: undefined,
};

/**
 * Repeatable "Add Tank" list bound to a react-hook-form `tanks` field array.
 * Generic over the parent form so it works in both the booking and job-intake
 * forms. The parent schema must expose a `tanks` array of tank entries.
 */
export function TanksField<T extends FieldValues>({
  control,
  register,
  errors,
}: {
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "tanks" as ArrayPath<T>,
  });

  const row = (i: number, leaf: string) => `tanks.${i}.${leaf}` as Path<T>;
  const tanksError = (errors as Record<string, unknown>).tanks as
    | { message?: string; [k: number]: Record<string, { message?: string }> }
    | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Tanks</label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append(emptyTank as never)}
        >
          + Add tank
        </Button>
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
              Tank {i + 1}
            </span>
            {fields.length > 1 && (
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
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-slate-500">
                Name / identifier (optional)
              </label>
              <input
                className={fieldClass}
                placeholder="e.g. Rooftop tank"
                {...register(row(i, "name"))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Tank type</label>
              <select
                className={`${fieldClass} capitalize`}
                {...register(row(i, "tankType"))}
              >
                {allTankTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">
                Capacity (litres)
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

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">
                Quantity (optional)
              </label>
              <input
                type="number"
                min={1}
                className={fieldClass}
                {...register(row(i, "quantity"))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">
                Cleaning charge (optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={fieldClass}
                placeholder="₹"
                {...register(row(i, "cleaningCharge"))}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
