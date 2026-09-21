import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";

/* ---------- Types ---------- */

export interface Notification {
  id: number;
  type: string;
  type_display: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  [key: string]: any;
}

export interface UnreadCountResponse {
  success?: boolean;
  data?: {
    unread_count?: number;
  };
  unread_count?: number;
  [key: string]: any;
}

export interface NotificationsResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Notification[];
  [key: string]: any;
}

/* ---------- APIs ---------- */

/**
 * Get unread notifications count
 * Endpoint: GET /notifications/unread-count/
 * Uses Bearer token in Authorization header
 */
export const getUnreadCountApi = async (): Promise<AxiosResponse<UnreadCountResponse> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;



    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("⚠️ [getUnreadCountApi] No access token available!");
    }
    
    const url = `${base_url}/notifications/unread-count/`;


    const response = await requestmodel("GET", url, undefined, headers);


    if (response && "data" in response) {

    }
    
    return response;
  } catch (error) {
    console.error("=== [getUnreadCountApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Get all notifications
 * Endpoint: GET /notifications/
 * Uses Bearer token in Authorization header
 * @param isRead - Optional filter for read/unread notifications (true/false)
 */
export const getNotificationsApi = async (
  isRead?: boolean
): Promise<AxiosResponse<NotificationsResponse> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;




    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("⚠️ [getNotificationsApi] No access token available!");
    }
    
    let url = `${base_url}/notifications/`;
    if (isRead !== undefined) {
      url += `?is_read=${isRead}`;
    }


    const response = await requestmodel("GET", url, undefined, headers);


    if (response && "data" in response) {

    }
    
    return response;
  } catch (error) {
    console.error("=== [getNotificationsApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Mark notification as read
 * Endpoint: POST /notifications/{notificationId}/mark-read/
 * Uses Bearer token in Authorization header
 * @param notificationId - ID of the notification to mark as read
 */
export const markNotificationAsReadApi = async (
  notificationId: number | string
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;




    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("⚠️ [markNotificationAsReadApi] No access token available!");
    }
    
    const url = `${base_url}/notifications/${notificationId}/mark-read/`;


    const response = await requestmodel("POST", url, undefined, headers);


    if (response && "data" in response) {

    }
    
    return response;
  } catch (error) {
    console.error("=== [markNotificationAsReadApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Delete a specific notification
 * Endpoint: DELETE /notifications/{notificationId}/
 * Uses Bearer token in Authorization header
 * @param notificationId - ID of the notification to delete
 */
export const deleteNotificationApi = async (
  notificationId: number | string
): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;




    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("⚠️ [deleteNotificationApi] No access token available!");
    }
    
    const url = `${base_url}/notifications/${notificationId}/`;


    const response = await requestmodel("DELETE", url, undefined, headers);


    if (response && "data" in response) {

    }
    
    return response;
  } catch (error) {
    console.error("=== [deleteNotificationApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Delete all read notifications
 * Endpoint: DELETE /notifications/delete-read/
 * Uses Bearer token in Authorization header
 */
export const deleteReadNotificationsApi = async (): Promise<AxiosResponse<{ success?: boolean; message?: string; [key: string]: any }> | AxiosError> => {
  try {
    const authStore = useAuthStore.getState();
    const accessToken = authStore.tokens?.access || null;



    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("⚠️ [deleteReadNotificationsApi] No access token available!");
    }
    
    const url = `${base_url}/notifications/delete-read/`;


    const response = await requestmodel("DELETE", url, undefined, headers);


    if (response && "data" in response) {

    }
    
    return response;
  } catch (error) {
    console.error("=== [deleteReadNotificationsApi] Error ===");
    console.error("Error:", error);
    throw error;
  }
};

