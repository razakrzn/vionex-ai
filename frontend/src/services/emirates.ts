import base_url from "./base_url";
import requestmodel from "./requestmodel";
import { AxiosResponse, AxiosError } from "axios";

/* ---------- Types ---------- */

export interface EmiratesResponse {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
}

/* ---------- APIs ---------- */

// Get emirates list from backend
export const getEmiratesApi = async (): Promise<AxiosResponse<EmiratesResponse> | AxiosError> => {
  const response = await requestmodel(
    "GET",
    `${base_url}/locations/emirates/`
  );
  
  return response;
};

