import { useAuthStore } from "@/stores/authStore";

/**
 * Common reusable function to get headers with Bearer token
 * Uses only Zustand store (no cookies/localStorage for Ionic compatibility)
 */
export const getAuthHeaders = (): Record<string, string> => {
  // Get token from Zustand store only
  const authStore = useAuthStore.getState();
  const accessToken = authStore.tokens?.access || null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return headers;
};

/**
 * Common reusable function to get headers with Bearer refresh token
 * Gets refresh_token from Zustand store
 */
export const getRefreshTokenHeaders = (): Record<string, string> => {
  // Get refresh_token from Zustand store
  const authStore = useAuthStore.getState();
  const refreshToken = authStore.tokens?.refresh || null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (refreshToken) {
    headers["Authorization"] = `Bearer ${refreshToken}`;
  }


  return headers;
};

