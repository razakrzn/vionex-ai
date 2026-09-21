import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
  adminAuth: {
    isAuthenticated: boolean;
    adminId?: string;
    adminName?: string;
    adminEmail?: string;
  } | null;
  setAdminAuth: (auth: AdminState["adminAuth"]) => void;
  clearAdminAuth: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      adminAuth: null,
      setAdminAuth: (auth) => set({ adminAuth: auth }),
      clearAdminAuth: () => set({ adminAuth: null }),
    }),
    {
      name: "admin-storage",
    }
  )
);

