import { create } from "zustand";
import type { AuthenticatedUser } from "@/types";

interface AuthState {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  setUser: (user: AuthenticatedUser | null) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  hasPermission: (permission) =>
    get().user?.permissions.includes(permission) ?? false,
  reset: () => set({ user: null, isLoading: false }),
}));
