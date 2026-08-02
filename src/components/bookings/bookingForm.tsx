"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  TanksField,
  emptyItemFor,
  emptyTank,
} from "@/components/tanks/tanksField";
import { api } from "@/hooks/useApi";
import {
  createBookingSchema,
  type CreateBookingInput,
} from "@/schemas/bookingSchema";
import {
  allServiceTypes,
  routes,
  serviceConfig,
  type ServiceType,
} from "@/constants";
import type { Booking, Customer, TankEntry } from "@/types";

const fieldClass =
  "h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

/** yyyy-mm-dd for the date input. */
function toDateInput(iso?: string): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

export function BookingForm({
  defaultCustomerId,
  booking,
}: {
  defaultCustomerId?: string;
  /** When provided, the form edits this booking instead of creating one (BG-07b). */
  booking?: Booking;
}) {
  const router = useRouter();
  const isEdit = Boolean(booking);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // Inline "add customer" (BG-04).
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({
    customerName: "",
    mobileNumber: "",
    address: "",
  });
  const [savingCust, setSavingCust] = useState(false);
  const [custError, setCustError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: booking
      ? {
          customerId: booking.customerId,
          serviceType: booking.serviceType ?? "waterTank",
          workName: booking.workName ?? "",
          totalCharge: booking.totalCharge as never,
          tanks: booking.tanks as TankEntry[],
          scheduledDate: toDateInput(booking.scheduledDate) as never,
          scheduledTime: booking.scheduledTime ?? "",
          specialInstructions: booking.specialInstructions ?? "",
        }
      : {
          customerId: defaultCustomerId ?? "",
          serviceType: "waterTank",
          workName: "",
          tanks: [emptyTank as never],
        },
  });

  const selectedCustomerId = watch("customerId");
  const selectedService = (watch("serviceType") ?? "waterTank") as ServiceType;

  // Switching service replaces the items with a fresh one for that service.
  function changeService(next: ServiceType) {
    setValue("serviceType", next);
    setValue("tanks", [emptyItemFor(next) as never]);
  }

  useEffect(() => {
    api
      .list<Customer>(`${routes.api.customers}?status=active&limit=200`)
      .then(({ items }) => setCustomers(items))
      .catch(() => {});
  }, []);

  async function addCustomer() {
    setCustError(null);
    if (
      !newCust.customerName.trim() ||
      !newCust.mobileNumber.trim() ||
      newCust.address.trim().length < 5
    ) {
      setCustError("Name, mobile number, and a full address are required.");
      return;
    }
    setSavingCust(true);
    try {
      const created = await api.post<Customer>(routes.api.customers, {
        customerName: newCust.customerName.trim(),
        mobileNumber: newCust.mobileNumber.trim(),
        address: newCust.address.trim(),
      });
      setCustomers((prev) => [created, ...prev]);
      setValue("customerId", created.id, { shouldValidate: true });
      setShowNewCustomer(false);
      setNewCust({ customerName: "", mobileNumber: "", address: "" });
    } catch (err) {
      setCustError(
        err instanceof Error ? err.message : "Could not add customer",
      );
    } finally {
      setSavingCust(false);
    }
  }

  async function onSubmit(values: CreateBookingInput) {
    setServerError(null);
    try {
      if (isEdit && booking) {
        await api.patch(`${routes.api.bookings}/${booking.id}`, values);
        router.push(`${routes.admin.bookings}/${booking.id}`);
      } else {
        const created = await api.post<Booking>(routes.api.bookings, values);
        router.push(`${routes.admin.bookings}?created=${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not save booking",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="customerId"
            className="text-sm font-medium text-slate-700"
          >
            Customer
          </label>
          <button
            type="button"
            onClick={() => setShowNewCustomer((v) => !v)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {showNewCustomer ? "Cancel" : "+ New customer"}
          </button>
        </div>
        <select
          id="customerId"
          className={fieldClass}
          value={selectedCustomerId ?? ""}
          onChange={(e) =>
            setValue("customerId", e.target.value, { shouldValidate: true })
          }
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.customerName} · {c.mobileNumber}
            </option>
          ))}
        </select>
        {errors.customerId && (
          <span className="text-xs text-red-600">
            {errors.customerId.message}
          </span>
        )}

        {showNewCustomer && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                className={`${fieldClass} w-full`}
                placeholder="Customer name"
                value={newCust.customerName}
                onChange={(e) =>
                  setNewCust((s) => ({ ...s, customerName: e.target.value }))
                }
              />
              <input
                className={`${fieldClass} w-full`}
                placeholder="Mobile number"
                value={newCust.mobileNumber}
                onChange={(e) =>
                  setNewCust((s) => ({ ...s, mobileNumber: e.target.value }))
                }
              />
            </div>
            <input
              className={`${fieldClass} w-full`}
              placeholder="Address"
              value={newCust.address}
              onChange={(e) =>
                setNewCust((s) => ({ ...s, address: e.target.value }))
              }
            />
            {custError && <p className="text-xs text-red-600">{custError}</p>}
            <Button
              type="button"
              size="sm"
              disabled={savingCust}
              onClick={addCustomer}
            >
              {savingCust ? "Saving…" : "Save customer"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="serviceType"
            className="text-sm font-medium text-slate-700"
          >
            Service type
          </label>
          <select
            id="serviceType"
            className={fieldClass}
            value={selectedService}
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
          placeholder="e.g. Water tank cleaning"
          {...register("workName")}
        />
      </div>

      <TanksField
        control={control}
        register={register}
        errors={errors}
        getValues={getValues}
        serviceType={selectedService}
      />

      <Input
        label="Total amount (₹)"
        type="number"
        min={0}
        step="0.01"
        placeholder="Total charge for this booking"
        error={errors.totalCharge?.message as string | undefined}
        {...register("totalCharge")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Scheduled date"
          type="date"
          error={errors.scheduledDate?.message}
          {...register("scheduledDate")}
        />
        <Input
          label="Scheduled time"
          type="time"
          error={errors.scheduledTime?.message}
          {...register("scheduledTime")}
        />
      </div>

      <Textarea
        label="Special instructions (optional)"
        error={errors.specialInstructions?.message}
        {...register("specialInstructions")}
      />

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Create booking"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
