import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "../admin/headers";

/* ---------- Types ---------- */

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  data: {
    type?: "subscription" | "payment";
    can_create_property?: boolean;
    can_create_listing?: boolean;
    can_add_gym?: boolean;
    message: string;
    seller_type?: "INDIVIDUAL" | "AGENT" | "COMPANY";
    payment_info?: {
      has_completed_payment: boolean;
      payment_id?: number;
      amount?: number;
      completed_at?: string;
      message?: string;
    };
    subscription_info?: {
      has_subscription?: boolean;
      is_active?: boolean;
      is_valid?: boolean;
      can_create_listing?: boolean;
      status?: string;
      start_date?: string;
      end_date?: string | null;
      days_remaining?: number | null;
      usage_count?: number;
      remaining_listings?: number;
      plan?: {
        id: number;
        name: string;
        role: string;
        seller_type?: string | null;
        price: string;
        duration_days?: number | null;
        is_duration_unlimited?: boolean;
        max_listings?: number;
        is_unlimited?: boolean;
        currency?: string;
        description?: string | null;
        is_active?: boolean;
      };
      auto_renew?: boolean;
      amount?: number;
      currency?: string;
      payment_intent_id?: string;
    } | null;
    subscription?: {
      id: number;
      plan: {
        id: number;
        name: string;
        role: string;
        price: string;
        duration_days: number;
        max_listings?: number;
        is_unlimited?: boolean;
        currency?: string;
        description?: string | null;
        is_active?: boolean;
      };
      amount: string;
      currency: string;
      status: string;
      is_active: boolean;
      start_date: string;
      end_date: string;
      usage_count: number;
      auto_renew: boolean;
      is_valid: boolean;
      days_remaining: number;
      can_create_listing: boolean;
      usage_info: {
        usage_count: number;
        max_listings: number;
        is_unlimited: boolean;
        remaining: number;
      };
    };
  };
  status_code: number;
  meta: {
    timestamp: string;
  };
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  role: string;
  seller_type?: string | null;
  price: string;
  duration_days?: number | null;
  is_duration_unlimited?: boolean;
  max_listings?: number | null;
  is_unlimited?: boolean;
  currency?: string;
  description?: string | null;
  is_active?: boolean;
  is_offer?: boolean;
  offer_price?: number | string;
  offer_percentage?: number;
}

export interface SubscriptionPlansResponse {
  success?: boolean;
  message?: string;
  data?: SubscriptionPlan[];
  status_code?: number;
}

export interface CreatePaymentIntentPayload {
  seller_type?: "INDIVIDUAL" | "AGENT" | "COMPANY";
  plan_id?: number;
  use_wallet_balance?: boolean;
  auto_renew?: boolean;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  message: string;
  data: {
    type?: "subscription" | "payment";
    subscription_id?: number;
    amount: number;
    currency: string;
    duration_days?: number;
    plan?: {
      id: number;
      name: string;
      role: string;
      seller_type?: string | null;
      price: string;
      duration_days?: number | null;
      is_duration_unlimited?: boolean;
      max_listings?: number;
      is_unlimited?: boolean;
      currency?: string;
      description?: string | null;
      is_active?: boolean;
    };
    original_amount?: number;
    wallet_discount?: number;
    points_redeemed?: number;
    checkout_session_id?: string;
    checkout_url?: string;
    // Legacy fields (for backward compatibility)
    payment_id?: number;
    client_secret?: string;
    payment_intent_id?: string;
    status?: string;
    requires_action?: boolean;
  };
  status_code: number;
  meta: {
    timestamp: string;
  };
}

export interface ConfirmPaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment_id: number;
    status: string;
    can_create_property: boolean;
  };
  status_code: number;
  meta: {
    timestamp: string;
  };
}

export interface WalletResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: number;
    balance?: string | number;
    currency?: string;
    transaction_count?: number;
    transactions?: Array<{
      id: number;
      type?: "credit" | "debit";
      transaction_type?: string;
      amount: number | string;
      balance_before?: number | string | null;
      balance_after?: number | string | null;
      description?: string;
      created_at: string;
      status?: string;
    }>;
    created_at?: string;
    updated_at?: string;
  };
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Get payment status
 * Endpoint: GET /payments/status/
 * Uses Bearer token in Authorization header
 */
export const getPaymentStatusApi = async (): Promise<
  AxiosResponse<PaymentStatusResponse> | AxiosError
> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/status/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get subscription plans
 * Endpoint: GET /payments/plans/
 * Uses Bearer token in Authorization header
 */
export const getSubscriptionPlansApi = async (): Promise<
  AxiosResponse<SubscriptionPlansResponse> | AxiosError
> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/plans/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create payment intent
 * Endpoint: POST /payments/
 * Uses Bearer token in Authorization header
 * @param payload - Either seller_type OR plan_id
 */
export const createPaymentIntentApi = async (
  payload: CreatePaymentIntentPayload
): Promise<AxiosResponse<CreatePaymentIntentResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/`;
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Confirm payment completion with backend
 * Endpoint: POST /payments/{payment_id}/confirm/
 * Uses Bearer token in Authorization header
 * @param payment_id - Payment ID from createPaymentIntent response
 * @param payment_intent_id - Stripe Payment Intent ID
 */
export const confirmPaymentApi = async (
  payment_id: number,
  payment_intent_id: string
): Promise<AxiosResponse<ConfirmPaymentResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/${payment_id}/confirm/`;
    const payload = { 
      payment_intent_id,
      status: "succeeded"
    };
    const response = await requestmodel("POST", url, payload, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get wallet information
 * Endpoint: GET /payments/wallets/
 * Uses Bearer token in Authorization header
 */
export const getWalletApi = async (): Promise<
  AxiosResponse<WalletResponse> | AxiosError
> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/wallets/`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

export interface VerifyCheckoutSessionResponse {
  success: boolean;
  message: string;
  data?: {
    payment_id?: number;
    subscription_id?: number;
    status?: string;
    [key: string]: any;
  };
  status_code: number;
  meta?: {
    timestamp: string;
  };
}

/**
 * Verify checkout session
 * Endpoint: GET /payments/verify-checkout-session/?session_id=cs_xxx
 * Uses Bearer token in Authorization header
 */
export const verifyCheckoutSessionApi = async (
  sessionId: string
): Promise<AxiosResponse<VerifyCheckoutSessionResponse> | AxiosError> => {
  try {
    const headers = getAuthHeaders();
    const url = `${base_url}/payments/verify-checkout-session/?session_id=${encodeURIComponent(sessionId)}`;
    const response = await requestmodel("GET", url, undefined, headers);
    return response;
  } catch (error) {
    throw error;
  }
};

