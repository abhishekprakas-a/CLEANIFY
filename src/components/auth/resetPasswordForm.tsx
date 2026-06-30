"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/hooks/useApi";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/schemas/authSchema";
import { routes } from "@/constants";

export function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    try {
      await api.post(routes.api.auth.resetPassword, values);
      setDone(true);
      setTimeout(() => router.replace(routes.login), 1500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Request failed");
    }
  }

  if (!token) {
    return (
      <p className="text-center text-sm text-red-600">
        This reset link is missing its token. Please request a new one.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-center text-sm text-green-700">
        Password updated. Redirecting you to sign in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" value={token} {...register("token")} />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Updating…" : "Update password"}
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
