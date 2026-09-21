import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";
import { useAuthStore } from "@/stores/authStore";

/* ---------- Types ---------- */

export interface GalleryImage {
  id: number;
  image: string;
}

export interface Ad {
  id: number;
  title: string;
  brand_name: string;
  logo?: string;
  location: string;
  video_url?: string | null;
  total_units: number;
  available_units: number;
  billing_cycle: string;
  whatsapp_number?: string;
  gallery_images?: GalleryImage[];
  verification_status?: string;
  published_at?: string;
  created_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdsResponse {
  success?: boolean;
  message?: string;
  data?: Ad[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface AdResponse {
  success?: boolean;
  message?: string;
  data?: Ad;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface CreateAdPayload {
  title: string;
  brand_name: string;
  logo: File;
  location: string;
  video_url?: string;
  total_units: number;
  billing_cycle: string;
  whatsapp_number?: string;
  gallery_images_data: File[];
}

export interface UpdateAdPayload {
  title?: string;
  brand_name?: string;
  logo?: File;
  location?: string;
  video_url?: string;
  total_units?: number;
  billing_cycle?: string;
  whatsapp_number?: string;
  gallery_images_data?: File[];
}

/* ---------- APIs ---------- */

/**
 * Get all ads
 * Uses Bearer token from cookie in Authorization header
 */
export const getAdsApi = async (): Promise<AxiosResponse<AdsResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/ads/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single ad by ID
 * Uses Bearer token from cookie in Authorization header
 */
export const getAdApi = async (id: number): Promise<AxiosResponse<AdResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/ads/${id}/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new ad
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Ad data with FormData for file uploads
 */
export const createAdApi = async (
  payload: FormData
): Promise<AxiosResponse<AdResponse> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    // Don't set Content-Type for FormData, browser will set it with boundary

    const url = `${base_url}/ads/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an ad
 * Uses Bearer token from cookie in Authorization header
 * @param id - Ad ID
 * @param payload - Ad data with FormData for file uploads
 */
export const updateAdApi = async (
  id: number,
  payload: FormData
): Promise<AxiosResponse<AdResponse> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    // Don't set Content-Type for FormData, browser will set it with boundary

    const url = `${base_url}/ads/${id}/`;
    const response = await requestmodel("PUT", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Patch an ad (partial update)
 * Uses Bearer token from cookie in Authorization header
 * @param id - Ad ID
 * @param payload - Ad data with FormData for file uploads
 */
export const patchAdApi = async (
  id: number,
  payload: FormData
): Promise<AxiosResponse<AdResponse> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    // Don't set Content-Type for FormData, browser will set it with boundary

    const url = `${base_url}/ads/${id}/`;
    const response = await requestmodel("PATCH", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an ad
 * Uses Bearer token from cookie in Authorization header
 * @param id - Ad ID
 */
export const deleteAdApi = async (
  id: number
): Promise<AxiosResponse<AdResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/ads/${id}/`;
    const response = await requestmodel("DELETE", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

