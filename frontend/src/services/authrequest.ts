import base_url from "./base_url";
import requestmodel from "./requestmodel";
import { AxiosResponse, AxiosError } from "axios";

export interface RegisterRequest {
    full_name: string,
    email: string,
    password: string,
    password_confirm: string,
    mobile_number: string,
    role: string,
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    errors?: {
        detail?: string;
        [key: string]: any;
    };
    token?: string;
    user?: {
        id: string;
        email: string;
        name?: string;
    };
}

export interface RequestOTPRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  code: string;
}

export interface EmailVerificationResponse {
  success?: boolean;
  message?: string;
  data?: {
    email: string;
    is_email_verified: boolean;
    user?: any;
  };
  errors?: {
    code?: string;
    email?: string;
    [key: string]: any;
  };
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

export interface RefreshTokenResponse {
    success?: boolean;
    message?: string;
    data?: {
        access: string;
        refresh?: string;
    };
    [key: string]: any;
}

export const registerUserApi = async (
  reqBody: RegisterRequest | FormData
): Promise<AxiosResponse<AuthResponse> | AxiosError> => {
  const isForm = typeof FormData !== "undefined" && reqBody instanceof FormData;
  
  if (isForm) {
    const formData = reqBody as FormData;
    // FormData processing
  }
  
  const headers = isForm ? {} : undefined;
  const url = `${base_url}/auth/register/`;
  return await requestmodel("POST", url, reqBody, headers as any);
};

export const loginUserApi = async (
    reqBody: LoginRequest
): Promise<AxiosResponse<AuthResponse> | AxiosError> => {
    return await requestmodel(
        "POST",
        `${base_url}/auth/login/`,
        reqBody
    );
};

export const refreshTokenApi = async (
    refreshToken: string
): Promise<AxiosResponse<RefreshTokenResponse> | AxiosError> => {
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${refreshToken}`,
    };
    
    const response = await requestmodel(
        "POST",
        `${base_url}/auth/token/refresh/`,
        undefined,
        headers
    );
    
    return response;
};

export const requestOTPApi = async (
  reqBody: string | RequestOTPRequest
): Promise<AxiosResponse<EmailVerificationResponse> | AxiosError> => {
  const email = typeof reqBody === "string" ? reqBody : reqBody.email;
  const requestBody: RequestOTPRequest = { email };
  
  const url = `${base_url}/auth/verify-email/request-otp/`;
  return await requestmodel("POST", url, requestBody);
};

export const verifyOTPApi = async (
  email: string,
  code: string
): Promise<AxiosResponse<EmailVerificationResponse> | AxiosError> => {
  const requestBody: VerifyOTPRequest = { email, code };
  
  const url = `${base_url}/auth/verify-email/verify-otp/`;
  return await requestmodel("POST", url, requestBody);
};

// Password Reset
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success?: boolean;
  message?: string;
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Request password reset
 * POST /api/v1/auth/password-reset/
 */
export const passwordResetApi = async (
  email: string
): Promise<AxiosResponse<PasswordResetResponse> | AxiosError> => {
  const requestBody: PasswordResetRequest = { email };
  
  const url = `${base_url}/auth/password-reset/`;
  return await requestmodel("POST", url, requestBody);
};

// Password Reset Confirm
export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface PasswordResetConfirmResponse {
  success?: boolean;
  message?: string;
  errors?: {
    token?: string;
    new_password?: string;
    new_password_confirm?: string;
    [key: string]: any;
  };
  status_code?: number;
  meta?: {
    timestamp?: string;
  };
}

/**
 * Confirm password reset
 * POST /api/v1/auth/password-reset/confirm/
 */
export const passwordResetConfirmApi = async (
  token: string,
  newPassword: string,
  newPasswordConfirm: string
): Promise<AxiosResponse<PasswordResetConfirmResponse> | AxiosError> => {
  const requestBody: PasswordResetConfirmRequest = {
    token,
    new_password: newPassword,
    new_password_confirm: newPasswordConfirm,
  };
  
  const url = `${base_url}/auth/password-reset/confirm/`;
  return await requestmodel("POST", url, requestBody);
};