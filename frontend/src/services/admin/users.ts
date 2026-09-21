import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";

/* ---------- Types ---------- */

export interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  role_display?: string;
  mobile_number: string;
  address?: string | null;
  seller_type?: string | null;
  company_name?: string | null;
  license_number?: string | null;
  emirates_id_number?: string | null;
  emirate?: string | null;
  verification_status?: string | null;
  is_mobile_verified: boolean;
  profile_picture?: string | null;
  document_uploads?: string | string[] | null;
  is_active: boolean;
  is_suspended?: boolean;
  date_joined: string;
  [key: string]: any;
}

export interface UsersResponse {
  success?: boolean;
  message?: string;
  data?: AdminUser[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  [key: string]: any;
}

/* ---------- APIs ---------- */

/**
 * Get users by role
 * Sends role as query parameter (e.g., admin, owner, seeker)
 * Uses Bearer token from cookie in Authorization header
 * @param role - User role to filter by (e.g., "admin", "owner", "seeker")
 */
export const getAdminUsersApi = async (role): Promise<AxiosResponse<UsersResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    // Build URL with query parameter
    const url = `${base_url}/users?role=${role}`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user's data
 * Endpoint: GET /users/
 * Uses Bearer token in Authorization header
 */
export const getCurrentUserApi = async (): Promise<AxiosResponse<{ success?: boolean; data?: AdminUser; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    const url = `${base_url}/users/me`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user's data from /users/me/ endpoint
 * Endpoint: GET /users/me/
 * Uses Bearer token in Authorization header
 * Returns single user object (not array)
 */
export const getCurrentUserMeApi = async (): Promise<AxiosResponse<{ success?: boolean; message?: string; data?: AdminUser; status_code?: number; meta?: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    const url = `${base_url}/users/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get agents (users with is_agent=true)
 * Endpoint: GET /users/?is_agent=true
 * Public endpoint - no authentication required
 */
export const getAgentsApi = async (): Promise<AxiosResponse<UsersResponse> | AxiosError> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    const url = `${base_url}/users/?is_owner=true`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};
  
/**
 * Get agent details by ID (public endpoint - no auth required)
 * Endpoint: GET /users/{agentId}/
 * @param agentId - Agent ID to fetch
 */
export const getAgentDetailsApi = async (agentId: string | number): Promise<AxiosResponse<{ success?: boolean; message?: string; data?: AdminUser | AdminUser[]; status_code?: number; meta?: any }> | AxiosError> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    const url = `${base_url}/users/${agentId}/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user details by ID (admin endpoint - requires auth)
 * Endpoint: GET /users/{userId}/
 * Uses Bearer token in Authorization header
 * @param userId - User ID to fetch
 */
export const getUserByIdApi = async (userId: string | number): Promise<AxiosResponse<{ success?: boolean; message?: string; data?: AdminUser; status_code?: number; meta?: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    const url = `${base_url}/users/${userId}/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user's data
 * Endpoint: PUT /users/{userId}/ or PATCH /users/{userId}/
 * Uses Bearer token in Authorization header
 * @param userId - User ID to update
 * @param payload - FormData or object with user data to update
 * @param method - HTTP method to use (PUT or PATCH), defaults to PUT
 */
export const updateUserApi = async (
  userId: string | number,
  payload: FormData | Record<string, any>,
  method: "PUT" | "PATCH" = "PUT"
): Promise<AxiosResponse<{ success?: boolean; data?: AdminUser; [key: string]: any }> | AxiosError> => {
  try {
    // Get auth headers
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;
    
    // Build headers - if FormData, don't set Content-Type (browser will set it with boundary)
    const headers: Record<string, string> = {};
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    // Only set Content-Type for non-FormData payloads
    if (!(payload instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    
    const url = `${base_url}/users/${userId}/`;
    const response = await requestmodel(method, url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Suspend user
 * Endpoint: POST /users/{userId}/suspend/
 * Uses Bearer token in Authorization header
 */
export const suspendUserApi = async (
  userId: string | number,
  reason: string
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${base_url}/users/${userId}/suspend/`;
    const response = await requestmodel("POST", url, { reason }, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Activate user
 * Endpoint: POST /users/{userId}/activate/
 * Uses Bearer token in Authorization header
 */
export const activateUserApi = async (
  userId: string | number
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${base_url}/users/${userId}/activate/`;
    const response = await requestmodel("POST", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user
 * Endpoint: DELETE /users/{userId}/
 * Uses Bearer token in Authorization header
 */
export const deleteUserApi = async (
  userId: string | number
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${base_url}/users/${userId}/`;
    const response = await requestmodel("DELETE", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

