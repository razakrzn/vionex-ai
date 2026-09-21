import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface VerifySellerRequest {
  action: "approve" | "reject" | "pending";
  rejection_note?: string;
}

export interface VerifySellerResponse {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
}

/* ---------- APIs ---------- */

/**
 * Verify/Change seller status
 * Endpoint: /users/{userId}/verify/
 * Sends action (approve, reject, pending) in request body
 * Uses Bearer token in Authorization header
 * @param userId - User ID to verify
 * @param status - Status: "approved", "rejected", or "pending" (will be mapped to "approve", "reject", "pending")
 * @param rejectionNote - Optional rejection note (required when status is "rejected")
 */
export const verifySellerApi = async (
  userId: string | number,
  status: "approved" | "rejected" | "pending",
  rejectionNote?: string
): Promise<AxiosResponse<VerifySellerResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL with user ID
    const url = `${base_url}/users/${userId}/verify/`;
    
    // Map status to action
    let action: "approve" | "reject" | "pending";
    if (status === "approved") {
      action = "approve";
    } else if (status === "rejected") {
      action = "reject";
    } else {
      action = "pending";
    }
    
    // Prepare request body
    const requestBody: VerifySellerRequest = {
      action: action,
    };
    
    // Add rejection note if provided
    if (rejectionNote) {
      requestBody.rejection_note = rejectionNote;
    }
    
    const response = await requestmodel("POST", url, requestBody, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

