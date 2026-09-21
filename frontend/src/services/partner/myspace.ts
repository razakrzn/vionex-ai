import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "../admin/headers";

/* ---------- Types ---------- */

export interface CreatePropertyPayload {
  title: string;
  description: string;
  property_type_id: number;
  purpose_id: number;
  completion_status_id: number;
  address: string;
  price: number;
  furnishing_status_id?: number | null;
  building_name?: string;
  floor_number?: string;
  unit_number?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  area_sqm?: number;
  currency?: string;
  rent_period?: string;
  handover_date?: string;
  developer_name?: string;
  project_name?: string;
  amenity_ids?: number[];
  main_image?: File;
  images?: File[];
}

export interface CreatePropertyResponse {
  success?: boolean;
  message?: string;
  data?: any;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface PartnerProperty {
  id: number;
  title: string;
  property_type_name?: string;
  price: string;
  currency: string;
  rent_period?: string;
  created_at: string;
  is_approved?: boolean;
  listing_status?: string; // "SOLD", "OFF_MARKET", "AVAILABLE", etc.
  bedrooms?: number;
  bathrooms?: number;
  occupant_type?: {
    id: number;
    name: string;
    slug: string;
    description: string;
  } | null;
  place?: string | null;
  main_image?: string;
  views_count?: number;
  rejection_note?: string | null;
  [key: string]: any;
}

export interface MyPropertiesResponse {
  success?: boolean;
  message?: string;
  data?: PartnerProperty[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Create a new property
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Property data with FormData for multipart/form-data
 */
export const createPropertyApi = async (
  formData: FormData
): Promise<AxiosResponse<CreatePropertyResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token (without Content-Type for multipart)
    const headers = getAuthHeaders();
    // Remove Content-Type to let browser set it with boundary for multipart/form-data
    delete headers["Content-Type"];
    
    // Build URL
    const url = `${base_url}/real-estate/properties/`;
    
    const response = await requestmodel("POST", url, formData, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing property
 * Uses Bearer token from cookie in Authorization header
 * @param id - Property ID
 * @param formData - Property data with FormData for multipart/form-data
 */
export const updatePropertyApi = async (
  id: number,
  formData: FormData
): Promise<AxiosResponse<CreatePropertyResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token (without Content-Type for multipart)
    const headers = getAuthHeaders();
    // Remove Content-Type to let browser set it with boundary for multipart/form-data
    delete headers["Content-Type"];
    
    // Build URL with ID - use PATCH method for updates
    const url = `${base_url}/real-estate/properties/${id}/`;
    
    const response = await requestmodel("PATCH", url, formData, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get my properties (properties created by the logged-in partner/owner)
 * Endpoint: GET /real-estate/properties/
 * Uses Bearer token in Authorization header
 */
export const getMyPropertiesApi = async (listingStatus?: string): Promise<AxiosResponse<MyPropertiesResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    let url = `${base_url}/real-estate/properties/`;
    if (listingStatus) {
      url += `?listing_status=${listingStatus}`;
    }
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get rejected properties (properties created by the logged-in partner/owner that are rejected)
 * Endpoint: GET /real-estate/properties/?is_reject_note=true
 * Uses Bearer token in Authorization header
 */
export const getRejectedPropertiesApi = async (): Promise<AxiosResponse<MyPropertiesResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/real-estate/properties/?is_reject_note=true`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get properties by owner_id (public endpoint - no auth required)
 * Endpoint: GET /real-estate/properties/?owner_id={ownerId}
 */
export const getPropertiesByOwnerIdApi = async (ownerId: number | string): Promise<AxiosResponse<MyPropertiesResponse> | AxiosError> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    const url = `${base_url}/real-estate/properties/?owner_id=${ownerId}`;


    const response = await requestmodel("GET", url, undefined, headers);


    return response;
  } catch (error) {
    console.error("=== [getPropertiesByOwnerIdApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Get property by ID for editing
 * Endpoint: GET /real-estate/properties/{id}/
 * Uses Bearer token in Authorization header
 */
export const getPropertyByIdApi = async (
  id: number
): Promise<AxiosResponse<CreatePropertyResponse> | AxiosError> => {
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
 * Update listing status (e.g., mark as SOLD)
 * Endpoint: POST /real-estate/properties/{id}/update-listing-status/
 * Uses Bearer token in Authorization header
 */
export const updateListingStatusApi = async (
  id: number,
  listingStatus: "SOLD" | "AVAILABLE" | "PENDING"
): Promise<AxiosResponse<CreatePropertyResponse> | AxiosError> => {
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
 * Delete a property
 * Endpoint: POST /real-estate/properties/{id}/delete/
 * Uses Bearer token in Authorization header
 */
export const deletePropertyApi = async (
  id: number
): Promise<AxiosResponse<CreatePropertyResponse> | AxiosError> => {
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

