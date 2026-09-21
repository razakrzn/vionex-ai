import { LucideIcon } from "lucide-react";

export type TabType = "overview" | "pending" | "approved" | "rejected" | "all" | "users" | "sellers" | "reviewSellers" | "categories" | string;

export interface TabItem {
  id: TabType;
  label: string;
  icon: LucideIcon;
  count?: number;
  children?: TabItem[];
  path?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Add User type
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  raw_role?: string;
  role: "admin" | "buyer" | "seller";
  status: "active" | "inactive" | "suspended";
  joinedDate: string;
  lastLogin: string;
  listingCount: number;
  seller_type?: "INDIVIDUAL" | "AGENT" | "COMPANY";
  is_suspended?: boolean;
  // Gym owner specific fields
  isGymOwner?: boolean;
  license_number?: string;
  verification_status?: "pending" | "approved" | "rejected";
  rejection_note?: string;
  profile_picture?: string;
  document_uploads?: string;
  is_subscribed?: boolean;
  role_display?: string;
}

export type UserRole = "admin" | "buyer" | "seller";
export type UserStatus = "active" | "inactive" | "suspended";

// Category type
export interface Category {
  id: string;
  name: string;
  isMain: boolean;
  createdAt?: string;
  updatedAt?: string;
}