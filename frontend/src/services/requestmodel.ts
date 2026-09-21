import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  Method,
} from "axios";
import { useAuthStore } from "@/stores/authStore";
import { usePartnerStore } from "@/stores/partnerStore";
import { useAdminStore } from "@/stores/adminStore";
import base_url from "./base_url";
import { getRefreshTokenHeaders } from "./admin/headers";
import { clearAllCookies } from "@/utils/cookieUtils";

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: AxiosResponse) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as any);
    }
  });
  failedQueue = [];
};

const requestmodel = async (
  httpMethod: Method,
  url: string,
  reqBody?: unknown,
  reqHeader?: Record<string, string>
): Promise<AxiosResponse | AxiosError> => {
  const reqConfig: AxiosRequestConfig = {
    method: httpMethod,
    url,
    data: reqBody,
    headers: reqHeader ?? { "Content-Type": "application/json" },
  };

  try {
    const res = await axios(reqConfig);
    return res;
  } catch (err) {
    const error = err as AxiosError;
    
    // Check if error is 401 Unauthorized or 409 Conflict (token expired)
    if (error.response?.status === 401 || error.response?.status === 409) {
      const statusCode = error.response.status;
      const originalRequest = reqConfig;
      
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry original request with new token
          const authStore = useAuthStore.getState();
          const newToken = authStore.tokens?.access;
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return axios(originalRequest);
        }).catch((err) => {
          return err as AxiosError;
        });
      }
      
      isRefreshing = true;
      
      try {
        // Get refresh token from Zustand
        const authStore = useAuthStore.getState();
        const refreshToken = authStore.tokens?.refresh;
        
        if (!refreshToken) {
          isRefreshing = false;
          processQueue(error, null);
          return error;
        }
        
        // Call refresh token API
        const refreshHeaders = getRefreshTokenHeaders();
        const refreshBody = { refresh: refreshToken };
        
        let refreshResponse: AxiosResponse;
        try {
          refreshResponse = await axios.post(
            `${base_url}/auth/token/refresh/`,
            refreshBody,
            { headers: refreshHeaders }
          );
        } catch (refreshRequestError: any) {
          // Check if refresh token API returned 401 (User not found / token invalid)
          if (refreshRequestError?.response?.status === 401) {
            
            // Clear all Zustand stores
            const authStore = useAuthStore.getState();
            authStore.logout();
            
            const partnerStore = usePartnerStore.getState();
            partnerStore.clearPartnerInfo();
            
            const adminStore = useAdminStore.getState();
            adminStore.clearAdminAuth();
            
            // Clear all cookies
            clearAllCookies();
            
            // Clear localStorage
            localStorage.clear();
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent("auth-status-changed", { detail: { loggedIn: false } }));
            
            // Navigate to home page (if window.location is available)
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
            
          }
          
          isRefreshing = false;
          processQueue(error, null);
          return error;
        }
        
        // Check if response status is 401
        if (refreshResponse.status === 401 || refreshResponse.data?.status_code === 401) {
          
          // Clear all Zustand stores
          const authStore = useAuthStore.getState();
          authStore.logout();
          
          const partnerStore = usePartnerStore.getState();
          partnerStore.clearPartnerInfo();
          
          const adminStore = useAdminStore.getState();
          adminStore.clearAdminAuth();
          
          // Clear all cookies
          clearAllCookies();
          
          // Clear localStorage
          localStorage.clear();
          
          // Clear sessionStorage
          sessionStorage.clear();
          
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent("auth-status-changed", { detail: { loggedIn: false } }));
          
          // Navigate to home page (if window.location is available)
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
          
          
          isRefreshing = false;
          processQueue(error, null);
          return error;
        }
        
        // Extract new access token from response
        // Response format: {access: 'token'} or {data: {access: 'token'}}
        let newAccessToken: string | null = null;
        
        if (refreshResponse.data?.access) {
          // Direct format: {access: 'token'}
          newAccessToken = refreshResponse.data.access;
        } else if (refreshResponse.data?.data?.access) {
          // Nested format: {data: {access: 'token'}}
          newAccessToken = refreshResponse.data.data.access;
        }
        
        if (newAccessToken) {
          // Update Zustand store with new access token
          const currentTokens = authStore.tokens;
          if (currentTokens) {
            authStore.setTokens({
              access: newAccessToken,
              refresh: currentTokens.refresh, // Keep existing refresh token
            });
          }
          
          // Update original request headers with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          } else {
            originalRequest.headers = {
              "Content-Type": originalRequest.headers?.["Content-Type"] || "application/json",
              Authorization: `Bearer ${newAccessToken}`,
            };
          }
          
          // Process queued requests
          isRefreshing = false;
          processQueue(null, newAccessToken);
          
          // Retry original request with new token
          const retryResponse = await axios(originalRequest);
          
          // Mark response to indicate 401 was handled (don't show error)
          (retryResponse as any)._401Handled = true;
          return retryResponse;
        } else {
          isRefreshing = false;
          processQueue(error, null);
          return error;
        }
      } catch (refreshError: any) {
        isRefreshing = false;
        processQueue(error, null);
        
        // Check if refresh token API returned 401 (User not found / token invalid)
        if (refreshError?.response?.status === 401) {
          
          // Clear all Zustand stores
          const authStore = useAuthStore.getState();
          authStore.logout();
          
          const partnerStore = usePartnerStore.getState();
          partnerStore.clearPartnerInfo();
          
          const adminStore = useAdminStore.getState();
          adminStore.clearAdminAuth();
          
          // Clear all cookies
          clearAllCookies();
          
          // Clear localStorage
          localStorage.clear();
          
          // Clear sessionStorage
          sessionStorage.clear();
          
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent("auth-status-changed", { detail: { loggedIn: false } }));
          
          // Navigate to home page (if window.location is available)
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
          
        }
        
        // If refresh fails, return original error
        return error;
      }
    }
    
    // For non-401 errors, return as is
    return error;
  }
};

export default requestmodel;
