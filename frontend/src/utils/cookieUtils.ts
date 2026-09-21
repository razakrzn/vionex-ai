/**
 * Utility functions for cookie management
 */

/**
 * Get a cookie value by name
 */
export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
};

/**
 * Set a cookie value
 */
export const setCookie = (name: string, value: string, days: number = 30): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

/**
 * Delete a specific cookie
 */
export const deleteCookie = (name: string, path: string = "/"): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
  // Also try to delete with domain
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${window.location.hostname};`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${window.location.hostname};`;
};

/**
 * Clear all cookies
 * Deletes all cookies that are commonly used for authentication
 */
export const clearAllCookies = (): void => {
  // List of all possible auth-related cookies
  const cookiesToDelete = [
    "access_token",
    "refresh_token",
    "auth_token",
    "token",
    "session",
    "sessionid",
  ];
  
  // Delete each cookie
  cookiesToDelete.forEach((cookieName) => {
    deleteCookie(cookieName);
  });
  
  // Also try to get all cookies and delete them
  const allCookies = document.cookie.split(";");
  allCookies.forEach((cookie) => {
    const cookieName = cookie.split("=")[0].trim();
    if (cookieName) {
      deleteCookie(cookieName);
    }
  });
};

