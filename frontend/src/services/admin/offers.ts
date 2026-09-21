import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

export interface OfferItem {
  id?: number | string;
  role?: string;
  price_per_listing?: string;
  validity_days?: number;
  validity_months?: number;
  cashback?: string;
  total_active_count?: number;
  created_at?: string;
  [key: string]: any;
}

export interface OffersResponse {
  success?: boolean;
  message?: string;
  data?: OfferItem[];
  status_code?: number;
  meta?: { timestamp?: string };
}

export interface OfferPayload {
  role: string;
  price_per_listing: number;
  cashback: number;
  validity_months?: number;
  validity_days?: number;
}

/**
 * Get search tail offers
 * Endpoint: GET /offers/
 * Uses Bearer token in Authorization header
 */
export const getOffersApi = async (
  role?: string
): Promise<AxiosResponse<OffersResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/offers/${role ? `?role=${encodeURIComponent(role)}` : ""}`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create offer
 * Endpoint: POST /offers/
 */
export const createOfferApi = async (
  payload: OfferPayload
): Promise<AxiosResponse<{ success?: boolean; message?: string; data?: OfferItem; [key: string]: any }> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/offers/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update offer
 * Endpoint: PUT/PATCH /offers/{id}/
 */
export const updateOfferApi = async (
  id: number | string,
  payload: Partial<OfferPayload>,
  method: "PUT" | "PATCH"
): Promise<AxiosResponse<{ success?: boolean; message?: string; data?: OfferItem; [key: string]: any }> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/offers/${id}/`;
    const response = await requestmodel(method, url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete offer
 * Endpoint: DELETE /offers/{id}/
 */
export const deleteOfferApi = async (
  id: number | string
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/offers/${id}/`;
    const response = await requestmodel("DELETE", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

