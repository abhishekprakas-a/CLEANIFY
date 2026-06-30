"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { createUserSchema, type CreateUserInput } from "@/schemas/authSchema";
import { allRoles, routes } from "@/constants";
import type { User } from "@/types";

const fieldClass = "h-10 rounded-lg border border-slate-300 px-3 text-sm";

export function StaffManager() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<User[]>(routes.api.users)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "technician" },
  });

  async function onCreate(values: CreateUserInput) {
    try {
      await api.post<User>(routes.api.users, values);
      toast.success(`${values.name} added`);
      reset({ role: "technician" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add staff");
    }
  }

  async function toggleStatus(u: User) {
    const next = u.status === "active" ? "inactive" : "active";
    try {
      await api.patch<User>(`${routes.api.users}/${u.id}`, { status: next });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Create form */}
      <Card className="lg:col-span-1">
        <CardTitle>Add staff</CardTitle>
        <form onSubmit={handleSubmit(onCreate)} className="mt-3 space-y-3">
          <Input
            label="Name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Phone"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select className={fieldClass} {...register("role")}>
              {allRoles.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adding…" : "Add staff"}
          </Button>
        </form>
      </Card>

      {/* List */}
      <Card className="overflow-x-auto lg:col-span-2">
        <CardTitle>Staff ({users.length})</CardTitle>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 font-medium text-slate-800">{u.name}</td>
                  <td className="py-2 text-slate-600">{u.email}</td>
                  <td className="py-2 capitalize text-slate-600">{u.role}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        u.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => toggleStatus(u)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
