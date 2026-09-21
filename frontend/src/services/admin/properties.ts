import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface Property {
  id: number;
  title: string;
  // New API response fields
  property_type_name?: string; // Direct string from API
  place?: string | null; // Direct string from API (replaces address)
  main_image?: string; // Direct string from API (replaces main_image_url)
  occupant_type?: {
    id: number;
    name: string;
    slug: string;
    description: string;
  } | null;
  rent_period?: string;
  // Legacy nested structure (for backward compatibility)
  property_type?: {
    id: number;
    name: string;
    slug: string;
    asset_type?: {
      id: number;
      name: string;
      slug: string;
      description: string;
    };
    description?: string;
    occupant_count?: number | null;
  };
  purpose?: {
    id: number;
    name: string;
    slug: string;
    description: string;
  };
  address?: string; // Mapped from place for compatibility
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number | null;
  price: string;
  currency: string;
  price_per_sqft?: number | null;
  main_image_url?: string; // Mapped from main_image for compatibility
  gallery_images?: Array<{
    id: number;
    image: string;
  }>;
  owner_name?: string;
  is_approved?: boolean;
  listing_status?: string; // "SOLD", "OFF_MARKET", "AVAILABLE", etc.
  rejection_note?: string | null;
  created_at: string;
  description?: string;
  nationality?: string;
  [key: string]: any; // Allow additional fields
}

export interface PropertiesResponse {
  success?: boolean;
  message?: string;
  data?: Property[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface ApproveRejectPropertyPayload {
  action: "approve" | "reject";
  note?: string;
}

export interface ApproveRejectPropertyResponse {
  success?: boolean;
  message?: string;
  data?: any;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all properties
 * Endpoint: GET /real-estate/properties/
 * Uses Bearer token in Authorization header
 */
export const getPropertiesApi = async (): Promise<AxiosResponse<PropertiesResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/real-estate/properties/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get single property by ID
 * Endpoint: GET /real-estate/properties/{id}/
 * Uses Bearer token in Authorization header
 */
export const getPropertyByIdApi = async (
  id: number
): Promise<AxiosResponse<PropertiesResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/real-estate/properties/${id}/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Approve a property
 * Endpoint: POST /real-estate/properties/{id}/approve/
 * Uses Bearer token in Authorization header
 */
export const approvePropertyApi = async (
  id: number
): Promise<AxiosResponse<ApproveRejectPropertyResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/real-estate/properties/${id}/approve/`;
    const response = await requestmodel("POST", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Reject a property
 * Endpoint: POST /real-estate/properties/{id}/reject/
 * Uses Bearer token in Authorization header
 * Requires rejection_note in request body
 */
export const rejectPropertyApi = async (
  id: number,
  rejectionNote: string
): Promise<AxiosResponse<ApproveRejectPropertyResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/real-estate/properties/${id}/reject/`;
    const payload = {
      rejection_note: rejectionNote,
    };
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update listing status (e.g., mark as SOLD)
 * Endpoint: POST /real-estate/properties/{id}/update-listing-status/
 * Uses Bearer token in Authorization header
 */
export const updateListingStatusApi = async (
  id: number,
  listingStatus: "SOLD" | "OFF_MARKET" | "AVAILABLE"
): Promise<AxiosResponse<ApproveRejectPropertyResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const url = `${base_url}/real-estate/properties/${id}/update-listing-status/`;
    const payload = { listing_status: listingStatus };
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all contacts/leads
 * Endpoint: GET /real-estate/properties/all-contacts/
 * Uses Bearer token in Authorization header
 */
export interface Contact {
  id: number;
  seeker_name?: string;
  seeker_email?: string;
  seeker_phone?: string;
  property_id?: number;
  property_title?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  contact_method?: string;
  created_at?: string;
  [key: string]: any;
}

export interface AllContactsResponse {
  success: boolean;
  message: string;
  data: Contact[];
  status_code: number;
  meta?: {
    timestamp: string;
  };
}

export const getAllContactsApi = async (): Promise<
  AxiosResponse<AllContactsResponse> | AxiosError
> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/real-estate/properties/all-contacts/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a property
 * Endpoint: POST /real-estate/properties/{id}/delete/
 * Uses Bearer token in Authorization header
 */
export const deletePropertyApi = async (
  id: number
): Promise<AxiosResponse<ApproveRejectPropertyResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const url = `${base_url}/real-estate/properties/${id}/delete/`;
    const response = await requestmodel("POST", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

