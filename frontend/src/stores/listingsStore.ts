// Global listings store for sharing data between partner and admin dashboards
// In production, this should be replaced with a database

export type Category = "property" | "vehicle" | "other";
export type ListingStatus = "pending" | "approved" | "rejected";

export interface Listing {
  id: number;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  category: Category;
  title: string;
  description: string;
  price: string;
  location: string;
  emirate: string;
  emiratesId: string;
  phone: string;
  email: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  propertyType: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  itemType: string;
  photoPreviews: string[];
  createdAt: string;
  status: ListingStatus;
  reviewNote?: string;
  reviewedAt?: string;
}

// Simple in-memory store (replace with database in production)
class ListingsStore {
  private listings: Listing[] = [];
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  // Initialize with dummy data
  initializeDummyData(): void {
    if (this.initialized) return;

    const dummyListings: Listing[] = [
      // Pending Listings
      {
        id: 1001,
        partnerId: "seller_1",
        partnerName: "Ahmed Al Mansoori",
        partnerEmail: "ahmed.mansoori@email.com",
        category: "property",
        title: "Luxury 2BR Apartment in Dubai Marina",
        description: "Beautiful 2-bedroom apartment with sea view, fully furnished, modern amenities. Perfect location near metro and shopping malls.",
        price: "AED 85,000/year",
        location: "Dubai Marina",
        emirate: "Dubai",
        emiratesId: "784-1990-1234567-1",
        phone: "+971 50 123 4567",
        email: "ahmed.mansoori@email.com",
        bedrooms: "2",
        bathrooms: "2",
        area: "1200 sqft",
        propertyType: "Apartment",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80"],
        createdAt: "2024-01-20",
        status: "pending",
      },
      {
        id: 1002,
        partnerId: "seller_3",
        partnerName: "Fatima Al Shamsi",
        partnerEmail: "fatima.shamsi@email.com",
        category: "vehicle",
        title: "2022 Toyota Camry - Excellent Condition",
        description: "Well-maintained Toyota Camry, single owner, full service history. Low mileage, perfect for family use.",
        price: "AED 95,000",
        location: "Abu Dhabi",
        emirate: "Abu Dhabi",
        emiratesId: "784-1992-2345678-3",
        phone: "+971 55 987 6543",
        email: "fatima.shamsi@email.com",
        bedrooms: "",
        bathrooms: "",
        area: "",
        propertyType: "",
        make: "Toyota",
        model: "Camry",
        year: "2022",
        mileage: "25,000 km",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1549924231-f129b911e442?w=600&q=80"],
        createdAt: "2024-01-22",
        status: "pending",
      },
      {
        id: 1003,
        partnerId: "seller_2",
        partnerName: "Dubai Properties LLC",
        partnerEmail: "info@dubaiproperties.ae",
        category: "property",
        title: "Executive Single Room in Business Bay",
        description: "Premium single room in shared apartment, all utilities included. Close to business district and metro.",
        price: "AED 1,800/month",
        location: "Business Bay",
        emirate: "Dubai",
        emiratesId: "784-1985-7654321-2",
        phone: "+971 4 234 5678",
        email: "info@dubaiproperties.ae",
        bedrooms: "1",
        bathrooms: "1",
        area: "Shared",
        propertyType: "Single Room",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80"],
        createdAt: "2024-01-25",
        status: "pending",
      },
      {
        id: 1004,
        partnerId: "seller_4",
        partnerName: "Sharjah Real Estate Group",
        partnerEmail: "contact@sharjahrealestate.ae",
        category: "other",
        title: "iPhone 14 Pro Max 256GB - Brand New",
        description: "Sealed box iPhone 14 Pro Max, never opened. Original warranty included. Best price in market.",
        price: "AED 4,500",
        location: "Sharjah",
        emirate: "Sharjah",
        emiratesId: "784-1988-3456789-4",
        phone: "+971 6 345 6789",
        email: "contact@sharjahrealestate.ae",
        bedrooms: "",
        bathrooms: "",
        area: "",
        propertyType: "",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "Electronics",
        photoPreviews: ["https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=600&q=80"],
        createdAt: "2024-01-26",
        status: "pending",
      },
      // Approved Listings
      {
        id: 2001,
        partnerId: "seller_1",
        partnerName: "Ahmed Al Mansoori",
        partnerEmail: "ahmed.mansoori@email.com",
        category: "property",
        title: "Spacious 3BR Villa in Jumeirah",
        description: "Beautiful villa with private garden, 3 bedrooms, 3 bathrooms, fully furnished. Perfect for families.",
        price: "AED 120,000/year",
        location: "Jumeirah",
        emirate: "Dubai",
        emiratesId: "784-1990-1234567-1",
        phone: "+971 50 123 4567",
        email: "ahmed.mansoori@email.com",
        bedrooms: "3",
        bathrooms: "3",
        area: "2500 sqft",
        propertyType: "Villa",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80"],
        createdAt: "2024-01-15",
        status: "approved",
        reviewNote: "All documents verified. Property details accurate.",
        reviewedAt: "2024-01-16",
      },
      {
        id: 2002,
        partnerId: "seller_2",
        partnerName: "Dubai Properties LLC",
        partnerEmail: "info@dubaiproperties.ae",
        category: "vehicle",
        title: "2023 Mercedes-Benz C-Class",
        description: "Brand new Mercedes C-Class, showroom condition, all features included. Premium package.",
        price: "AED 185,000",
        location: "Dubai",
        emirate: "Dubai",
        emiratesId: "784-1985-7654321-2",
        phone: "+971 4 234 5678",
        email: "info@dubaiproperties.ae",
        bedrooms: "",
        bathrooms: "",
        area: "",
        propertyType: "",
        make: "Mercedes-Benz",
        model: "C-Class",
        year: "2023",
        mileage: "5,000 km",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80"],
        createdAt: "2024-01-10",
        status: "approved",
        reviewNote: "Vehicle verified. All documents in order.",
        reviewedAt: "2024-01-11",
      },
      {
        id: 2003,
        partnerId: "seller_3",
        partnerName: "Fatima Al Shamsi",
        partnerEmail: "fatima.shamsi@email.com",
        category: "property",
        title: "Cozy Studio Apartment in Downtown",
        description: "Modern studio apartment, fully furnished, perfect for professionals. Great location with easy access to metro.",
        price: "AED 45,000/year",
        location: "Downtown",
        emirate: "Abu Dhabi",
        emiratesId: "784-1992-2345678-3",
        phone: "+971 55 987 6543",
        email: "fatima.shamsi@email.com",
        bedrooms: "Studio",
        bathrooms: "1",
        area: "500 sqft",
        propertyType: "Studio",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80"],
        createdAt: "2024-01-12",
        status: "approved",
        reviewNote: "Listing approved. All information verified.",
        reviewedAt: "2024-01-13",
      },
      {
        id: 2004,
        partnerId: "seller_4",
        partnerName: "Sharjah Real Estate Group",
        partnerEmail: "contact@sharjahrealestate.ae",
        category: "other",
        title: "MacBook Pro 16-inch M2 - Like New",
        description: "MacBook Pro 16-inch with M2 chip, 32GB RAM, 1TB SSD. Used for 3 months only, excellent condition.",
        price: "AED 8,500",
        location: "Sharjah",
        emirate: "Sharjah",
        emiratesId: "784-1988-3456789-4",
        phone: "+971 6 345 6789",
        email: "contact@sharjahrealestate.ae",
        bedrooms: "",
        bathrooms: "",
        area: "",
        propertyType: "",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "Electronics",
        photoPreviews: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80"],
        createdAt: "2024-01-08",
        status: "approved",
        reviewNote: "Product verified. Condition matches description.",
        reviewedAt: "2024-01-09",
      },
      // Rejected Listings
      {
        id: 3001,
        partnerId: "seller_5",
        partnerName: "Omar Al Suwaidi",
        partnerEmail: "omar.suwaidi@email.com",
        category: "property",
        title: "Luxury Penthouse - Price Too Low",
        description: "Amazing penthouse with amazing views.",
        price: "AED 50,000/year",
        location: "Palm Jumeirah",
        emirate: "Dubai",
        emiratesId: "784-1991-4567890-5",
        phone: "+971 50 456 7890",
        email: "omar.suwaidi@email.com",
        bedrooms: "4",
        bathrooms: "4",
        area: "5000 sqft",
        propertyType: "Penthouse",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80"],
        createdAt: "2024-01-18",
        status: "rejected",
        reviewNote: "Price seems unrealistic for this property type and location. Please verify and resubmit with accurate pricing.",
        reviewedAt: "2024-01-19",
      },
      {
        id: 3002,
        partnerId: "seller_1",
        partnerName: "Ahmed Al Mansoori",
        partnerEmail: "ahmed.mansoori@email.com",
        category: "vehicle",
        title: "2024 Ferrari - Suspicious Listing",
        description: "Brand new Ferrari for sale.",
        price: "AED 500,000",
        location: "Dubai",
        emirate: "Dubai",
        emiratesId: "784-1990-1234567-1",
        phone: "+971 50 123 4567",
        email: "ahmed.mansoori@email.com",
        bedrooms: "",
        bathrooms: "",
        area: "",
        propertyType: "",
        make: "Ferrari",
        model: "F8 Tributo",
        year: "2024",
        mileage: "100 km",
        itemType: "",
        photoPreviews: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80"],
        createdAt: "2024-01-17",
        status: "rejected",
        reviewNote: "Missing required documents. Please provide vehicle registration and ownership documents.",
        reviewedAt: "2024-01-18",
      },
      {
        id: 3003,
        partnerId: "seller_3",
        partnerName: "Fatima Al Shamsi",
        partnerEmail: "fatima.shamsi@email.com",
        category: "other",
        title: "Gaming PC Setup",
        description: "High-end gaming PC for sale.",
        price: "AED 3,000",
        location: "Abu Dhabi",
        emirate: "Abu Dhabi",
        emiratesId: "784-1992-2345678-3",
        phone: "+971 55 987 6543",
        email: "fatima.shamsi@email.com",
        bedrooms: "",
        bathrooms: "",
        area: "",
        propertyType: "",
        make: "",
        model: "",
        year: "",
        mileage: "",
        itemType: "Electronics",
        photoPreviews: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80"],
        createdAt: "2024-01-14",
        status: "rejected",
        reviewNote: "Insufficient product details. Please provide specifications, condition, and more photos.",
        reviewedAt: "2024-01-15",
      },
    ];

    this.listings = [...dummyListings];
    this.initialized = true;
    this.notifyListeners();
  }

  getListings(): Listing[] {
    // Initialize dummy data if not already done
    if (!this.initialized) {
      this.initializeDummyData();
    }
    return [...this.listings];
  }

  getListingsByPartner(partnerId: string): Listing[] {
    return this.listings.filter(l => l.partnerId === partnerId);
  }

  getPendingListings(): Listing[] {
    return this.listings.filter(l => l.status === "pending");
  }

  getApprovedListings(): Listing[] {
    return this.listings.filter(l => l.status === "approved");
  }

  getRejectedListings(): Listing[] {
    return this.listings.filter(l => l.status === "rejected");
  }

  addListing(listing: Omit<Listing, "id" | "createdAt" | "status">): Listing {
    const newListing: Listing = {
      ...listing,
      id: Date.now(),
      createdAt: new Date().toLocaleDateString(),
      status: "pending",
    };
    this.listings.push(newListing);
    this.notifyListeners();
    return newListing;
  }

  updateListing(id: number, updates: Partial<Listing>): void {
    const index = this.listings.findIndex(l => l.id === id);
    if (index !== -1) {
      this.listings[index] = { ...this.listings[index], ...updates };
      this.notifyListeners();
    }
  }

  approveListing(id: number, note?: string): void {
    this.updateListing(id, {
      status: "approved",
      reviewNote: note,
      reviewedAt: new Date().toLocaleDateString(),
    });
  }

  rejectListing(id: number, note: string): void {
    this.updateListing(id, {
      status: "rejected",
      reviewNote: note,
      reviewedAt: new Date().toLocaleDateString(),
    });
  }

  deleteListing(id: number): void {
    this.listings = this.listings.filter(l => l.id !== id);
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const listingsStore = new ListingsStore();
