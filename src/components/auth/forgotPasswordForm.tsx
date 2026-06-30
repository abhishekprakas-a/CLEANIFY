"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/hooks/useApi";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/schemas/authSchema";
import { routes } from "@/constants";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    try {
      await api.post(routes.api.auth.forgotPassword, values);
      setSent(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Request failed");
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-600">
          If an account exists for that email, a password reset link has been
          sent. Please check your inbox.
        </p>
        <Link
          href={routes.login}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
      <Link
        href={routes.login}
        className="text-center text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Back to sign in
      </Link>
    </form>
  );
}
