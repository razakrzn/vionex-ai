import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

export interface WalletTransaction {
  id: number;
  transaction_type?: string;
  amount: number | string;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  created_at: string;
}

export interface UserWalletResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: number;
    balance?: string | number;
    currency?: string;
    transaction_count?: number;
    transactions?: WalletTransaction[];
    created_at?: string;
    updated_at?: string;
  };
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface WalletAdjustPayload {
  user_id: number;
  amount: string;
  adjustment_type: "credit" | "debit";
  description?: string;
}

export interface WalletAdjustResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: number;
    balance?: string | number;
    currency?: string;
  };
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export const getUserWalletApi = async (
  userId: number
): Promise<AxiosResponse<UserWalletResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/wallets/user/${userId}`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

export const adjustWalletApi = async (
  payload: WalletAdjustPayload
): Promise<AxiosResponse<WalletAdjustResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/dashboard/wallet-adjust/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

