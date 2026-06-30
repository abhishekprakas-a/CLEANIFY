"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/hooks/useApi";
import {
  createBookingSchema,
  type CreateBookingInput,
} from "@/schemas/bookingSchema";
import { allTankTypes, routes } from "@/constants";
import type { Booking, Customer } from "@/types";

const fieldClass =
  "h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function BookingForm({
  defaultCustomerId,
}: {
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: defaultCustomerId ?? "",
      tankType: "overhead",
      numberOfTanks: 1,
    },
  });

  useEffect(() => {
    api
      .list<Customer>(`${routes.api.customers}?status=active&limit=100`)
      .then(({ items }) => setCustomers(items))
      .catch(() => {});
  }, []);

  async function onSubmit(values: CreateBookingInput) {
    setServerError(null);
    try {
      const booking = await api.post<Booking>(routes.api.bookings, values);
      router.push(`${routes.admin.bookings}?created=${booking.id}`);
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
        <label
          htmlFor="customerId"
          className="text-sm font-medium text-slate-700"
        >
          Customer
        </label>
        <select
          id="customerId"
          className={fieldClass}
          {...register("customerId")}
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
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="tankType"
          className="text-sm font-medium text-slate-700"
        >
          Tank type
        </label>
        <select
          id="tankType"
          className={`${fieldClass} capitalize`}
          {...register("tankType")}
        >
          {allTankTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tank capacity (litres)"
          type="number"
          min={1}
          error={errors.tankCapacity?.message}
          {...register("tankCapacity")}
        />
        <Input
          label="Number of tanks"
          type="number"
          min={1}
          error={errors.numberOfTanks?.message}
          {...register("numberOfTanks")}
        />
      </div>

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
          {isSubmitting ? "Saving…" : "Create booking"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
