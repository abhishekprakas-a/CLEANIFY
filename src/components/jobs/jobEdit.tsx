"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TanksField, emptyItemFor } from "@/components/tanks/tanksField";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { updateJobSchema, type UpdateJobInput } from "@/schemas/jobSchema";
import {
  allServiceTypes,
  routes,
  serviceConfig,
  terminalJobStatuses,
  type ServiceType,
} from "@/constants";
import type { Job } from "@/types";

type Workload = { id: string; name: string; activeJobs: number };
type PopRef = {
  id?: string;
  _id?: string;
  name?: string;
  customerName?: string;
  mobileNumber?: string;
  address?: string;
};
type JobDetail = Omit<Job, "customer" | "assignedTechnicians"> & {
  customer?: string | PopRef;
  assignedTechnicians?: (string | PopRef)[];
};

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function refId(ref: string | PopRef | undefined): string {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  return String(ref.id ?? ref._id ?? "");
}

function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function JobEdit({ id }: { id: string }) {
  const toast = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [crew, setCrew] = useState<string[]>([]);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [savingCrew, setSavingCrew] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateJobInput>({ resolver: zodResolver(updateJobSchema) });

  const service = (watch("serviceType") ?? "waterTank") as ServiceType;

  const loadWorkload = useCallback(() => {
    api
      .get<Workload[]>(routes.api.workload)
      .then(setWorkload)
      .catch(() => {});
  }, []);

  const loadJob = useCallback(() => {
    api
      .get<JobDetail>(`${routes.api.jobs}/${id}`)
      .then((j) => {
        setJob(j);
        reset({
          workName: j.workName ?? "",
          serviceType: (j.serviceType as ServiceType) ?? "waterTank",
          totalCharge: j.totalCharge,
          googleMapLocation: j.googleMapLocation ?? "",
          landmark: j.landmark ?? "",
          tanks: (j.tanks ?? []) as never,
        });
        setCrew((j.assignedTechnicians ?? []).map(refId).filter(Boolean));
        setSchedDate(toDateInput(j.scheduledDate));
        setSchedTime(j.scheduledTime ?? "");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load job"),
      );
  }, [id, reset]);

  useEffect(() => {
    loadJob();
    loadWorkload();
  }, [loadJob, loadWorkload]);

  function changeService(next: ServiceType) {
    setValue("serviceType", next);
    setValue("tanks", [emptyItemFor(next) as never]);
  }

  function toggleCrew(techId: string) {
    setCrew((prev) =>
      prev.includes(techId)
        ? prev.filter((x) => x !== techId)
        : [...prev, techId],
    );
  }

  async function saveDetails(values: UpdateJobInput) {
    try {
      await api.patch(`${routes.api.jobs}/${id}`, values);
      toast.success("Job details saved");
      loadJob();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save details");
    }
  }

  async function saveCrew() {
    if (crew.length === 0) {
      toast.error("Select at least one worker");
      return;
    }
    if (!schedDate) {
      toast.error("Set a scheduled date");
      return;
    }
    setSavingCrew(true);
    try {
      await api.patch(`${routes.api.jobs}/${id}/assign`, {
        technicianIds: crew,
        scheduledDate: schedDate,
        scheduledTime: schedTime || undefined,
      });
      toast.success("Workers assigned & notified");
      loadJob();
      loadWorkload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign");
    } finally {
      setSavingCrew(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!job) return <p className="text-sm text-slate-400">Loading…</p>;

  const customer = typeof job.customer === "object" ? job.customer : undefined;
  const isTerminal = terminalJobStatuses.includes(job.status);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={routes.admin.jobs}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← All jobs
        </Link>
        <Badge status={job.status} />
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{job.jobCode}</h1>
        {customer && (
          <p className="text-sm text-slate-500">
            {customer.customerName}
            {customer.mobileNumber ? ` · ${customer.mobileNumber}` : ""}
          </p>
        )}
      </div>

      {isTerminal && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          This job is {job.status}; it can no longer be edited or reassigned.
        </div>
      )}

      {/* --- Crew & schedule (assign / reassign) ------------------------- */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Workers &amp; schedule
          </h2>
          <p className="text-xs text-slate-400">
            Assign or reassign workers — even if the job is already assigned to
            someone else. Each worker&apos;s current job count is shown. Assigned
            workers are notified.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Scheduled date
            </label>
            <input
              type="date"
              className={fieldClass}
              value={schedDate}
              disabled={isTerminal}
              onChange={(e) => setSchedDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Time (optional)
            </label>
            <input
              type="time"
              className={fieldClass}
              value={schedTime}
              disabled={isTerminal}
              onChange={(e) => setSchedTime(e.target.value)}
            />
          </div>
        </div>

        {workload.length === 0 ? (
          <p className="text-sm text-slate-400">No active technicians.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {workload.map((t) => {
              const checked = crew.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                    checked
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-200 hover:bg-slate-50"
                  } ${isTerminal ? "opacity-60" : ""}`}
                >
                  <span className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={checked}
                      disabled={isTerminal}
                      onChange={() => toggleCrew(t.id)}
                    />
                    {t.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      t.activeJobs >= 5
                        ? "bg-red-100 text-red-700"
                        : t.activeJobs > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.activeJobs} job{t.activeJobs === 1 ? "" : "s"}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <Button
          type="button"
          onClick={saveCrew}
          disabled={savingCrew || isTerminal}
        >
          {savingCrew ? "Saving…" : "Assign / update workers"}
        </Button>
      </section>

      {/* --- Details ----------------------------------------------------- */}
      <form
        onSubmit={handleSubmit(saveDetails)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-slate-800">Job details</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Service type
            </label>
            <select
              className={fieldClass}
              value={service}
              disabled={isTerminal}
              onChange={(e) => changeService(e.target.value as ServiceType)}
            >
              {allServiceTypes.map((s) => (
                <option key={s} value={s}>
                  {serviceConfig[s].label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Work name (optional)"
            disabled={isTerminal}
            {...register("workName")}
          />
        </div>

        <TanksField
          control={control}
          register={register}
          errors={errors}
          getValues={getValues}
          serviceType={service}
        />

        <Input
          label="Total amount (₹)"
          type="number"
          min={0}
          step="0.01"
          disabled={isTerminal}
          error={errors.totalCharge?.message}
          {...register("totalCharge")}
        />

        <Input
          label="Google Maps link (optional)"
          placeholder="Location link for the assigned worker"
          disabled={isTerminal}
          error={errors.googleMapLocation?.message as string | undefined}
          {...register("googleMapLocation")}
        />
        <Input
          label="Landmark (optional)"
          placeholder="e.g. behind the temple, blue gate"
          disabled={isTerminal}
          {...register("landmark")}
        />

        <Button type="submit" disabled={isSubmitting || isTerminal}>
          {isSubmitting ? "Saving…" : "Save details"}
        </Button>
      </form>
    </div>
  );
}
