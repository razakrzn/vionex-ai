import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface SubscriptionPlan {
  id: number;
  name: string;
  role: string;
  seller_type?: string;
  price: number;
  offer_price?: number;
  is_offer?: boolean;
  offer_percentage?: string;
  duration_days: number;
  max_listings?: number | null;
  currency?: string;
  description?: string;
  is_active?: boolean;
  is_duration_unlimited?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionPlansResponse {
  success?: boolean;
  message?: string;
  data?: SubscriptionPlan[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface AssignSubscriptionPayload {
  user_id: number;
  plan_id: number;
}

export interface CancelSubscriptionPayload {
  user_id: number;
}

export interface SubscriptionPlanResponse {
  success?: boolean;
  message?: string;
  data?: SubscriptionPlan;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface CreateSubscriptionPlanPayload {
  name: string;
  role: string;
  seller_type?: string;
  price: number | string;
  is_offer?: boolean;
  offer_percentage?: string;
  duration_days: number;
  max_listings?: number | null;
  currency?: string;
  description?: string;
  is_active?: boolean;
  is_duration_unlimited?: boolean;
}

export interface UpdateSubscriptionPlanPayload {
  name?: string;
  role?: string;
  seller_type?: string;
  price?: number | string;
  is_offer?: boolean;
  offer_percentage?: string;
  duration_days?: number;
  max_listings?: number | null;
  currency?: string;
  description?: string;
  is_active?: boolean;
  is_duration_unlimited?: boolean;
}

export interface RoleOption {
  id: number;
  name: string;
}

export interface RoleOptionsResponse {
  success?: boolean;
  message?: string;
  data?: RoleOption[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/* ---------- APIs ---------- */

/**
 * Get all subscription plans
 * Uses Bearer token in Authorization header
 */
export const getSubscriptionPlansApi = async (): Promise<
  AxiosResponse<SubscriptionPlansResponse> | AxiosError
> => {
  try {
    const headers = getAuthHeaders();
    // Backend endpoint for plans is /payments/plans/
    const url = `${base_url}/payments/plans/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get subscription plans by role (and optional seller_type)
 * Endpoint: GET /payments/plans?role=...&seller_type=...
 */
export const getSubscriptionPlansByRoleApi = async (
  role: string,
  sellerType?: string
): Promise<AxiosResponse<SubscriptionPlansResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const params = new URLSearchParams({ role });
    if (sellerType) {
      params.append("seller_type", sellerType);
    }
    const url = `${base_url}/payments/plans?${params.toString()}`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Assign subscription to user
 * Endpoint: POST /payments/plans/admin/assign-subscription/
 */
export const assignSubscriptionApi = async (
  payload: AssignSubscriptionPayload
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/plans/admin/assign-subscription/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel subscription for user
 * Endpoint: POST /payments/plans/admin/cancel-subscription/
 */
export const cancelSubscriptionApi = async (
  payload: CancelSubscriptionPayload
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/plans/admin/cancel-subscription/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new subscription plan
 * Uses Bearer token in Authorization header
 * @param payload - Plan data
 */
export const createSubscriptionPlanApi = async (
  payload: CreateSubscriptionPlanPayload
): Promise<AxiosResponse<SubscriptionPlanResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    // Backend endpoint for creating plans is /payments/plans/
    const url = `${base_url}/payments/plans/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing subscription plan
 * Uses Bearer token in Authorization header
 * @param id - Plan ID
 * @param payload - Plan data to update
 */
export const updateSubscriptionPlanApi = async (
  id: number,
  payload: UpdateSubscriptionPlanPayload
): Promise<AxiosResponse<SubscriptionPlanResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    // Backend endpoint for updating plans is /payments/plans/{id}/
    const url = `${base_url}/payments/plans/${id}/`;
    const response = await requestmodel("PATCH", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user roles options
 * Endpoint: GET /users/roles/options/
 * No headers required (public endpoint)
 */
export const getUserRolesOptionsApi = async (): Promise<
  AxiosResponse<RoleOptionsResponse> | AxiosError
> => {
  try {
    // No headers - public endpoint
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const url = `${base_url}/users/roles/options/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};


