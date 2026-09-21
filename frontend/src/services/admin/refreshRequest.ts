import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getRefreshTokenHeaders } from "./headers";
import { useAuthStore } from "@/stores/authStore";

/* ---------- Types ---------- */

export interface RefreshTokenResponse {
  success?: boolean;
  message?: string;
  data?: {
    access: string;
    refresh?: string;
  };
  [key: string]: any;
}

/* ---------- APIs ---------- */

/**
 * Refresh access token using refresh token
 * Endpoint: /auth/token/refresh/
 * Uses Bearer refresh_token from Zustand store in Authorization header
 */
export const refreshTokenRequest = async (): Promise<AxiosResponse<RefreshTokenResponse> | AxiosError> => {
  try {
    // Get refresh token from Zustand store
    const authStore = useAuthStore.getState();
    const refreshToken = authStore.tokens?.refresh || null;
    
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    
    // Get headers with Bearer refresh token
    const headers = getRefreshTokenHeaders();
    
    // Prepare request body with refresh token
    const requestBody = {
      refresh: refreshToken,
    };
    
    const response = await requestmodel("POST", `${base_url}/auth/token/refresh/`, requestBody, headers);
    
    if ('data' in response && 'status' in response) {
      // It's an AxiosResponse
      // Handle different response formats
      // Format 1: {access: 'token'}
      // Format 2: {data: {access: 'token'}}
      let newAccessToken: string | null = null;
      let newRefreshToken: string | null = null;
      
      if (response.data?.access) {
        // Direct format: {access: 'token'}
        newAccessToken = response.data.access;
        newRefreshToken = response.data.refresh || refreshToken;
      } else if (response.data?.data?.access) {
        // Nested format: {data: {access: 'token'}}
        newAccessToken = response.data.data.access;
        newRefreshToken = response.data.data.refresh || refreshToken;
      }
      
      if (newAccessToken) {
        // Update tokens in Zustand store
        authStore.setTokens({
          access: newAccessToken,
          refresh: newRefreshToken || refreshToken,
        });
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

