import base_url from "../base_url";
import requestmodel from "../requestmodel";
import { AxiosResponse, AxiosError } from "axios";
import { getAuthHeaders } from "./headers";

/* ---------- Types ---------- */

export interface ModulePermissions {
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface ModuleChild {
  id: string;
  label: string;
  path: string;
  permissions: ModulePermissions;
  order: number;
}

export interface Module {
  id: string;
  name: string;
  label: string;
  icon: string | null;
  path: string;
  permissions?: ModulePermissions;
  order: number;
  is_active: boolean;
  children?: ModuleChild[]; // Already in response structure
}

export interface ModulesResponse {
  success: boolean;
  message: string;
  data: Module[]; // Changed from { modules: Module[] } to Module[]
  status_code: number;
  meta: {
    timestamp: string;
  };
}

/* ---------- Helper Functions ---------- */

/**
 * Process modules from API response
 * The new API response already has hierarchical structure with children
 * This function ensures proper sorting and structure
 */
export const buildModuleHierarchy = (modules: Module[]): Module[] => {
  // The API response already has hierarchical structure with children
  // Just ensure proper sorting
  return modules
    .map(module => ({
      ...module,
      // Ensure children are sorted by order if they exist
      children: module.children 
        ? module.children.sort((a, b) => a.order - b.order)
        : undefined,
    }))
    .sort((a, b) => a.order - b.order); // Sort parents by order
};

/* ---------- APIs ---------- */

/**
 * Get admin dashboard modules
 * Fetches available modules/modules for the admin dashboard
 * Uses Bearer token from headers in Authorization header
 */
export const getAdminModulesApi = async (): Promise<AxiosResponse<ModulesResponse> | AxiosError> => {
  try {
    // Get headers with Bearer token
    const headers = getAuthHeaders();
    
    // Build URL
    const url = `${base_url}/dashboard/modules`;
    
    const response = await requestmodel("GET", url, undefined, headers);
    
    return response;
  } catch (error) {
    throw error;
  }
};

