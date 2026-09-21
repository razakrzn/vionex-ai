// Sellers store for managing sellers (companies and individuals)
// In production, this should be replaced with a database

import { listingsStore, Listing } from "./listingsStore";

export type SellerType = "company" | "individual" | "agent" | "COMPANY" | "INDIVIDUAL" | "AGENT";
export type SellerStatus = "active" | "inactive" | "suspended";
export type SellerApprovalStatus = "pending" | "approved" | "rejected";

export interface Seller {
  id: number | string;
  email: string;
  role?: string;
  role_display?: string;
  mobile_number: string;
  full_name: string | null;
  address: string | null;
  seller_type: string | null; // "COMPANY", "INDIVIDUAL", "AGENT", etc.
  seller_type_display?: string | null;
  company_name: string | null;
  license_number: string | null; // Can be trade license or RERA number
  emirates_id_number: string | null;
  emirate: string | null;
  is_mobile_verified: boolean;
  profile_picture: string | null;
  document_uploads: string | string[] | null; // Can be single URL or array of URLs
  is_active: boolean;
  date_joined: string; // ISO date string
  // Additional fields for frontend compatibility
  approvalStatus?: SellerApprovalStatus; // For review purposes
  lastLogin?: string;
  emirates_id_expiry?: string | null;
}

// Simple in-memory store (replace with database in production)
class SellersStore {
  private sellers: Seller[] = [];
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  // Initialize with dummy data
  initializeDummyData(): void {
    if (this.initialized) return;
    
    const dummySellers: Seller[] = [
      {
        id: 1,
        email: "ahmed.mansoori@email.com",
        role: "owner",
        role_display: "Seller",
        mobile_number: "+971501234567",
        full_name: "Ahmed Al Mansoori",
        address: "Dubai Marina, Building 12, Apartment 304",
        seller_type: "INDIVIDUAL",
        seller_type_display: "Individual",
        company_name: null,
        license_number: "RERA-12345",
        emirates_id_number: "784-1990-1234567-1",
        emirate: "Dubai",
        is_mobile_verified: true,
        profile_picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80",
        document_uploads: [
          "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80",
        ],
        is_active: true,
        date_joined: "2024-01-15T10:00:00Z",
        approvalStatus: "pending",
        emirates_id_expiry: "2025-12-31",
      },
      {
        id: 2,
        email: "info@dubaiproperties.ae",
        role: "owner",
        role_display: "Seller",
        mobile_number: "+97142345678",
        full_name: "Mohammed Al Zaabi",
        address: "Business Bay, Office Tower 5, Floor 12",
        seller_type: "COMPANY",
        seller_type_display: "Real Estate Company",
        company_name: "Dubai Properties LLC",
        license_number: "TL-987654",
        emirates_id_number: "784-1985-7654321-2",
        emirate: "Dubai",
        is_mobile_verified: true,
        profile_picture: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&h=400&fit=crop&q=80",
        document_uploads: [
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80",
        ],
        is_active: true,
        date_joined: "2024-02-10T10:00:00Z",
        approvalStatus: "pending",
      },
      {
        id: 3,
        email: "fatima.shamsi@email.com",
        role: "owner",
        role_display: "Seller",
        mobile_number: "+971559876543",
        full_name: "Fatima Al Shamsi",
        address: "Al Khalidiyah, Villa 45",
        seller_type: "INDIVIDUAL",
        seller_type_display: "Individual",
        company_name: null,
        license_number: "RERA-67890",
        emirates_id_number: "784-1992-2345678-3",
        emirate: "Abu Dhabi",
        is_mobile_verified: true,
        profile_picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80",
        document_uploads: [
          "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop&q=80",
        ],
        is_active: true,
        date_joined: "2024-03-05T10:00:00Z",
        approvalStatus: "approved",
        emirates_id_expiry: "2026-06-30",
      },
      {
        id: 4,
        email: "contact@sharjahrealestate.ae",
        role: "owner",
        role_display: "Seller",
        mobile_number: "+97163456789",
        full_name: "Khalid Al Qasimi",
        address: "Al Qasimia, Commercial Building 3",
        seller_type: "COMPANY",
        seller_type_display: "Real Estate Company",
        company_name: "Sharjah Real Estate Group",
        license_number: "TL-456789",
        emirates_id_number: "784-1988-3456789-4",
        emirate: "Sharjah",
        is_mobile_verified: true,
        profile_picture: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&q=80",
        document_uploads: [
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80",
        ],
        is_active: true,
        date_joined: "2024-01-20T10:00:00Z",
        approvalStatus: "pending",
      },
      {
        id: 5,
        email: "omar.suwaidi@email.com",
        role: "owner",
        role_display: "Seller",
        mobile_number: "+971504567890",
        full_name: "Omar Al Suwaidi",
        address: "Jumeirah, Villa 23",
        seller_type: "INDIVIDUAL",
        seller_type_display: "Individual",
        company_name: null,
        license_number: "RERA-11111",
        emirates_id_number: "784-1991-4567890-5",
        emirate: "Dubai",
        is_mobile_verified: false,
        profile_picture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80",
        document_uploads: [
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80",
        ],
        is_active: false,
        date_joined: "2023-12-01T10:00:00Z",
        approvalStatus: "rejected",
        emirates_id_expiry: "2024-11-15",
      },
      {
        id: 6,
        email: "sarah.maktoum@email.com",
        role: "owner",
        role_display: "Seller",
        mobile_number: "+971552345678",
        full_name: "Sarah Al Maktoum",
        address: "Downtown Dubai, Office 501",
        seller_type: "AGENT",
        seller_type_display: "Agent",
        company_name: "Maktoum Real Estate",
        license_number: "RERA-22222",
        emirates_id_number: "784-1993-5678901-6",
        emirate: "Dubai",
        is_mobile_verified: true,
        profile_picture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=80",
        document_uploads: [
          "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80",
        ],
        is_active: true,
        date_joined: "2024-04-10T10:00:00Z",
        approvalStatus: "pending",
        emirates_id_expiry: "2027-03-20",
      },
    ];

    this.sellers = [...dummySellers];
    this.initialized = true;
    this.notifyListeners();
  }

  // Initialize sellers from existing listings
  initializeFromListings(): void {
    // First initialize dummy data if not already done
    this.initializeDummyData();
    
    const listings = listingsStore.getListings();
    const sellerMap = new Map<string | number, Seller>();

    listings.forEach((listing) => {
      if (!sellerMap.has(listing.partnerId)) {
        // Create seller from listing data
        const seller: Seller = {
          id: listing.partnerId,
          email: listing.partnerEmail,
          role: "owner",
          role_display: "Seller",
          mobile_number: listing.phone,
          full_name: listing.partnerName,
          address: null,
          seller_type: listing.partnerName.includes("Company") || listing.partnerName.includes("Ltd") ? "COMPANY" : "INDIVIDUAL",
          seller_type_display: listing.partnerName.includes("Company") || listing.partnerName.includes("Ltd") ? "Real Estate Company" : "Individual",
          company_name: listing.partnerName.includes("Company") || listing.partnerName.includes("Ltd") ? listing.partnerName : null,
          license_number: null,
          emirates_id_number: null,
          emirate: listing.emirate,
          is_mobile_verified: false,
          profile_picture: null,
          document_uploads: null,
          is_active: true,
          date_joined: listing.createdAt,
        };
        sellerMap.set(listing.partnerId, seller);
      }
    });

    // Merge with existing sellers
    sellerMap.forEach((seller) => {
      const existing = this.sellers.find((s) => s.id === seller.id);
      if (!existing) {
        this.sellers.push(seller);
      }
    });

    this.notifyListeners();
  }

  getSellers(): Seller[] {
    // Initialize dummy data if not already done
    if (!this.initialized) {
      this.initializeDummyData();
    }
    return [...this.sellers];
  }

  getSeller(id: string | number): Seller | undefined {
    return this.sellers.find((s) => s.id === id);
  }

  getSellersByType(type: SellerType): Seller[] {
    return this.sellers.filter((s) => {
      const sellerType = s.seller_type?.toUpperCase();
      if (type === "company" || type === "COMPANY") return sellerType === "COMPANY";
      if (type === "individual" || type === "INDIVIDUAL") return sellerType === "INDIVIDUAL";
      if (type === "agent" || type === "AGENT") return sellerType === "AGENT";
      return false;
    });
  }

  getSellersByStatus(status: SellerStatus): Seller[] {
    return this.sellers.filter((s) => {
      if (status === "active") return s.is_active;
      if (status === "inactive") return !s.is_active;
      return false; // suspended not directly mapped
    });
  }

  addSeller(seller: Omit<Seller, "id" | "date_joined">): Seller {
    const newSeller: Seller = {
      ...seller,
      id: Date.now(),
      date_joined: new Date().toISOString(),
    };
    this.sellers.push(newSeller);
    this.notifyListeners();
    return newSeller;
  }

  updateSeller(id: string | number, updates: Partial<Seller>): void {
    const index = this.sellers.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.sellers[index] = { ...this.sellers[index], ...updates };
      this.notifyListeners();
    }
  }

  deleteSeller(id: string | number): void {
    this.sellers = this.sellers.filter((s) => s.id !== id);
    this.notifyListeners();
  }

  getSellerListings(sellerId: string | number): Listing[] {
    return listingsStore.getListingsByPartner(String(sellerId));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const sellersStore = new SellersStore();

