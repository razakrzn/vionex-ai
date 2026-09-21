import base_url from "./base_url";
import requestmodel from "./requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";

export interface DeviceRegisterRequest {
  fcm_token: string;
  device_type: string;
  device_name: string;
}

/**
 * Registers the device for FCM notifications
 * POST /api/v1/devices/register/
 */
export const registerDeviceApi = async (
  payload: DeviceRegisterRequest
): Promise<AxiosResponse<any> | AxiosError> => {
  const authStore = useAuthStore.getState();
  const accessToken = authStore.tokens?.access;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = `${base_url}/devices/register/`;
  try {
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error: any) {
    throw error;
  }
};

