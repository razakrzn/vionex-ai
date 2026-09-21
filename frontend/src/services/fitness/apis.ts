import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "../admin/headers";

/* ---------- Types ---------- */

export interface GymOwnerRegistrationRequest {
  email: string;
  password: string;
  password_confirm: string;
  role: "gym_owner";
  mobile_number: string;
  whatsapp_number: string;
  full_name: string;
  company_name: string;
  license_number: string;
  country: number;
  state: string;
  city: string;
  about_me?: string;
  document_uploads?: File;
  profile_picture?: File;
}

export interface GymOwnerRegistrationResponse {
  success: boolean;
  message: string;
  data?: any;
  status_code?: number;
  meta?: {
    timestamp: string;
  };
}

/* ---------- APIs ---------- */

/**
 * Register a new gym owner
 * POST /api/v1/fitness/gym-owners/register/
 * @param formData - FormData containing gym owner registration details
 */
export const registerGymOwnerApi = async (
  formData: FormData
): Promise<AxiosResponse<GymOwnerRegistrationResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    // Remove Content-Type header to let browser set it with boundary for FormData
    if (headers["Content-Type"]) {
      delete headers["Content-Type"];
    }
    
    const url = `${base_url}/fitness/gym-owners/register/`;


    const response = await requestmodel("POST", url, formData, headers);


    return response;
  } catch (error) {
    console.error("=== [registerGymOwnerApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

// TODO: Add more fitness-related APIs here
// - Get gym owner profile
// - Update gym owner profile
// - Get gym listings
// - etc.

