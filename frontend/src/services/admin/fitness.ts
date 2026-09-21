import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface GymType {
  id: number;
  name: string;
  slug?: string;
  description: string;
}

export interface GymTypesResponse {
  success?: boolean;
  message?: string;
  data?: GymType[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface CreateGymTypePayload {
  name: string;
  description: string;
}

export interface CreateGymTypeResponse {
  success?: boolean;
  message?: string;
  data?: GymType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateGymTypePayload {
  name: string;
  description: string;
}

export interface UpdateGymTypeResponse {
  success?: boolean;
  message?: string;
  data?: GymType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface Facility {
  id: number;
  name: string;
  slug?: string;
  description: string;
}

export interface FacilitiesResponse {
  success?: boolean;
  message?: string;
  data?: Facility[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface CreateFacilityPayload {
  name: string;
  description: string;
}

export interface CreateFacilityResponse {
  success?: boolean;
  message?: string;
  data?: Facility;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateFacilityPayload {
  name: string;
  description: string;
}

export interface UpdateFacilityResponse {
  success?: boolean;
  message?: string;
  data?: Facility;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/* ---------- Gym Types APIs ---------- */

/**
 * Get all gym types
 * Uses Bearer token from cookie in Authorization header
 */
export const getGymTypesApi = async (): Promise<AxiosResponse<GymTypesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/fitness/gym-types/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new gym type
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Gym type data (name, description)
 */
export const createGymTypeApi = async (
  payload: CreateGymTypePayload
): Promise<AxiosResponse<CreateGymTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/fitness/gym-types/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing gym type
 * Uses Bearer token from cookie in Authorization header
 * @param id - Gym type ID
 * @param payload - Gym type data (name, description)
 */
export const updateGymTypeApi = async (
  id: number,
  payload: UpdateGymTypePayload
): Promise<AxiosResponse<UpdateGymTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/fitness/gym-types/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Facilities APIs ---------- */

/**
 * Get all facilities
 * Uses Bearer token from cookie in Authorization header
 */
export const getFacilitiesApi = async (): Promise<AxiosResponse<FacilitiesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/fitness/facilities/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new facility
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Facility data (name, description)
 */
export const createFacilityApi = async (
  payload: CreateFacilityPayload
): Promise<AxiosResponse<CreateFacilityResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/fitness/facilities/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing facility
 * Uses Bearer token from cookie in Authorization header
 * @param id - Facility ID
 * @param payload - Facility data (name, description)
 */
export const updateFacilityApi = async (
  id: number,
  payload: UpdateFacilityPayload
): Promise<AxiosResponse<UpdateFacilityResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/fitness/facilities/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Gyms APIs ---------- */

export interface Gym {
  id: number;
  name: string;
  gym_type_id?: number;
  gym_type_name?: string; // From API response
  gym_type?: {
    id: number;
    name: string;
    slug?: string;
    icon?: string | null;
    description?: string;
  };
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  opening_time?: string | null;
  closing_time?: string | null;
  is_24_hours: boolean;
  off_day?: string[];
  gender_allowed: string;
  facility_ids?: number[];
  facilities?: Array<{
    id: number;
    name: string;
    icon?: string | null;
    description?: string;
  }>;
  social_media?: {
    facebook?: string;
    instagram?: string;
    [key: string]: any;
  };
  main_image?: string;
  gallery_images?: Array<{ id: number; image: string }>;
  packages?: Array<{
    id: number;
    gym: number;
    gym_name?: string;
    title: string;
    price: string;
    duration: string;
    description: string;
    created_at?: string;
  }>;
  packages_data?: Array<{
    id?: number;
    title: string;
    price: string;
    duration: string;
    description: string;
  }>;
  owner?: {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
    whatsapp_number?: string;
  };
  is_approved?: boolean;
  is_active?: boolean;
  rejection_note?: string | null;
  views_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateGymResponse {
  success?: boolean;
  message?: string;
  data?: Gym;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface GymsResponse {
  success?: boolean;
  message?: string;
  data?: Gym[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all gyms for the current gym owner
 * Uses Bearer token from cookie in Authorization header
 */
export const getGymsApi = async (): Promise<AxiosResponse<GymsResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/fitness/gyms/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single gym by ID
 * Uses Bearer token from cookie in Authorization header
 * @param id - Gym ID
 */
export const getGymByIdApi = async (id: number): Promise<AxiosResponse<CreateGymResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/fitness/gyms/${id}/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new gym
 * Uses Bearer token from cookie in Authorization header
 * @param formData - FormData containing gym details and files
 */
export const createGymApi = async (
  formData: FormData
): Promise<AxiosResponse<CreateGymResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Remove Content-Type header to let browser set it with boundary for FormData
    if (headers["Content-Type"]) {
      delete headers["Content-Type"];
    }
    
    // Build URL
    const url = `${base_url}/fitness/gyms/`;
    
    const response = await requestmodel("POST", url, formData, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing gym
 * Uses Bearer token from cookie in Authorization header
 * @param id - Gym ID
 * @param formData - FormData containing gym details and files
 * @param method - HTTP method to use (PATCH or PUT), defaults to PATCH
 */
export const updateGymApi = async (
  id: number,
  formData: FormData,
  method: "PATCH" | "PUT" = "PATCH"
): Promise<AxiosResponse<CreateGymResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    
    // Remove Content-Type header to let browser set it with boundary for FormData
    if (headers["Content-Type"]) {
      delete headers["Content-Type"];
    }
    
    const url = `${base_url}/fitness/gyms/${id}/`;
    const response = await requestmodel(method, url, formData, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a gym
 * Uses Bearer token from cookie in Authorization header
 * @param id - Gym ID
 */
export const deleteGymApi = async (id: number): Promise<AxiosResponse<{ success?: boolean; message?: string }> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/fitness/gyms/${id}/`;
    const response = await requestmodel("DELETE", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Approve a gym
 * Uses Bearer token from cookie in Authorization header
 * @param id - Gym ID
 */
export const approveGymApi = async (id: number): Promise<AxiosResponse<CreateGymResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/fitness/gyms/${id}/approve/`;
    const response = await requestmodel("POST", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Reject a gym
 * Uses Bearer token from cookie in Authorization header
 * @param id - Gym ID
 * @param rejectionNote - Rejection note/reason
 */
export const rejectGymApi = async (
  id: number,
  rejectionNote: string
): Promise<AxiosResponse<CreateGymResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/fitness/gyms/${id}/reject/`;
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
 * Get all gym types (public, no authentication required)
 * Endpoint: GET /fitness/gym-types/
 * No headers required
 */
export const getPublicGymTypesApi = async (): Promise<AxiosResponse<GymTypesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/fitness/gym-types/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all facilities (public, no authentication required)
 * Endpoint: GET /fitness/facilities/
 * No headers required
 */
export const getPublicFacilitiesApi = async (): Promise<AxiosResponse<FacilitiesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/fitness/facilities/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all gyms (public, no authentication required)
 * Endpoint: GET /fitness/gyms/
 * No headers required
 * @param queryParams - Optional query parameters for filtering
 */
export const getPublicGymsApi = async (
  queryParams?: Record<string, string | number | boolean | null | undefined>
): Promise<AxiosResponse<GymsResponse> | AxiosError> => {
  try {
    let url = `${base_url}/fitness/gyms/`;
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const response = await requestmodel("GET", url, undefined, undefined); // No headers
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single gym by ID (public, no authentication required)
 * Endpoint: GET /fitness/gyms/{id}/
 * No headers required
 * @param id - Gym ID
 */
export const getPublicGymByIdApi = async (id: number): Promise<AxiosResponse<CreateGymResponse> | AxiosError> => {
  try {
    const url = `${base_url}/fitness/gyms/${id}/`;
    const response = await requestmodel("GET", url, undefined, undefined); // No headers
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Increment gym views (public, no authentication required)
 * Endpoint: POST /fitness/gyms/{id}/increment_views/
 * No headers required
 */
export const incrementGymViewsApi = async (
  id: number
): Promise<AxiosResponse | AxiosError> => {
  try {
    const url = `${base_url}/fitness/gyms/${id}/increment_views/`;
    const response = await requestmodel("POST", url, undefined, undefined); // No headers
    return response;
  } catch (error) {
    throw error;
  }
};

