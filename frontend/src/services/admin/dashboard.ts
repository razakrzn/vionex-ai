import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";

export interface DashboardStats {
  users?: {
    total_visits?: number;
    daily_active_users?: number;
    monthly_active_users?: number;
    total_registered?: number;
    owners?: number;
    gym_owners?: number;
    seekers?: number;
    admins?: number;
    pending_verification?: number;
  };
  real_estate?: {
    properties?: {
      total?: number;
      active?: number;
      for_rent?: number;
      for_sale?: number;
      off_plan?: number;
    };
  };
  payments?: {
    total_payments?: number;
    pending_payments?: number;
    completed_payments?: number;
    failed_payments?: number;
  };
}

export interface DashboardStatsResponse {
  success?: boolean;
  message?: string;
  data?: DashboardStats;
  status_code?: number;
  meta?: { timestamp?: string };
}

export interface VisitorLog {
  id?: number | string;
  ip_address?: string;
  device?: string;
  city?: string;
  country?: string;
  path?: string;
  user_agent?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface VisitorLogsResponse {
  success?: boolean;
  message?: string;
  data?: VisitorLog[];
  status_code?: number;
  meta?: { timestamp?: string };
}

/**
 * Get dashboard stats
 * Endpoint: GET /dashboard/stats/
 * Uses Bearer token in Authorization header
 */
export const getDashboardStatsApi = async (): Promise<
  AxiosResponse<DashboardStatsResponse> | AxiosError
> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${base_url}/dashboard/stats/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get visitor logs
 * Endpoint: GET /dashboard/visitor-logs/
 * Uses Bearer token in Authorization header
 */
export const getVisitorLogsApi = async (): Promise<
  AxiosResponse<VisitorLogsResponse> | AxiosError
> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${base_url}/dashboard/visitor-logs/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

export interface StorageType {
  storage_type: string;
  size_bytes: number;
  size_mb?: number;
  object_count?: number | null;
}

export interface StorageHistory {
  date: string;
  size_bytes: number;
  object_count: number;
}

export interface StorageData {
  bucket_name: string;
  size_bytes: number;
  size_mb: number;
  size_gb: number;
  object_count: number;
  estimated_cost: number;
  by_storage_type: StorageType[];
  last_updated: string;
  history: StorageHistory[];
  region: string;
}

export interface StorageMetricsResponse {
  success?: boolean;
  message?: string;
  data?: {
    enabled: boolean;
    storage: StorageData;
  };
  status_code?: number;
  meta?: { timestamp?: string };
}

/**
 * Get storage metrics
 * Endpoint: GET /dashboard/storage-metrics/?days={days}
 * Uses Bearer token in Authorization header
 * @param days - Number of days for history (default: 1 for 24 hours)
 */
export const getStorageMetricsApi = async (days: number = 1): Promise<
  AxiosResponse<StorageMetricsResponse> | AxiosError
> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const url = `${base_url}/dashboard/storage-metrics/?days=${days}`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

