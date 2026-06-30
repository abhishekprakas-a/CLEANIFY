"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { loginSchema, type LoginInput } from "@/schemas/authSchema";
import { roleHomeRoute, routes } from "@/constants";
import type { AuthenticatedUser } from "@/types";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const { user } = await api.post<{ user: AuthenticatedUser }>(
        routes.api.auth.login,
        values,
      );
      setUser(user);
      const next =
        search.get("next") || roleHomeRoute[user.role] || routes.home;
      router.replace(next);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
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
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            className="rounded"
            {...register("remember")}
          />
          Remember me
        </label>
        <Link
          href={routes.forgotPassword}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Forgot password?
        </Link>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
