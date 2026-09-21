import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface AssetType {
  id: number;
  name: string;
  slug: string;
  description: string;
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

export interface CreateAssetTypePayload {
  name: string;
  description: string;
}

export interface CreateAssetTypeResponse {
  success?: boolean;
  message?: string;
  data?: AssetType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateAssetTypePayload {
  name: string;
  description: string;
}

export interface UpdateAssetTypeResponse {
  success?: boolean;
  message?: string;
  data?: AssetType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/* ---------- APIs ---------- */

/**
 * Get all asset types
 * Uses Bearer token from cookie in Authorization header
 */
export const getAssetTypesApi = async (): Promise<AxiosResponse<AssetTypesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/asset-types/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new asset type
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Asset type data (name, description)
 */
export const createAssetTypeApi = async (
  payload: CreateAssetTypePayload
): Promise<AxiosResponse<CreateAssetTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/asset-types/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing asset type
 * Uses Bearer token from cookie in Authorization header
 * @param id - Asset type ID
 * @param payload - Asset type data (name, description)
 */
export const updateAssetTypeApi = async (
  id: number,
  payload: UpdateAssetTypePayload
): Promise<AxiosResponse<UpdateAssetTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/asset-types/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Property Types ---------- */

export interface PropertyTypeAssetType {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface PropertyType {
  id: number;
  name: string;
  slug: string;
  asset_type: PropertyTypeAssetType;
  description: string;
  occupant_count?: number | null;
}

export interface PropertyTypesResponse {
  success?: boolean;
  message?: string;
  data?: PropertyType[];
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface CreatePropertyTypePayload {
  name: string;
  asset_type_id: number;
  description: string;
  occupant_count?: number | null;
}

export interface CreatePropertyTypeResponse {
  success?: boolean;
  message?: string;
  data?: PropertyType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdatePropertyTypePayload {
  name: string;
  asset_type_id: number;
  description: string;
  occupant_count?: number | null;
}

export interface UpdatePropertyTypeResponse {
  success?: boolean;
  message?: string;
  data?: PropertyType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all property types
 * Uses Bearer token from cookie in Authorization header
 */
export const getPropertyTypesApi = async (): Promise<AxiosResponse<PropertyTypesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/property-types/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new property type
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Property type data (name, asset_type_id)
 */
export const createPropertyTypeApi = async (
  payload: CreatePropertyTypePayload
): Promise<AxiosResponse<CreatePropertyTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/property-types/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing property type
 * Uses Bearer token from cookie in Authorization header
 * @param id - Property type ID
 * @param payload - Property type data (name, asset_type_id)
 */
export const updatePropertyTypeApi = async (
  id: number,
  payload: UpdatePropertyTypePayload
): Promise<AxiosResponse<UpdatePropertyTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/property-types/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Purposes ---------- */

export interface Purpose {
  id: number;
  name: string;
  slug: string;
  description?: string;
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

export interface CreatePurposePayload {
  name: string;
  description?: string;
}

export interface CreatePurposeResponse {
  success?: boolean;
  message?: string;
  data?: Purpose;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdatePurposePayload {
  name: string;
  description?: string;
}

export interface UpdatePurposeResponse {
  success?: boolean;
  message?: string;
  data?: Purpose;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all purposes
 * Uses Bearer token from cookie in Authorization header
 */
export const getPurposesApi = async (): Promise<AxiosResponse<PurposesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/purposes/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new purpose
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Purpose data (name)
 */
export const createPurposeApi = async (
  payload: CreatePurposePayload
): Promise<AxiosResponse<CreatePurposeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/purposes/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing purpose
 * Uses Bearer token from cookie in Authorization header
 * @param id - Purpose ID
 * @param payload - Purpose data (name, description)
 */
export const updatePurposeApi = async (
  id: number,
  payload: UpdatePurposePayload
): Promise<AxiosResponse<UpdatePurposeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/purposes/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Furnishing Statuses ---------- */

export interface FurnishingStatus {
  id: number;
  name: string;
  slug: string;
  description?: string;
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

export interface CreateFurnishingStatusPayload {
  name: string;
  description?: string;
}

export interface CreateFurnishingStatusResponse {
  success?: boolean;
  message?: string;
  data?: FurnishingStatus;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateFurnishingStatusPayload {
  name: string;
  description?: string;
}

export interface UpdateFurnishingStatusResponse {
  success?: boolean;
  message?: string;
  data?: FurnishingStatus;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all furnishing statuses
 * Uses Bearer token from cookie in Authorization header
 */
export const getFurnishingStatusesApi = async (): Promise<AxiosResponse<FurnishingStatusesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/furnishing-statuses/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new furnishing status
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Furnishing status data (name, description)
 */
export const createFurnishingStatusApi = async (
  payload: CreateFurnishingStatusPayload
): Promise<AxiosResponse<CreateFurnishingStatusResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/furnishing-statuses/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing furnishing status
 * Uses Bearer token from cookie in Authorization header
 * @param id - Furnishing status ID
 * @param payload - Furnishing status data (name, description)
 */
export const updateFurnishingStatusApi = async (
  id: number,
  payload: UpdateFurnishingStatusPayload
): Promise<AxiosResponse<UpdateFurnishingStatusResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/furnishing-statuses/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Completion Statuses ---------- */

export interface CompletionStatus {
  id: number;
  name: string;
  slug: string;
  description?: string;
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

export interface CreateCompletionStatusPayload {
  name: string;
  description?: string;
}

export interface CreateCompletionStatusResponse {
  success?: boolean;
  message?: string;
  data?: CompletionStatus;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateCompletionStatusPayload {
  name: string;
  description?: string;
}

export interface UpdateCompletionStatusResponse {
  success?: boolean;
  message?: string;
  data?: CompletionStatus;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all completion statuses
 * Uses Bearer token from cookie in Authorization header
 */
export const getCompletionStatusesApi = async (): Promise<AxiosResponse<CompletionStatusesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/completion-statuses/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new completion status
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Completion status data (name, description)
 */
export const createCompletionStatusApi = async (
  payload: CreateCompletionStatusPayload
): Promise<AxiosResponse<CreateCompletionStatusResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/completion-statuses/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing completion status
 * Uses Bearer token from cookie in Authorization header
 * @param id - Completion status ID
 * @param payload - Completion status data (name, description)
 */
export const updateCompletionStatusApi = async (
  id: number,
  payload: UpdateCompletionStatusPayload
): Promise<AxiosResponse<UpdateCompletionStatusResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/completion-statuses/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Amenities ---------- */

export interface Amenity {
  id: number;
  name: string;
  slug: string;
  description?: string;
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

export interface CreateAmenityPayload {
  name: string;
  description?: string;
}

export interface CreateAmenityResponse {
  success?: boolean;
  message?: string;
  data?: Amenity;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateAmenityPayload {
  name: string;
  description?: string;
}

export interface UpdateAmenityResponse {
  success?: boolean;
  message?: string;
  data?: Amenity;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all amenities
 * Uses Bearer token from cookie in Authorization header
 */
export const getAmenitiesApi = async (): Promise<AxiosResponse<AmenitiesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/amenities/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new amenity
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Amenity data (name, description)
 */
export const createAmenityApi = async (
  payload: CreateAmenityPayload
): Promise<AxiosResponse<CreateAmenityResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/amenities/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing amenity
 * Uses Bearer token from cookie in Authorization header
 * @param id - Amenity ID
 * @param payload - Amenity data (name, description)
 */
export const updateAmenityApi = async (
  id: number,
  payload: UpdateAmenityPayload
): Promise<AxiosResponse<UpdateAmenityResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/amenities/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/* ---------- Occupant Types ---------- */

export interface OccupantType {
  id: number;
  name: string;
  slug?: string;
  description?: string;
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

export interface CreateOccupantTypePayload {
  name: string;
  description?: string;
}

export interface CreateOccupantTypeResponse {
  success?: boolean;
  message?: string;
  data?: OccupantType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface UpdateOccupantTypePayload {
  name: string;
  description?: string;
}

export interface UpdateOccupantTypeResponse {
  success?: boolean;
  message?: string;
  data?: OccupantType;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get all occupant types
 * Uses Bearer token from cookie in Authorization header
 */
export const getOccupantTypesApi = async (): Promise<AxiosResponse<OccupantTypesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/occupant-types/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new occupant type
 * Uses Bearer token from cookie in Authorization header
 * @param payload - Occupant type data (name, description)
 */
export const createOccupantTypeApi = async (
  payload: CreateOccupantTypePayload
): Promise<AxiosResponse<CreateOccupantTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/real-estate/occupant-types/`;
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing occupant type
 * Uses Bearer token from cookie in Authorization header
 * @param id - Occupant type ID
 * @param payload - Occupant type data (name, description)
 */
export const updateOccupantTypeApi = async (
  id: number,
  payload: UpdateOccupantTypePayload
): Promise<AxiosResponse<UpdateOccupantTypeResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with ID
    const url = `${base_url}/real-estate/occupant-types/${id}/`;
    
    const response = await requestmodel("PUT", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

