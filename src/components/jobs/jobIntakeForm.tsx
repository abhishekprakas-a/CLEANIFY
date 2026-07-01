"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TanksField, emptyTank } from "@/components/tanks/tanksField";
import { api } from "@/hooks/useApi";
import { jobIntakeSchema, type JobIntakeInput } from "@/schemas/jobSchema";
import { routes } from "@/constants";
import type { Customer, Job, User } from "@/types";

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

type CustomerMode = "existing" | "new";

export function JobIntakeForm() {
  const router = useRouter();
  const [mode, setMode] = useState<CustomerMode>("existing");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JobIntakeInput>({
    resolver: zodResolver(jobIntakeSchema),
    defaultValues: {
      customer: { id: "" },
      tanks: [emptyTank as never],
      technicianIds: [],
      scheduledTime: "",
    },
  });

  const selectedCustomerId = watch("customer.id");

  useEffect(() => {
    api
      .list<Customer>(`${routes.api.customers}?status=active&limit=200`)
      .then(({ items }) => setCustomers(items))
      .catch(() => {});
    api
      .get<User[]>(routes.api.technicians)
      .then(setTechnicians)
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.mobileNumber.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [customers, search]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  function switchMode(next: CustomerMode) {
    setMode(next);
    setServerError(null);
    if (next === "existing") {
      // Clear inline new-customer fields.
      setValue("customer", { id: selectedCustomerId ?? "" });
    } else {
      // Clear the existing selection.
      setValue("customer", {
        id: "",
        customerName: "",
        mobileNumber: "",
        address: "",
        googleMapLocation: "",
        notes: "",
      });
    }
  }

  async function onSubmit(values: JobIntakeInput) {
    setServerError(null);
    try {
      const job = await api.post<Job>(routes.api.jobsIntake, values);
      router.push(`${routes.admin.jobs}?created=${job.id}`);
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not create the job",
      );
    }
  }

  const customerError = (errors.customer as { message?: string } | undefined)
    ?.message;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* --- Customer ------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Customer</h2>
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs">
            <button
              type="button"
              onClick={() => switchMode("existing")}
              className={`px-3 py-1.5 ${
                mode === "existing"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              Existing
            </button>
            <button
              type="button"
              onClick={() => switchMode("new")}
              className={`px-3 py-1.5 ${
                mode === "new"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              New customer
            </button>
          </div>
        </div>

        {mode === "existing" ? (
          <div className="space-y-2">
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
                <span className="text-slate-700">
                  <span className="font-medium">
                    {selectedCustomer.customerName}
                  </span>{" "}
                  · {selectedCustomer.mobileNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setValue("customer.id", "")}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  className={fieldClass}
                  placeholder="Search customer by name or mobile…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-slate-400">
                      No matching customers. Switch to “New customer”.
                    </p>
                  ) : (
                    filtered.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setValue("customer.id", c.id);
                          setSearch("");
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-700">
                          {c.customerName}
                        </span>
                        <span className="text-slate-400">{c.mobileNumber}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Customer name"
              error={
                (errors.customer as { customerName?: { message?: string } })
                  ?.customerName?.message
              }
              {...register("customer.customerName")}
            />
            <Input
              label="Mobile number"
              error={
                (errors.customer as { mobileNumber?: { message?: string } })
                  ?.mobileNumber?.message
              }
              {...register("customer.mobileNumber")}
            />
            <div className="col-span-2">
              <Input
                label="Address (optional)"
                {...register("customer.address")}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Google Maps link (optional)"
                {...register("customer.googleMapLocation")}
              />
            </div>
          </div>
        )}

        {customerError && (
          <p className="text-xs text-red-600">{customerError}</p>
        )}
      </section>

      {/* --- Tanks --------------------------------------------------------- */}
      <section className="border-t border-slate-100 pt-5">
        <TanksField control={control} register={register} errors={errors} />
      </section>

      {/* --- Schedule ------------------------------------------------------ */}
      <section className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
        <Input
          label="Scheduled date"
          type="date"
          error={errors.scheduledDate?.message}
          {...register("scheduledDate")}
        />
        <Input
          label="Scheduled time (optional)"
          type="time"
          error={errors.scheduledTime?.message}
          {...register("scheduledTime")}
        />
      </section>

      {/* --- Crew ---------------------------------------------------------- */}
      <section className="border-t border-slate-100 pt-5">
        <label className="text-sm font-medium text-slate-700">
          Assign workers (optional)
        </label>
        <p className="mb-2 text-xs text-slate-400">
          Selected workers see this job in their dashboard. You can also assign
          later from the Schedule.
        </p>
        {technicians.length === 0 ? (
          <p className="text-sm text-slate-400">No active technicians.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {technicians.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  value={t.id}
                  {...register("technicianIds")}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {t.name}
              </label>
            ))}
          </div>
        )}
      </section>

      <Textarea
        label="Special instructions (optional)"
        error={errors.specialInstructions?.message}
        {...register("specialInstructions")}
      />

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create job"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
