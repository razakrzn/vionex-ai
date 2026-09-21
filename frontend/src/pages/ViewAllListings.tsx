import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getPropertiesApi, type SeekerProperty } from "@/services/seeker/myspace";
import { getPublicGymsApi, type Gym } from "@/services/admin/fitness";
import { Skeleton } from "@/components/ui/skeleton";
import Seo from "@/components/Seo";

// Sample data - in real app this would come from API/store
const allSpaceListings = [
  { id: 1, title: "Executive Single Space in Dubai Marina", location: "Dubai Marina, Dubai", price: 1200, type: "Single Space", beds: 1, occupants: 3, amenities: ["wifi", "bath", "ac"], image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80", daysListed: 5, isHot: true },
  { id: 2, title: "Family Space in JBR", location: "JBR, Dubai", price: 2500, type: "Family Space", beds: 2, occupants: 5, amenities: ["wifi", "bath", "ac"], image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80", daysListed: 3, isHot: false },
  { id: 3, title: "Camp Space in Sharjah", location: "Sharjah, UAE", price: 800, type: "Camp Space", beds: 1, occupants: 8, amenities: ["wifi"], image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80", daysListed: 10, isHot: true },
  { id: 4, title: "Luxury Apartment in Downtown", location: "Downtown Dubai", price: 4500, type: "Apartment", beds: 3, occupants: 4, amenities: ["wifi", "bath", "ac"], image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80", daysListed: 2, isHot: true },
  { id: 5, title: "Single Space in Al Nahda", location: "Al Nahda, Sharjah", price: 900, type: "Single Space", beds: 1, occupants: 2, amenities: ["wifi", "ac"], image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80", daysListed: 7, isHot: false },
  { id: 6, title: "Family Space in Abu Dhabi", location: "Abu Dhabi, UAE", price: 3000, type: "Family Space", beds: 2, occupants: 6, amenities: ["wifi", "bath", "ac"], image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80", daysListed: 1, isHot: true },
];

const allDriveListings = [
  { id: 101, title: "Toyota Corolla 2020", location: "Sharjah, UAE", price: 35000, type: "Car", kmRun: 82000, usage: "Personal Use", amenities: [], image: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=600&q=80", daysListed: 4, isHot: true },
  { id: 102, title: "Honda Civic 2019", location: "Dubai, UAE", price: 42000, type: "Car", kmRun: 55000, usage: "Personal Use", amenities: [], image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80", daysListed: 6, isHot: false },
  { id: 103, title: "Yamaha R15 2021", location: "Abu Dhabi, UAE", price: 12000, type: "Bike", kmRun: 15000, usage: "Personal Use", amenities: [], image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80", daysListed: 2, isHot: true },
  { id: 104, title: "BMW X5 2022", location: "Dubai Marina", price: 185000, type: "SUV", kmRun: 25000, usage: "Personal Use", amenities: [], image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80", daysListed: 1, isHot: true },
  { id: 105, title: "Nissan Sunny 2018", location: "Ajman, UAE", price: 22000, type: "Car", kmRun: 95000, usage: "Taxi Use", amenities: [], image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80", daysListed: 8, isHot: false },
];

const allNeedsListings = [
  { id: 201, title: "iPhone 13 Pro – 256GB", location: "Abu Dhabi, UAE", price: 2800, type: "Electronics", usage: "Lightly Used", amenities: [], image: "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=600&q=80", daysListed: 2, isHot: true },
  { id: 202, title: "Samsung 55\" Smart TV", location: "Dubai, UAE", price: 1500, type: "Electronics", usage: "Like New", amenities: [], image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80", daysListed: 5, isHot: false },
  { id: 203, title: "IKEA Sofa Set", location: "Sharjah, UAE", price: 800, type: "Furniture", usage: "Good Condition", amenities: [], image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", daysListed: 3, isHot: true },
  { id: 204, title: "MacBook Pro M1 2021", location: "Dubai, UAE", price: 4500, type: "Electronics", usage: "Excellent", amenities: [], image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80", daysListed: 1, isHot: true },
  { id: 205, title: "Dining Table with Chairs", location: "Al Ain, UAE", price: 600, type: "Furniture", usage: "Used", amenities: [], image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80", daysListed: 12, isHot: false },
  { id: 206, title: "PlayStation 5 Console", location: "Dubai, UAE", price: 1800, type: "Gaming", usage: "Like New", amenities: [], image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80", daysListed: 4, isHot: true },
];

const ITEMS_PER_PAGE = 12;

const ViewAllListings = () => {
  const { category: rawCategory } = useParams<{ category: string }>();
  const location = useLocation();
  const category = rawCategory ?? "space";
  const isPropertiesLanding = location.pathname === "/properties";
  const seoCategory = category.replace(/-/g, " ");
  const seoTitle = isPropertiesLanding
    ? "Browse Properties | Vionex AI"
    : `${seoCategory.charAt(0).toUpperCase()}${seoCategory.slice(1)} Listings`;
  const seoDescription = isPropertiesLanding
    ? "Browse verified property listings on Vionex AI with filters, pricing, and smart search."
    : `Browse ${seoCategory} listings on Vionex AI with filters, sorting, and smart search.`;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterUsage, setFilterUsage] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [sortOrder, setSortOrder] = useState<"" | "price_asc" | "price_desc">("");
  const [onlyHot, setOnlyHot] = useState(false);
  const [filterBeds, setFilterBeds] = useState<number | null>(null);
  const [filterBathrooms, setFilterBathrooms] = useState<number | null>(null);
  const [filterOccupantType, setFilterOccupantType] = useState<string | null>(null);
  const [filterRentPeriod, setFilterRentPeriod] = useState<string | null>(null);
  const [filterAmenities, setFilterAmenities] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // State for API properties (for "space" category)
  const [properties, setProperties] = useState<SeekerProperty[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  
  // State for API gyms (for "fitness" category)
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoadingGyms, setIsLoadingGyms] = useState(false);
  
  // State to track if we should show all items (when search returns zero)
  const [showAllItems, setShowAllItems] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Backend pagination state
  const [pagination, setPagination] = useState<{
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
  } | null>(null);

  // Read URL query parameters on mount and when they change
  useEffect(() => {
    const searchParam = searchParams.get("search");
    const placeParam = searchParams.get("place");
    const addressParam = searchParams.get("address");
    const propertyTypeIdParam = searchParams.get("property_type_id");
    const assetTypeIdParam = searchParams.get("asset_type_id");
    const purposeIdParam = searchParams.get("purpose_id");
    const bedroomsParam = searchParams.get("bedrooms");
    const bathroomsParam = searchParams.get("bathrooms");
    const occupantTypeIdParam = searchParams.get("occupant_type_id");
    const furnishingStatusIdParam = searchParams.get("furnishing_status_id");
    const completionStatusIdParam = searchParams.get("completion_status_id");
    const rentPeriodParam = searchParams.get("rent_period");
    const minPriceParam = searchParams.get("min_price");
    const maxPriceParam = searchParams.get("max_price");
    const minAreaParam = searchParams.get("min_area");
    const maxAreaParam = searchParams.get("max_area");
    const currencyParam = searchParams.get("currency");
    const orderingParam = searchParams.get("ordering");
    const amenityIdsParam = searchParams.get("amenity_ids");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radius");
    const pageParam = searchParams.get("page");
    
    // Update current page from URL
    if (pageParam) {
      const pageNum = Number(pageParam);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    } else {
      setCurrentPage(1);
    }

    if (searchParam) setSearch(searchParam);
    if (placeParam || addressParam) {
      const locationText = placeParam || addressParam || "";
      setSearch(prev => prev ? `${prev} ${locationText}` : locationText);
    }
    if (propertyTypeIdParam) setFilterType(propertyTypeIdParam);
    if (bedroomsParam) setFilterBeds(Number(bedroomsParam));
    if (bathroomsParam) setFilterBathrooms(Number(bathroomsParam));
    if (occupantTypeIdParam) setFilterOccupantType(occupantTypeIdParam);
    if (rentPeriodParam) setFilterRentPeriod(rentPeriodParam);
    if (minPriceParam) setMinPrice(Number(minPriceParam));
    if (maxPriceParam) setMaxPrice(Number(maxPriceParam));
    if (orderingParam === "price") setSortOrder("price_asc");
    if (orderingParam === "-price") setSortOrder("price_desc");
    if (amenityIdsParam) {
      const amenityIds = amenityIdsParam.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id));
      setFilterAmenities(amenityIds);
    }
    // Note: asset_type_id, purpose_id, furnishing_status_id, completion_status_id, min_area, max_area, currency, ordering
    // are handled by backend API call, no need to set local state for display
  }, [searchParams]);

  // Load properties from API when category is "space" or when filters change
  useEffect(() => {
    // Reset search state when category or search params change
    setShowAllItems(false);
    setHasSearched(false);
    
    if (category === "space") {
      loadProperties();
    } else if (category === "fitness") {
      loadGyms();
    }
  }, [category, searchParams]);

  const loadProperties = async (loadAll: boolean = false) => {
    setIsLoadingProperties(true);
    try {


      // Build query parameters from URL search params
      const queryParams: Record<string, string | number | null | undefined> = {};
      
      // If loadAll is true, skip all filters and just load with pagination
      if (!loadAll) {
      // Get all query parameters from URL
      const searchParam = searchParams.get("search");
      const placeParam = searchParams.get("place");
      const addressParam = searchParams.get("address");
      const propertyTypeIdParam = searchParams.get("property_type_id");
      const assetTypeIdParam = searchParams.get("asset_type_id");
      const purposeIdParam = searchParams.get("purpose_id");
      const bedroomsParam = searchParams.get("bedrooms");
      const minBedroomsParam = searchParams.get("min_bedrooms");
      const bathroomsParam = searchParams.get("bathrooms");
      const minBathroomsParam = searchParams.get("min_bathrooms");
      const occupantTypeIdParam = searchParams.get("occupant_type_id");
      const furnishingStatusIdParam = searchParams.get("furnishing_status_id");
      const completionStatusIdParam = searchParams.get("completion_status_id");
      const rentPeriodParam = searchParams.get("rent_period");
      const nationalityParam = searchParams.get("nationality");
      const minPriceParam = searchParams.get("min_price");
      const maxPriceParam = searchParams.get("max_price");
      const minAreaParam = searchParams.get("min_area");
      const maxAreaParam = searchParams.get("max_area");
      const currencyParam = searchParams.get("currency");
      const orderingParam = searchParams.get("ordering");
      const amenityIdsParam = searchParams.get("amenity_ids");
      const latParam = searchParams.get("lat");
      const lngParam = searchParams.get("lng");
      const radiusParam = searchParams.get("radius");
      
      // Add parameters to query object
      // Only send text-based search params if coordinates are NOT available
      if (latParam && lngParam) {
        // When coordinates are available, only send lat, lng, and radius
        // Don't send place, address, or search
      } else {
        // When no coordinates, send text-based search parameters
        if (searchParam) queryParams.search = searchParam;
        if (placeParam) queryParams.place = placeParam;
        if (addressParam) queryParams.address = addressParam;
      }
      if (propertyTypeIdParam) queryParams.property_type_id = propertyTypeIdParam;
      if (assetTypeIdParam) queryParams.asset_type_id = assetTypeIdParam;
      if (purposeIdParam) queryParams.purpose_id = purposeIdParam;
      if (bedroomsParam) queryParams.bedrooms = bedroomsParam;
      if (minBedroomsParam) queryParams.min_bedrooms = minBedroomsParam;
      if (bathroomsParam) queryParams.bathrooms = bathroomsParam;
      if (minBathroomsParam) queryParams.min_bathrooms = minBathroomsParam;
      if (occupantTypeIdParam) queryParams.occupant_type_id = occupantTypeIdParam;
      if (furnishingStatusIdParam) queryParams.furnishing_status_id = furnishingStatusIdParam;
      if (completionStatusIdParam) queryParams.completion_status_id = completionStatusIdParam;
      if (rentPeriodParam) queryParams.rent_period = rentPeriodParam;
      if (nationalityParam) queryParams.nationality = nationalityParam;
      if (minPriceParam) queryParams.min_price = minPriceParam;
      if (maxPriceParam) queryParams.max_price = maxPriceParam;
      if (minAreaParam) queryParams.min_area = minAreaParam;
      if (maxAreaParam) queryParams.max_area = maxAreaParam;
      if (currencyParam) queryParams.currency = currencyParam;
      if (orderingParam) queryParams.ordering = orderingParam;
      if (amenityIdsParam) queryParams.amenity_ids = amenityIdsParam;
      if (latParam) queryParams.lat = latParam;
      if (lngParam) queryParams.lng = lngParam;
      if (radiusParam) queryParams.radius = radiusParam;
      }
      
      // Set page size and current page
      queryParams.page_size = "12";
      const pageParam = searchParams.get("page");
      if (pageParam && !loadAll) {
        queryParams.page = pageParam;
      } else {
        queryParams.page = "1";
      }


      const response = await getPropertiesApi(queryParams);


      // Handle different response structures
      let propertiesArray: SeekerProperty[] = [];
      let paginationData = null;
      
      // Check if response is an AxiosResponse with data property
      if (response && 'data' in response) {
        const responseData = response.data;

        // Handle the structure: { success: true, data: [...], status_code: 200, meta: {...} }
        if (responseData?.success && Array.isArray(responseData?.data)) {
          propertiesArray = responseData.data;

          // Extract pagination info from meta
          const meta = responseData?.meta as any;
          if (meta?.pagination) {
            paginationData = {
              count: meta.pagination.count || 0,
              total_pages: meta.pagination.total_pages || 1,
              current_page: meta.pagination.current_page || 1,
              next: meta.pagination.next || null,
              previous: meta.pagination.previous || null,
            };

          }
        } 
        // Handle if data is directly an array
        else if (Array.isArray(responseData)) {
          propertiesArray = responseData;

        }
        // Handle nested data structure
        else if (responseData?.data && Array.isArray(responseData.data)) {
          propertiesArray = responseData.data;

          // Extract pagination info if available
          const meta = responseData?.meta as any;
          if (meta?.pagination) {
            paginationData = {
              count: meta.pagination.count || 0,
              total_pages: meta.pagination.total_pages || 1,
              current_page: meta.pagination.current_page || 1,
              next: meta.pagination.next || null,
              previous: meta.pagination.previous || null,
            };
          }
        }
      }

      // Check if this was a search (has filters) and returned zero results
      if (!loadAll && propertiesArray.length === 0 && hasSearched) {
        // Show apology and load all properties
        setShowAllItems(true);
        // Automatically load all properties after a short delay
        setTimeout(() => {
          loadProperties(true);
        }, 1500);
        return;
      }
      
      setProperties(propertiesArray);
      setPagination(paginationData);
      
      // Update current page from backend pagination
      if (paginationData) {
        setCurrentPage(paginationData.current_page);
      }
      
      // Mark that we've searched if there were any filter params (excluding page_size and page)
      const filterKeys = Object.keys(queryParams).filter(key => key !== 'page_size' && key !== 'page');
      if (!loadAll && filterKeys.length > 0) {
        setHasSearched(true);
      } else if (loadAll) {
        setHasSearched(false);
        setShowAllItems(false);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const loadGyms = async (loadAll: boolean = false) => {
    setIsLoadingGyms(true);
    try {


      // Build query parameters from URL search params (same structure as property search)
      const queryParams: Record<string, string | number | null | undefined> = {};
      
      // If loadAll is true, skip all filters and just load with pagination
      if (!loadAll) {
        // Get all query parameters from URL
        const searchParam = searchParams.get("search");
        const placeParam = searchParams.get("place");
        const addressParam = searchParams.get("address");
      const gymTypeIdParam = searchParams.get("gym_type_id");
      const genderAllowedParam = searchParams.get("gender_allowed");
      const facilityIdsParam = searchParams.get("facility_ids");
      const is24HoursParam = searchParams.get("is_24_hours");
      const latParam = searchParams.get("lat");
      const lngParam = searchParams.get("lng");
      const radiusParam = searchParams.get("radius");
      
      // Add parameters to query object
      // Only send text-based search params if coordinates are NOT available
      if (latParam && lngParam) {
        // When coordinates are available, only send lat, lng, and radius
        // Don't send place, address, or search
      } else {
        // When no coordinates, send text-based search parameters
        if (searchParam) queryParams.search = searchParam;
        if (placeParam) queryParams.place = placeParam;
        if (addressParam) queryParams.address = addressParam;
      }
      if (gymTypeIdParam) queryParams.gym_type_id = gymTypeIdParam;
      if (genderAllowedParam) queryParams.gender_allowed = genderAllowedParam;
      if (facilityIdsParam) queryParams.facility_ids = facilityIdsParam;
      if (is24HoursParam) queryParams.is_24_hours = is24HoursParam;
      if (latParam) queryParams.lat = latParam;
      if (lngParam) queryParams.lng = lngParam;
      if (radiusParam) queryParams.radius = radiusParam;
      }
      
      // Set page size and current page
      queryParams.page_size = "12";
      const pageParam = searchParams.get("page");
      if (pageParam && !loadAll) {
        queryParams.page = pageParam;
      } else {
        queryParams.page = "1";
      }


      const response = await getPublicGymsApi(queryParams);


      // Handle different response structures
      let gymsArray: Gym[] = [];
      let paginationData = null;
      
      // Check if response is an AxiosResponse with data property
      if (response && 'data' in response) {
        const responseData = response.data;

        // Handle different response structures
        if (responseData?.success && Array.isArray(responseData.data)) {
          gymsArray = responseData.data;

          // Extract pagination info if available
          const meta = responseData?.meta as any;
          if (meta?.pagination) {
            paginationData = {
              count: meta.pagination.count || 0,
              total_pages: meta.pagination.total_pages || 1,
              current_page: meta.pagination.current_page || 1,
              next: meta.pagination.next || null,
              previous: meta.pagination.previous || null,
            };
          }
        }
        else if (Array.isArray(responseData)) {
          gymsArray = responseData;

        }
        // Handle nested data structure
        else if (responseData?.data && Array.isArray(responseData.data)) {
          gymsArray = responseData.data;

          // Extract pagination info if available
          const meta = responseData?.meta as any;
          if (meta?.pagination) {
            paginationData = {
              count: meta.pagination.count || 0,
              total_pages: meta.pagination.total_pages || 1,
              current_page: meta.pagination.current_page || 1,
              next: meta.pagination.next || null,
              previous: meta.pagination.previous || null,
            };
          }
        }
      }

      // Check if this was a search (has filters) and returned zero results
      if (!loadAll && gymsArray.length === 0 && hasSearched) {
        // Show apology and load all gyms
        setShowAllItems(true);
        // Automatically load all gyms after a short delay
        setTimeout(() => {
          loadGyms(true);
        }, 1500);
        return;
      }
      
      setGyms(gymsArray);
      setPagination(paginationData);
      
      // Update current page from backend pagination
      if (paginationData) {
        setCurrentPage(paginationData.current_page);
      }
      
      // Mark that we've searched if there were any filter params (excluding page_size and page)
      const filterKeys = Object.keys(queryParams).filter(key => key !== 'page_size' && key !== 'page');
      if (!loadAll && filterKeys.length > 0) {
        setHasSearched(true);
      } else if (loadAll) {
        setHasSearched(false);
        setShowAllItems(false);
      }
    } catch (error) {
      console.error("Error loading gyms:", error);
    } finally {
      setIsLoadingGyms(false);
    }
  };

  // Map API property to PropertyCard format
  const mapPropertyToCard = (property: SeekerProperty) => {
    // Calculate days listed with proper date comparison
    let daysListed = 0;
    if (property.created_at) {
      const createdDate = new Date(property.created_at);
      const today = new Date();
      
      // Reset time to midnight for accurate day comparison
      const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const diffTime = todayOnly.getTime() - createdDateOnly.getTime();
      daysListed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Ensure minimum is 0 (today)
      if (daysListed < 0) daysListed = 0;
    }
    
    // Get property type name from either property_type_name or nested property_type.name
    const propertyTypeName = property.property_type_name || property.property_type?.name || "Property";
    
    // Get location from place (new) or address (old)
    const location = property.place || property.address || "";
    
    // Get main image from main_image (new API) or main_image_url (legacy)
    const mainImage = property.main_image || property.main_image_url || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80";
    
    // Get distance_km if available (from search with location)
    const distanceKm = (property as any).distance_km;
    
    // Get purpose name from either purpose_name (direct) or purpose.name (nested)
    const purposeName = (property as any).purpose_name || property.purpose?.name || undefined;
    
    return {
      id: property.id,
      title: property.title,
      location: location,
      price: parseFloat(property.price) || 0,
      currency: property.currency || "AED",
      rentPeriod: property.rent_period,
      type: propertyTypeName,
      beds: property.bedrooms,
      bathrooms: property.bathrooms,
      occupantType: property.occupant_type?.name,
      occupantsCount: property.property_type?.occupant_count ?? property.occupants_count,
      amenities: property.amenities?.map((a: any) => a.id || a) || [],
      image: mainImage,
      daysListed: daysListed,
      isHot: false,
      category: "space" as const,
      distanceKm: distanceKm, // Include distance if available
      purposeName: purposeName, // Include purpose name
    };
  };

  // Map API gym to PropertyCard format
  const mapGymToCard = (gym: Gym) => {
    // Calculate days listed with proper date comparison
    let daysListed = 0;
    if (gym.created_at) {
      const createdDate = new Date(gym.created_at);
      const today = new Date();
      
      // Reset time to midnight for accurate day comparison
      const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const diffTime = todayOnly.getTime() - createdDateOnly.getTime();
      daysListed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Ensure minimum is 0 (today)
      if (daysListed < 0) daysListed = 0;
    }
    
    // Get gym type name from either gym_type_name or nested gym_type.name
    const gymTypeName = gym.gym_type_name || gym.gym_type?.name || "Gym";
    
    // Get location from address
    const location = gym.address || "";
    
    // Get main image
    const mainImage = gym.main_image || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80";
    
    // Get distance_km if available (from search with location)
    const distanceKm = (gym as any).distance_km;
    
    // Map gender_allowed: "MIXED" -> "Unisex", "MALE" -> "Male", "FEMALE" -> "Female"
    const genderLabel = gym.gender_allowed === "MIXED" ? "Unisex" : gym.gender_allowed === "MALE" ? "Male" : gym.gender_allowed === "FEMALE" ? "Female" : gym.gender_allowed || "";
    
    return {
      id: gym.id,
      title: gym.name,
      location: location,
      price: 0, // Gyms don't have price in PropertyCard format
      currency: "AED",
      rentPeriod: undefined,
      type: gymTypeName,
      beds: undefined,
      bathrooms: undefined,
      occupantType: undefined,
      occupantsCount: undefined,
      amenities: gym.facilities?.map((f: any) => f.id || f) || [],
      image: mainImage,
      daysListed: daysListed,
      isHot: false,
      category: "fitness" as const,
      distanceKm: distanceKm, // Include distance if available
      gymTypeName: gymTypeName,
      genderAllowed: genderLabel,
    };
  };

  const getListings = () => {
    switch (category) {
      case "space":
        // For "space", use API data mapped to card format
        return properties.map(mapPropertyToCard);
      case "fitness":
        // For "fitness", use API data mapped to card format
        return gyms.map(mapGymToCard);
      case "drive":
        return allDriveListings;
      case "needs":
        return allNeedsListings;
      default:
        return allSpaceListings;
    }
  };

  const getTitle = () => {
    switch (category) {
      case "space":
        return "All Spaces";
      case "fitness":
        return "All Gyms";
      case "drive":
        return "All Vehicles";
      case "needs":
        return "All Needs";
      default:
        return "All Spaces";
    }
  };

  // Get search query from URL params for display
  const getSearchQuery = () => {
    const searchParam = searchParams.get("search");
    const placeParam = searchParams.get("place");
    const addressParam = searchParams.get("address");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    
    // Priority 1: If there's a search query, return it
    if (searchParam) {
      return searchParam;
    }
    
    // Priority 2: If there's a place or address (location name), return it
    // This includes cases where coordinates are used but location name is also provided
    if (placeParam || addressParam) {
      return placeParam || addressParam || "";
    }
    
    // Priority 3: If there are only coordinates without location name, show "Current Location"
    if (latParam && lngParam) {
      return "Current Location";
    }
    
    return null;
  };

  const listings = getListings();

  // Derive dynamic filter options from current listings (used mainly for drive/needs)
  const types = Array.from(new Set(listings.map((l: any) => l.type).filter(Boolean)));
  const usages = Array.from(new Set(listings.map((l: any) => l.usage).filter(Boolean)));
  const bedsOptions = Array.from(new Set(listings.map((l: any) => l.beds).filter(Boolean))).sort(
    (a: number, b: number) => a - b
  );
  const bathroomsOptions = Array.from(
    new Set(listings.map((l: any) => l.bathrooms).filter(Boolean))
  ).sort((a: number, b: number) => a - b);
  const occupantTypes = Array.from(
    new Set(listings.map((l: any) => l.occupantType).filter(Boolean))
  );
  const rentPeriods = Array.from(
    new Set(listings.map((l: any) => l.rentPeriod).filter(Boolean))
  );

  // For "space" category, backend handles all filtering - use properties directly
  // For other categories, use client-side filtering
  let filtered: any[];

  if (category === "space") {
    // Backend already filtered the properties based on query parameters
    // Just use them directly without additional client-side filtering
    filtered = listings;

  } else {
    // Client-side filtering for other categories (drive, needs)
  const matchesSearch = (item: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
      // Split search query to handle multiple terms (e.g., "Dubai Marina")
      const searchTerms = q.split(/\s+/).filter(term => term.length > 0);
      const searchableText = `${item.title} ${item.location} ${item.type || ""}`.toLowerCase();
      // Check if all search terms are found in the searchable text
      return searchTerms.every(term => searchableText.includes(term));
  };

    filtered = listings.filter((item: any) => {
    if (!matchesSearch(item)) return false;
    if (filterType && String(item.type) !== filterType) return false;
    if (filterUsage && String(item.usage) !== filterUsage) return false;
    if (filterBeds && Number(item.beds) !== filterBeds) return false;
      if (filterBathrooms && item.bathrooms && Number(item.bathrooms) !== filterBathrooms) return false;
      if (filterOccupantType && item.occupantType && String(item.occupantType) !== filterOccupantType) return false;
      if (filterRentPeriod && item.rentPeriod && String(item.rentPeriod) !== filterRentPeriod) return false;
    if (onlyHot && !item.isHot) return false;
    if (minPrice !== "" && Number(item.price) < Number(minPrice)) return false;
    if (maxPrice !== "" && Number(item.price) > Number(maxPrice)) return false;
      // Filter by amenities - property must have all selected amenities
      if (filterAmenities.length > 0 && item.amenities) {
        const propertyAmenityIds = Array.isArray(item.amenities) ? item.amenities : [];
        const hasAllAmenities = filterAmenities.every(amenityId => propertyAmenityIds.includes(amenityId));
        if (!hasAllAmenities) return false;
      }
    return true;
  });
  }

  // Apply client-side sorting for space and fitness categories
  let sortedListings = filtered;
  if ((category === "space" || category === "fitness") && sortOrder) {
    sortedListings = [...filtered].sort((a, b) => {
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      return sortOrder === "price_asc" ? priceA - priceB : priceB - priceA;
    });
  }

  // Handle pagination: backend for "space", client-side for others
  let totalPages: number;
  let currentListings: any[];

  if (category === "space") {
    // Use backend pagination
    totalPages = pagination?.total_pages || 1;
    currentListings = sortedListings; // Backend already returns paginated results
  } else {
    // Client-side pagination for other categories
    totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const source = category === "fitness" ? sortedListings : filtered;
    currentListings = source.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (category === "space") {
      // Update URL with page parameter for backend pagination
      const params = new URLSearchParams(searchParams);
      if (newPage === 1) {
        params.delete("page");
      } else {
        params.set("page", String(newPage));
      }
      setSearchParams(params);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Client-side pagination for other categories
      setCurrentPage(newPage);
    }
  };

  // reset page when filters/search change (client-side filters for non-space categories)
  useEffect(
    () => {
      if (category !== "space") {
        setCurrentPage(1);
      }
    },
    [search, filterType, filterUsage, minPrice, maxPrice, onlyHot, filterBeds, filterBathrooms, filterOccupantType, filterRentPeriod, filterAmenities, category, sortOrder]
  );


  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title={seoTitle} 
        description={seoDescription}
        canonical={isPropertiesLanding ? "https://vionex-ai.com/properties" : undefined}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button & Title */}
          <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col">
              {getSearchQuery() ? (
                <>
                  <h1 className="font-display text-3xl font-bold text-foreground">
                    Showing results for
                  </h1>
                  <p className="font-display text-2xl font-semibold text-primary mt-1">
                    {getSearchQuery()}
                  </p>
                </>
              ) : (
            <h1 className="font-display text-3xl font-bold text-foreground">
              {getTitle()}
            </h1>
              )}
              </div>
            </div>
            {(category === "space" || category === "fitness") && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by</span>
                <Select
                  value={sortOrder}
                  onValueChange={(value) =>
                    setSortOrder(value as "" | "price_asc" | "price_desc")
                  }
                >
                  <SelectTrigger className="w-[180px] bg-muted/30 border-glass-border">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>


          {/* Listings Grid */}
          {((category === "space" && isLoadingProperties) || (category === "fitness" && isLoadingGyms)) ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {[...Array(12)].map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : currentListings.length === 0 ? (
            <div className="text-center py-12">
              {showAllItems ? (
                <>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Sorry, no results found for your search.
                  </p>
                  <p className="text-muted-foreground mb-4">
                    Showing all {category === "fitness" ? "gyms" : "properties"} instead...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No {category === "fitness" ? "gyms" : "properties"} available.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {currentListings.map((item) => (
              <PropertyCard key={item.id} {...item} category={category as "space" | "drive" | "needs"} />
            ))}
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevPage = category === "space" 
                    ? (pagination?.current_page || 1) - 1 
                    : currentPage - 1;
                  handlePageChange(Math.max(1, prevPage));
                }}
                disabled={
                  category === "space" 
                    ? !pagination?.previous 
                    : currentPage === 1
                }
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isCurrentPage = category === "space"
                    ? page === (pagination?.current_page || 1)
                    : page === currentPage;
                  
                  return (
                  <Button
                    key={page}
                      variant={isCurrentPage ? "neon" : "ghost"}
                    size="sm"
                      onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextPage = category === "space"
                    ? (pagination?.current_page || 1) + 1
                    : currentPage + 1;
                  handlePageChange(Math.min(totalPages, nextPage));
                }}
                disabled={
                  category === "space"
                    ? !pagination?.next
                    : currentPage === totalPages
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Skeleton Component for Property Cards
const PropertyCardSkeleton = () => {
  return (
    <div className="group glass rounded-2xl overflow-hidden neon-border">
      {/* Image Skeleton */}
      <div className="relative h-48 overflow-hidden">
        <Skeleton className="h-full w-full" />
        <div className="absolute top-3 left-3">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="absolute top-3 right-3">
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <div className="absolute bottom-3 right-3">
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        
        <div className="flex gap-4 flex-wrap">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
};

export default ViewAllListings;
