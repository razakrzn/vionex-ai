import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";

/* ---------- Types ---------- */

export interface SeekerProperty {
  id: number;
  title: string;
  description?: string;
  property_type_name?: string;
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
    description?: string;
  };
  furnishing_status?: {
    id: number;
    name: string;
    slug: string;
    description?: string;
  };
  completion_status?: {
    id: number;
    name: string;
    slug: string;
    description?: string;
  };
  occupant_type?: {
    id: number;
    name: string;
    slug?: string;
    description?: string;
  };
  occupants_count?: number;
  address?: string;
  place?: string;
  building_name?: string;
  floor_number?: string;
  unit_number?: string;
  location_latitude?: number;
  location_longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number | null;
  price: string;
  currency: string;
  rent_period?: string;
  price_per_sqft?: number | null;
  handover_date?: string;
  developer_name?: string;
  project_name?: string;
  nationality?: string;
  amenities?: Array<{
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
    description?: string;
  }>;
  main_image?: string;
  main_image_url?: string;
  gallery_images?: Array<{
    id: number;
    image: string;
  }>;
  owner?: {
    id: number;
    name: string;
    email: string;
    phone_number: string;
    whatsapp_number?: string;
  };
  owner_name?: string;
  is_approved?: boolean;
  views_count?: number;
  created_at: string;
  updated_at?: string;
  social_media?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  [key: string]: any;
}

export interface SeekerPropertiesResponse {
  success?: boolean;
  message?: string;
  data?: SeekerProperty[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all properties (public, no authentication required)
 * Endpoint: GET /real-estate/properties/
 * No headers required
 * @param queryParams - Optional query parameters for filtering
 */
export const getPropertiesApi = async (queryParams?: Record<string, string | number | null | undefined>): Promise<AxiosResponse<SeekerPropertiesResponse> | AxiosError> => {
  try {
    let url = `${base_url}/real-estate/properties/`;
    
    // Build query string from parameters
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
    
    
    // Call without headers (no authentication) - pass undefined for headers
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

export interface SeekerPropertyResponse {
  success?: boolean;
  message?: string;
  data?: SeekerProperty;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get property by ID (public, no authentication required)
 * Endpoint: GET /real-estate/properties/{id}/
 * No headers required
 */
export const getPropertyByIdApi = async (id: number | string): Promise<AxiosResponse<SeekerPropertyResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/${id}/`;



    // Call without headers (no authentication) - pass undefined for headers
    const response = await requestmodel("GET", url, undefined, undefined);


    if ('data' in response) {

      if (response.data?.data) {

      }
    }
    
    return response;
  } catch (error) {
    console.error("=== Error Fetching Property ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Increment property views (public, no authentication required)
 * Endpoint: POST /real-estate/properties/{id}/increment_views/
 * No headers required
 */
export const incrementPropertyViewsApi = async (
  id: number | string
): Promise<AxiosResponse | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/${id}/increment_views/`;
    const response = await requestmodel("POST", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Public Filter Options APIs (No Authentication Required) ---------- */

// Re-export types from admin service for public use
export type PropertyType = {
  id: number;
  name: string;
  slug: string;
  asset_type: {
    id: number;
    name: string;
    slug: string;
    description: string;
  };
  description: string;
  occupant_count?: number | null;
};

export type OccupantType = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
};

export type Amenity = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type AssetType = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type Purpose = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type FurnishingStatus = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type CompletionStatus = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type RentPeriod = string;

export type Nationality = string;

export interface PropertyTypesResponse {
  success?: boolean;
  message?: string;
  data?: PropertyType[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface OccupantTypesResponse {
  success?: boolean;
  message?: string;
  data?: OccupantType[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface AmenitiesResponse {
  success?: boolean;
  message?: string;
  data?: Amenity[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface AssetTypesResponse {
  success?: boolean;
  message?: string;
  data?: AssetType[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface PurposesResponse {
  success?: boolean;
  message?: string;
  data?: Purpose[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface FurnishingStatusesResponse {
  success?: boolean;
  message?: string;
  data?: FurnishingStatus[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface CompletionStatusesResponse {
  success?: boolean;
  message?: string;
  data?: CompletionStatus[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface RentPeriodsResponse {
  success?: boolean;
  message?: string;
  data?: RentPeriod[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface NationalitiesResponse {
  success?: boolean;
  message?: string;
  data?: Nationality[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all property types (public, no authentication required)
 * Endpoint: GET /real-estate/properties/property-types/
 * No headers required
 */
export const getPropertyTypesPublicApi = async (): Promise<AxiosResponse<PropertyTypesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/property-types/`;


    // Call without headers (no authentication) - pass undefined for headers
    const response = await requestmodel("GET", url, undefined, undefined);


    if ('data' in response) {

      if (response.data?.data) {


      }
    }
    
    return response;
  } catch (error: any) {
    console.error("=== [HeroSection] Error Fetching Property Types ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error response:", error?.response);
    if (error?.response) {
      console.error("Status:", error.response.status);
      console.error("Status text:", error.response.statusText);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

/**
 * Get all occupant types (public, no authentication required)
 * Endpoint: GET /real-estate/properties/occupant-types/
 * No headers required
 */
export const getOccupantTypesPublicApi = async (): Promise<AxiosResponse<OccupantTypesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/occupant-types/`;


    // Call without headers (no authentication) - pass undefined for headers
    const response = await requestmodel("GET", url, undefined, undefined);


    if ('data' in response) {

      if (response.data?.data) {


      }
    }
    
    return response;
  } catch (error: any) {
    console.error("=== [HeroSection] Error Fetching Occupant Types ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error response:", error?.response);
    if (error?.response) {
      console.error("Status:", error.response.status);
      console.error("Status text:", error.response.statusText);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

/**
 * Get all amenities (public, no authentication required)
 * Endpoint: GET /real-estate/properties/amenities/
 * No headers required
 */
export const getAmenitiesPublicApi = async (): Promise<AxiosResponse<AmenitiesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/amenities/`;


    // Call without headers (no authentication) - pass undefined for headers
    const response = await requestmodel("GET", url, undefined, undefined);


    if ('data' in response) {

      if (response.data?.data) {


      }
    }
    
    return response;
  } catch (error: any) {
    console.error("=== [HeroSection] Error Fetching Amenities ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error response:", error?.response);
    if (error?.response) {
      console.error("Status:", error.response.status);
      console.error("Status text:", error.response.statusText);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

/**
 * Get all asset types (public, no authentication required)
 * Endpoint: GET /real-estate/properties/asset-types/
 */
export const getAssetTypesPublicApi = async (): Promise<AxiosResponse<AssetTypesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/asset-types/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all purposes (public, no authentication required)
 * Endpoint: GET /real-estate/properties/purposes/
 */
export const getPurposesPublicApi = async (): Promise<AxiosResponse<PurposesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/purposes/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all furnishing statuses (public, no authentication required)
 * Endpoint: GET /real-estate/properties/furnishing-statuses/
 */
export const getFurnishingStatusesPublicApi = async (): Promise<AxiosResponse<FurnishingStatusesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/furnishing-statuses/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all completion statuses (public, no authentication required)
 * Endpoint: GET /real-estate/properties/completion-statuses/
 */
export const getCompletionStatusesPublicApi = async (): Promise<AxiosResponse<CompletionStatusesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/completion-statuses/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all rent periods (public, no authentication required)
 * Endpoint: GET /real-estate/properties/rent-periods/
 */
export const getRentPeriodsPublicApi = async (): Promise<AxiosResponse<RentPeriodsResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/rent-periods/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all nationalities (public, no authentication required)
 * Endpoint: GET /real-estate/properties/nationalities/
 */
export const getNationalitiesPublicApi = async (): Promise<AxiosResponse<NationalitiesResponse> | AxiosError> => {
  try {
    const url = `${base_url}/real-estate/properties/nationalities/`;
    const response = await requestmodel("GET", url, undefined, undefined);
    return response;
  } catch (error) {
    throw error;
  }
};

export interface ContactOwnerPayload {
  property_id: number;
  contact_method: "whatsapp" | "call";
}

export interface ContactOwnerResponse {
  success?: boolean;
  message?: string;
  data?: any;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Contact property owner
 * Endpoint: POST /real-estate/properties/contact-owner/
 * Requires authentication
 */
export const contactOwnerApi = async (payload: ContactOwnerPayload): Promise<AxiosResponse<ContactOwnerResponse> | AxiosError> => {
  try {
    // Import getAuthHeaders dynamically to avoid circular dependency
    const { getAuthHeaders } = await import("../admin/headers");
    const headers = getAuthHeaders();
    
    const url = `${base_url}/real-estate/properties/contact-owner/`;




    const response = await requestmodel("POST", url, payload, headers);


    return response;
  } catch (error) {
    console.error("=== Error Contacting Owner ===");
    console.error("Error:", error);
    throw error;
  }
};

