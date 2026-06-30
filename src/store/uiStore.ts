import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface UiState {
  sidebarOpen: boolean;
  isOffline: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  setOffline: (offline: boolean) => void;
  pushToast: (message: string, variant?: Toast["variant"]) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  isOffline: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (sidebarOpen) => set({ sidebarOpen }),
  setOffline: (isOffline) => set({ isOffline }),
  pushToast: (message, variant = "info") =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: `${Date.now()}-${s.toasts.length}`, message, variant },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
