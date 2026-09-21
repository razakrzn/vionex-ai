import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface Country {
  id?: number; // Optional because new countries from API don't have id yet
  name: string;
  code: string;
  phone_code: string;
  flag_image_url?: string; // New field from Google Places API
  flag_image?: string | null; // Legacy field
  currency: string;
}

export interface CountriesResponse {
  success: boolean;
  message: string;
  data: Country[];
  meta: {
    timestamp: string;
  };
}

export interface Emirate {
  id: number;
  name: string;
  country: number;
  country_id?: number;
  country_name?: string;
  country_code?: string;
}

export interface CreateEmirateRequest {
  name: string;
  country: number;
}

export interface CreateEmirateResponse {
  success: boolean;
  message: string;
  data: Emirate;
  meta: {
    timestamp: string;
  };
}

export interface AddCountriesRequest {
  country_codes: string[];
}

export interface AddCountriesResponse {
  success: boolean;
  message: string;
  data?: any;
  meta?: {
    timestamp: string;
  };
}

export interface EmiratesResponse {
  success: boolean;
  message: string;
  data: Emirate[];
  meta: {
    timestamp: string;
  };
}

export interface State {
  name: string;
  short_name: string;
}

export interface StatesResponse {
  success: boolean;
  message: string;
  data: State[];
  meta: {
    timestamp: string;
  };
}

/* ---------- APIs ---------- */

/**
 * Get all saved countries from database
 * Fetches list of countries that have been added to the database
 * Uses Bearer token from headers in Authorization header
 * Endpoint: GET /countries/
 */
export const getSavedCountriesApi = async (): Promise<AxiosResponse<CountriesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/countries/`;


    const response = await requestmodel("GET", url, undefined, headers);


    return response;
  } catch (error) {
    console.error("=== [getSavedCountriesApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Get all countries from Google Places
 * Fetches list of countries from Google Places (public endpoint - no auth required)
 * Used for the add country dropdown
 * Endpoint: GET /countries/google-places/
 */
export const getCountriesFromGooglePlacesApi = async (): Promise<AxiosResponse<CountriesResponse> | AxiosError> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Build URL
    const url = `${base_url}/countries/google-places/`;


    const response = await requestmodel("GET", url, undefined, headers);


    return response;
  } catch (error) {
    console.error("=== [getCountriesFromGooglePlacesApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Get all emirates
 * Fetches list of emirates from the backend
 * Uses Bearer token from headers in Authorization header
 */
export const getEmiratesApi = async (): Promise<AxiosResponse<EmiratesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/locations/emirates/`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new emirate
 * Creates a new emirate for a country
 * Uses Bearer token from headers in Authorization header
 * @param emirateData - Emirate data (name and country ID)
 */
export const createEmirateApi = async (
  emirateData: CreateEmirateRequest
): Promise<AxiosResponse<CreateEmirateResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/locations/emirates/`;
    
    // Create payload
    const payload = {
      name: emirateData.name,
      country: emirateData.country,
    };
    
    const response = await requestmodel("POST", url, payload, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Add countries from Google Places
 * Adds countries to the database using country codes
 * Uses Bearer token from headers in Authorization header
 * @param countryCodes - Array of country codes to add (e.g., ["SA", "AE"])
 */
export const addCountriesApi = async (
  countryCodes: string[]
): Promise<AxiosResponse<AddCountriesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/countries/google-places/`;
    
    // Create payload
    const payload: AddCountriesRequest = {
      country_codes: countryCodes,
    };



    const response = await requestmodel("POST", url, payload, headers);


    return response;
  } catch (error) {
    console.error("=== [addCountriesApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Delete a country
 * Deletes a country from the database
 * Uses Bearer token from headers in Authorization header
 * @param countryId - ID of the country to delete
 */
export const deleteCountryApi = async (
  countryId: number
): Promise<AxiosResponse<{ success: boolean; message: string }> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/countries/${countryId}/`;



    const response = await requestmodel("DELETE", url, undefined, headers);


    return response;
  } catch (error) {
    console.error("=== [deleteCountryApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Get states/provinces for a country
 * Fetches list of states/provinces for a given country code
 * Public endpoint - no auth required
 * @param countryCode - Country code (e.g., "AE")
 */
export const getStatesApi = async (
  countryCode: string
): Promise<AxiosResponse<StatesResponse> | AxiosError> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Build URL
    const url = `${base_url}/countries/states/?country_code=${countryCode}`;



    const response = await requestmodel("GET", url, undefined, headers);


    return response;
  } catch (error) {
    console.error("=== [getStatesApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

