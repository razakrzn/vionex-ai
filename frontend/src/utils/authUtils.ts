/**
 * Utility functions for authentication and logout
 */

import { useAuthStore } from "@/stores/authStore";
import { usePartnerStore } from "@/stores/partnerStore";
import { useAdminStore } from "@/stores/adminStore";
import { clearAllCookies } from "./cookieUtils";

/**
 * Clear all stores and sign out user
 * This function clears all Zustand stores, cookies, and storage
 */
export const clearAllStoresAndSignOut = () => {
  // Clear all Zustand stores
  const authStore = useAuthStore.getState();
  authStore.logout();
  
  const partnerStore = usePartnerStore.getState();
  partnerStore.clearPartnerInfo();
  
  const adminStore = useAdminStore.getState();
  adminStore.clearAdminAuth();
  
  // Clear all cookies
  clearAllCookies();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Dispatch event to notify other components
  window.dispatchEvent(new CustomEvent("auth-status-changed", { detail: { loggedIn: false } }));
  
  // Navigate to home page
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};

