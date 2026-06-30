"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/hooks/useApi";
import {
  createCustomerSchema,
  type CreateCustomerInput,
} from "@/schemas/customerSchema";
import { routes } from "@/constants";
import type { Customer } from "@/types";

interface CustomerFormProps {
  /** When provided, the form edits this customer; otherwise it creates one. */
  customer?: Customer;
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(customer);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      customerName: customer?.customerName ?? "",
      mobileNumber: customer?.mobileNumber ?? "",
      address: customer?.address ?? "",
      googleMapLocation: customer?.googleMapLocation ?? "",
      notes: customer?.notes ?? "",
    },
  });

  async function onSubmit(values: CreateCustomerInput) {
    setServerError(null);
    try {
      const saved = isEdit
        ? await api.patch<Customer>(
            `${routes.api.customers}/${customer!.id}`,
            values,
          )
        : await api.post<Customer>(routes.api.customers, values);
      router.push(`${routes.admin.customers}/${saved.id}`);
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not save customer",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <Input
        label="Customer name"
        error={errors.customerName?.message}
        {...register("customerName")}
      />
      <Input
        label="Mobile number"
        inputMode="tel"
        error={errors.mobileNumber?.message}
        {...register("mobileNumber")}
      />
      <Textarea
        label="Address"
        error={errors.address?.message}
        {...register("address")}
      />
      <Input
        label="Google Maps link (optional)"
        placeholder="https://maps.google.com/..."
        error={errors.googleMapLocation?.message}
        {...register("googleMapLocation")}
      />
      <Textarea
        label="Notes (optional)"
        error={errors.notes?.message}
        {...register("notes")}
      />

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
