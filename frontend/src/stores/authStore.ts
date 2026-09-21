import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number | string;
  email: string;
  full_name: string | null;
  profile_picture: string | null;
  mobile_number: string;
  role?: string;
  role_display?: string;
  custom_role?: string | null;
  seller_type?: string;
  seller_type_display?: string;
  company_name?: string | null;
  license_number?: string | null;
  emirates_id_number?: string | null;
  address?: string | null;
  emirate?: number;
  emirate_name?: string;
  country_name?: string;
  country_code?: string;
  verification_status?: string;
  rejection_note?: string | null;
  is_mobile_verified?: boolean;
  document_uploads?: string | null;
  is_active?: boolean;
  date_joined?: string;
  about_me?: string | null;
  [key: string]: any; // Allow additional fields
}

export interface Tokens {
  access: string;
  refresh: string;
}

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (tokens: Tokens | null) => void;
  login: (user: User, tokens: Tokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setTokens: (tokens) => {
        set({ tokens });
      },

      login: (user, tokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
        // Zustand persist will automatically clear the storage
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: "auth-storage", // Storage key
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

