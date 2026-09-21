import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  MapPin,
  Home,
  Car,
  ShoppingBag,
  Locate,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Dumbbell,
} from "lucide-react";
import { getPropertiesApi } from "@/services/seeker/myspace";
import {
  getPropertyTypesPublicApi,
  getOccupantTypesPublicApi,
  getAmenitiesPublicApi,
  getAssetTypesPublicApi,
  getPurposesPublicApi,
  getFurnishingStatusesPublicApi,
  getCompletionStatusesPublicApi,
  getRentPeriodsPublicApi,
  PropertyType,
  OccupantType,
  Amenity,
  AssetType,
  Purpose,
  FurnishingStatus,
  CompletionStatus,
  RentPeriod,
} from "@/services/seeker/myspace";
import { getPublicGymTypesApi, getPublicFacilitiesApi, getPublicGymsApi, type GymType, type Facility } from "@/services/admin/fitness";
import StoriesSection from "@/components/StoriesSection";
import PropertyMarketSnapshot from "./PropertyMarketSnapshot";
import { getOffersApi } from "@/services/admin/offers";

const categories = [
  { id: "space", label: "My Space", icon: Home, description: "Real Estate" },
  { id: "fitness", label: "My Fitness", icon: Dumbbell, description: "Fitness & Wellness" },
  // { id: "drive", label: "My Drive", icon: Car, description: "Vehicles" },
  // { id: "needs", label: "My Needs", icon: ShoppingBag, description: "Personal Items" },
];

// Google Maps API Key from environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

const HeroSection = ({ onCategorySelect }) => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("space");
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Location coordinates state
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);
  const [radius, setRadius] = useState<string>(""); // Radius in km, no default
  
  // Google Places Autocomplete states
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Filter states for My Space
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [occupantType, setOccupantType] = useState("");
  const [rentPeriod, setRentPeriod] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [assetType, setAssetType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [furnishingStatus, setFurnishingStatus] = useState("");
  const [completionStatus, setCompletionStatus] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [currency, setCurrency] = useState("");
  const [ordering, setOrdering] = useState("");
  
  // Filter states for My Fitness
  const [gymType, setGymType] = useState("");
  const [genderAllowed, setGenderAllowed] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);
  const [is24Hours, setIs24Hours] = useState<boolean | null>(null);
  
  // Backend filter options
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [occupantTypes, setOccupantTypes] = useState<OccupantType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [furnishingStatuses, setFurnishingStatuses] = useState<FurnishingStatus[]>([]);
  const [completionStatuses, setCompletionStatuses] = useState<CompletionStatus[]>([]);
  const [rentPeriods, setRentPeriods] = useState<RentPeriod[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  
  // Fitness filter options
  const [gymTypes, setGymTypes] = useState<GymType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [offerStats, setOfferStats] = useState({
    activeCount: "500+",
    pricePerListing: "50",
    validityMonths: "3",
    cashback: "20",
  });

  // Load Google Maps Places library
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsGoogleMapsLoaded(true);
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // (Disabled auto-location) We now only fetch current location when user clicks the button.

  // Load filter options from backend on component mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoadingFilters(true);
      
      // Helper function to extract data array from response (same as PropertyForm)
      const extractDataArray = (response: any, name: string) => {
        let dataArray = null;
        
        // Try different response structures
        if (Array.isArray(response?.data?.data)) {
          dataArray = response.data.data;
        } else if (response?.data?.success && Array.isArray(response?.data?.data)) {
          dataArray = response.data.data;
        } else if (Array.isArray(response?.data)) {
          const firstItem = response.data[0];
          if (firstItem && typeof firstItem === 'object' && !firstItem.success) {
            dataArray = response.data;
          } else {
            if (response.data?.data && Array.isArray(response.data.data)) {
              dataArray = response.data.data;
            }
          }
        } else if (Array.isArray(response)) {
          dataArray = response;
        }
        
        return dataArray;
      };
      
      try {
        // Fetch Property Types (public)
        const propertyTypesRes = await getPropertyTypesPublicApi();
        
        if (propertyTypesRes && 'data' in propertyTypesRes) {
          const extractedArray = extractDataArray(propertyTypesRes, "PropertyTypes");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setPropertyTypes(extractedArray);
          } else {
            // Try the same pattern as PropertyForm
            let propertyTypesArray = propertyTypesRes.data?.data ?? propertyTypesRes.data;
            if (Array.isArray(propertyTypesArray) && propertyTypesArray.length > 0) {
              setPropertyTypes(propertyTypesArray);
            } else if (propertyTypesArray && typeof propertyTypesArray === 'object' && !Array.isArray(propertyTypesArray) && 'success' in propertyTypesArray && propertyTypesArray.success && Array.isArray(propertyTypesArray.data)) {
              setPropertyTypes(propertyTypesArray.data);
            }
          }
        } else {
        }

        // Fetch Occupant Types (public)
        const occupantTypesRes = await getOccupantTypesPublicApi();
        
        if (occupantTypesRes && 'data' in occupantTypesRes) {
          const extractedArray = extractDataArray(occupantTypesRes, "OccupantTypes");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setOccupantTypes(extractedArray);
          } else {
            // Try the same pattern as PropertyForm
            let occupantTypesArray = occupantTypesRes.data?.data ?? occupantTypesRes.data;
            if (Array.isArray(occupantTypesArray) && occupantTypesArray.length > 0) {
              setOccupantTypes(occupantTypesArray);
            } else if (occupantTypesArray && typeof occupantTypesArray === 'object' && !Array.isArray(occupantTypesArray) && 'success' in occupantTypesArray && occupantTypesArray.success && Array.isArray(occupantTypesArray.data)) {
              setOccupantTypes(occupantTypesArray.data);
            }
          }
        } else {
        }

        // Fetch Amenities (public)
        const amenitiesRes = await getAmenitiesPublicApi();
        
        if (amenitiesRes && 'data' in amenitiesRes) {
          const extractedArray = extractDataArray(amenitiesRes, "Amenities");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setAmenities(extractedArray);
          } else {
            // Try the same pattern as PropertyForm
            let amenitiesArray = amenitiesRes.data?.data ?? amenitiesRes.data;
            if (Array.isArray(amenitiesArray) && amenitiesArray.length > 0) {
              setAmenities(amenitiesArray);
            } else if (amenitiesArray && typeof amenitiesArray === 'object' && !Array.isArray(amenitiesArray) && 'success' in amenitiesArray && amenitiesArray.success && Array.isArray(amenitiesArray.data)) {
              setAmenities(amenitiesArray.data);
            }
          }
        } else {
        }

        // Fetch Asset Types (public)
        const assetTypesRes = await getAssetTypesPublicApi();
        
        if (assetTypesRes && 'data' in assetTypesRes) {
          const extractedArray = extractDataArray(assetTypesRes, "AssetTypes");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setAssetTypes(extractedArray);
          } else {
            let assetTypesArray = assetTypesRes.data?.data ?? assetTypesRes.data;
            if (Array.isArray(assetTypesArray) && assetTypesArray.length > 0) {
              setAssetTypes(assetTypesArray);
            } else if (assetTypesArray && typeof assetTypesArray === 'object' && !Array.isArray(assetTypesArray) && 'success' in assetTypesArray && assetTypesArray.success && Array.isArray(assetTypesArray.data)) {
              setAssetTypes(assetTypesArray.data);
            }
          }
        }

        // Fetch Purposes (public)
        const purposesRes = await getPurposesPublicApi();
        
        if (purposesRes && 'data' in purposesRes) {
          const extractedArray = extractDataArray(purposesRes, "Purposes");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setPurposes(extractedArray);
          } else {
            let purposesArray = purposesRes.data?.data ?? purposesRes.data;
            if (Array.isArray(purposesArray) && purposesArray.length > 0) {
              setPurposes(purposesArray);
            } else if (purposesArray && typeof purposesArray === 'object' && !Array.isArray(purposesArray) && 'success' in purposesArray && purposesArray.success && Array.isArray(purposesArray.data)) {
              setPurposes(purposesArray.data);
            }
          }
        }

        // Fetch Furnishing Statuses (public)
        const furnishingStatusesRes = await getFurnishingStatusesPublicApi();
        
        if (furnishingStatusesRes && 'data' in furnishingStatusesRes) {
          const extractedArray = extractDataArray(furnishingStatusesRes, "FurnishingStatuses");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setFurnishingStatuses(extractedArray);
          } else {
            let furnishingStatusesArray = furnishingStatusesRes.data?.data ?? furnishingStatusesRes.data;
            if (Array.isArray(furnishingStatusesArray) && furnishingStatusesArray.length > 0) {
              setFurnishingStatuses(furnishingStatusesArray);
            } else if (furnishingStatusesArray && typeof furnishingStatusesArray === 'object' && !Array.isArray(furnishingStatusesArray) && 'success' in furnishingStatusesArray && furnishingStatusesArray.success && Array.isArray(furnishingStatusesArray.data)) {
              setFurnishingStatuses(furnishingStatusesArray.data);
            }
          }
        }

        // Fetch Completion Statuses (public)
        const completionStatusesRes = await getCompletionStatusesPublicApi();
        
        if (completionStatusesRes && 'data' in completionStatusesRes) {
          const extractedArray = extractDataArray(completionStatusesRes, "CompletionStatuses");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setCompletionStatuses(extractedArray);
          } else {
            let completionStatusesArray = completionStatusesRes.data?.data ?? completionStatusesRes.data;
            if (Array.isArray(completionStatusesArray) && completionStatusesArray.length > 0) {
              setCompletionStatuses(completionStatusesArray);
            } else if (completionStatusesArray && typeof completionStatusesArray === 'object' && !Array.isArray(completionStatusesArray) && 'success' in completionStatusesArray && completionStatusesArray.success && Array.isArray(completionStatusesArray.data)) {
              setCompletionStatuses(completionStatusesArray.data);
            }
          }
        }

        // Fetch Rent Periods (public)
        const rentPeriodsRes = await getRentPeriodsPublicApi();
        if (rentPeriodsRes && 'data' in rentPeriodsRes) {
          const extractedArray = extractDataArray(rentPeriodsRes, "RentPeriods");
          if (Array.isArray(extractedArray) && extractedArray.length > 0) {
            setRentPeriods(extractedArray as string[]);
          } else {
            let rentPeriodsArray = rentPeriodsRes.data?.data ?? rentPeriodsRes.data;
            if (Array.isArray(rentPeriodsArray) && rentPeriodsArray.length > 0) {
              setRentPeriods(rentPeriodsArray as string[]);
            } else if (rentPeriodsArray && typeof rentPeriodsArray === 'object' && !Array.isArray(rentPeriodsArray) && 'success' in rentPeriodsArray && rentPeriodsArray.success && Array.isArray(rentPeriodsArray.data)) {
              setRentPeriods(rentPeriodsArray.data as string[]);
            }
          }
        }

        
      } catch (error: any) {
        // Fallback to empty arrays on error
        setPropertyTypes([]);
        setOccupantTypes([]);
        setAmenities([]);
        setAssetTypes([]);
        setPurposes([]);
        setFurnishingStatuses([]);
        setCompletionStatuses([]);
        setRentPeriods([]);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    // Load filter options immediately when component mounts
    loadFilterOptions();
  }, []);

  // Sync initial category on mount
  useEffect(() => {
    // Default to "space" (index 0) on mount
    onCategorySelect?.(0, categories[0]);
  }, []);

  // Log state changes to verify updates
  useEffect(() => {
  }, [propertyTypes, occupantTypes, amenities, assetTypes, purposes, furnishingStatuses, completionStatuses]);

  // Load fitness filter options and call gyms API when category is fitness
  useEffect(() => {
    if (activeCategory === "fitness") {
      loadFitnessFilters();
      // Call /fitness/gyms/ without headers when fitness category is selected
      const loadGyms = async () => {
        try {
          const response = await getPublicGymsApi();
        } catch (error) {
        }
      };
      loadGyms();
    }
  }, [activeCategory]);

  useEffect(() => {
    const role = activeCategory === "fitness" ? "gym_owner" : "owner";
    const fetchOffers = async () => {
      try {
        const response = await getOffersApi(role);
        if ("data" in response && response.data?.data?.length) {
          const offer = response.data.data[0];
          const totalActiveCount = Number(offer?.total_active_count ?? 0);
          const pricePerListing = Math.trunc(Number(offer?.price_per_listing ?? 0));
          const validityMonths = Math.trunc(Number(offer?.validity_months ?? 0));
          const cashback = Math.trunc(Number(offer?.cashback ?? 0));

          const activeCount =
            role === "owner"
              ? totalActiveCount < 100
                ? "100+"
                : String(totalActiveCount)
              : totalActiveCount < 50
              ? "50+"
              : String(totalActiveCount);

          setOfferStats({
            activeCount: activeCount || "0",
            pricePerListing: pricePerListing ? String(pricePerListing) : "0",
            validityMonths: validityMonths ? String(validityMonths) : "0",
            cashback: cashback ? String(cashback) : "0",
          });
        }
      } catch (error) {
        // Keep previous stats on failure
      }
    };

    if (activeCategory === "space" || activeCategory === "fitness") {
      fetchOffers();
    }
  }, [activeCategory]);

  const loadFitnessFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const [gymTypesRes, facilitiesRes] = await Promise.all([
        getPublicGymTypesApi(),
        getPublicFacilitiesApi(),
      ]);

      if ('data' in gymTypesRes && 'status' in gymTypesRes) {
        const gymTypesData = gymTypesRes.data?.data || [];
        setGymTypes(gymTypesData);
      }

      if ('data' in facilitiesRes && 'status' in facilitiesRes) {
        const facilitiesData = facilitiesRes.data?.data || [];
        setFacilities(facilitiesData);
      }
    } catch (error) {
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const handleCategoryClick = async (cat, index) => {
    setActiveCategory(cat.id);
    onCategorySelect?.(index, cat);
    
    // Call /fitness/gyms/ without headers when fitness category is selected
    if (cat.id === "fitness") {
      try {
        const response = await getPublicGymsApi();
      } catch (error) {
      }
    }
    
    // Reset filters when switching categories
    if (cat.id !== "space") {
      setPropertyType("");
      setBedrooms("");
      setBathrooms("");
      setOccupantType("");
      setRentPeriod("");
      setMinPrice("");
      setMaxPrice("");
      setSelectedAmenities([]);
      setAssetType("");
      setPurpose("");
      setFurnishingStatus("");
      setCompletionStatus("");
      setMinArea("");
      setMaxArea("");
      setCurrency("");
      setOrdering("");
    }
    if (cat.id !== "fitness") {
      setGymType("");
      setGenderAllowed("");
      setSelectedFacilities([]);
      setIs24Hours(null);
    }
    // Reset location for all categories
    setSelectedLatitude(null);
    setSelectedLongitude(null);
    setRadius("");
    setSearchQuery("");
    setLocation("");
  };

  const handleAmenityToggle = (amenityId: number) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handleDetectLocation = async () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Store coordinates so they can be sent as lat/lng in search params
          setSelectedLatitude(latitude);
          setSelectedLongitude(longitude);
          
          try {
            // Reverse geocode using Google Maps Geocoding API
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            
            if (data.status === "OK" && data.results && data.results.length > 0) {
              // Get the most relevant result
              const result = data.results[0];
              const locationName = result.formatted_address || result.address_components[0]?.long_name || "Current Location";
              
              // Set location name in search query
              setSearchQuery(locationName);
              setLocation(locationName);
            } else {
              setSearchQuery("Current Location");
              setLocation("Current Location");
            }
          } catch (error) {
            setSearchQuery("Current Location");
            setLocation("Current Location");
          } finally {
          setIsLocating(false);
          }
        },
        () => {
          setLocation("Location access denied");
          setIsLocating(false);
        }
      );
    } else {
      setLocation("Geolocation not supported");
      setIsLocating(false);
    }
  };

  // Fetch search suggestions from Google Places API
  const fetchSearchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!isGoogleMapsLoaded || !autocompleteServiceRef.current) {
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "ae" }, // Restrict to UAE
          types: ["geocode", "establishment"], // Get both addresses and places
        },
        (predictions: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
          }
          setIsLoadingSuggestions(false);
        }
      );
    } catch (error) {
      setSearchSuggestions([]);
      setIsLoadingSuggestions(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (value.length >= 2) {
      // Debounce search for better performance
      searchDebounceRef.current = setTimeout(() => {
        fetchSearchSuggestions(value);
      }, 300);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setLocation(suggestion.description);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    
    // Get place details including latitude and longitude
    if (window.google && window.google.maps && window.google.maps.places) {
      const placesService = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      
      placesService.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ["formatted_address", "geometry", "name"],
        },
        (place: any, status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            // Update location name if formatted address is available
            if (place.formatted_address) {
              setSearchQuery(place.formatted_address);
              setLocation(place.formatted_address);
            }
            
            // Extract latitude and longitude
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              
              // Store coordinates in state
              setSelectedLatitude(lat);
              setSelectedLongitude(lng);
              
              // Log the coordinates (for now)
              
              // TODO: Send lat/lng to backend when needed
              // Example: await sendLocationToBackend({ latitude: lat, longitude: lng });
            } else {
              setSelectedLatitude(null);
              setSelectedLongitude(null);
              setRadius(""); // Reset radius when coordinates are cleared
            }
          } else {
            setSelectedLatitude(null);
            setSelectedLongitude(null);
            setRadius(""); // Reset radius when coordinates are cleared
          }
        }
      );
    } else {
      setSelectedLatitude(null);
      setSelectedLongitude(null);
      setRadius(""); // Reset radius to default when coordinates are cleared
    }
  };

  const handleSearch = async () => {
    // Close suggestions when searching
    setShowSuggestions(false);
    
    if (activeCategory === "space") {
      // Build query parameters matching backend API
      const params = new URLSearchParams();
      
      // Location handling: Use coordinates if available, otherwise use text search
      if (selectedLatitude !== null && selectedLongitude !== null) {
        // If coordinates exist, ONLY send lat, lng, and radius
        params.set("lat", selectedLatitude.toString());
        params.set("lng", selectedLongitude.toString());
        // Send radius if provided, otherwise use default 5
        const radiusValue = radius.trim() || "5";
        params.set("radius", radiusValue);
      } else {
        // If no coordinates, send text-based search parameters
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        if (location.trim()) {
          params.set("place", location.trim());
          params.set("address", location.trim());
        }
      }
      
      // Property Type (find ID from name)
      if (propertyType) {
        const selectedPropertyType = propertyTypes.find(pt => pt.name === propertyType);
        if (selectedPropertyType) {
          params.set("property_type_id", selectedPropertyType.id.toString());
        }
      }
      
      // Asset Type (find ID from name)
      if (assetType) {
        const selectedAssetType = assetTypes.find(at => at.name === assetType);
        if (selectedAssetType) {
          params.set("asset_type_id", selectedAssetType.id.toString());
        }
      }
      
      // Purpose (find ID from name)
      if (purpose) {
        const selectedPurpose = purposes.find(p => p.name === purpose);
        if (selectedPurpose) {
          params.set("purpose_id", selectedPurpose.id.toString());
        }
      }
      
      // Bedrooms
      if (bedrooms) {
        params.set("bedrooms", bedrooms);
        params.set("min_bedrooms", bedrooms); // Also set min_bedrooms
      }
      
      // Bathrooms
      if (bathrooms) {
        params.set("bathrooms", bathrooms);
        params.set("min_bathrooms", bathrooms); // Also set min_bathrooms
      }
      
      // Occupant Type (find ID from name)
      if (occupantType) {
        const selectedOccupantType = occupantTypes.find(ot => ot.name === occupantType);
        if (selectedOccupantType) {
          params.set("occupant_type_id", selectedOccupantType.id.toString());
        }
      }
      
      // Furnishing Status (find ID from name)
      if (furnishingStatus) {
        const selectedFurnishingStatus = furnishingStatuses.find(fs => fs.name === furnishingStatus);
        if (selectedFurnishingStatus) {
          params.set("furnishing_status_id", selectedFurnishingStatus.id.toString());
        }
      }
      
      // Completion Status (find ID from name)
      if (completionStatus) {
        const selectedCompletionStatus = completionStatuses.find(cs => cs.name === completionStatus);
        if (selectedCompletionStatus) {
          params.set("completion_status_id", selectedCompletionStatus.id.toString());
        }
      }
      
      // Rent Period
      if (rentPeriod) {
        params.set("rent_period", rentPeriod);
      }
      
      // Price Range
      if (minPrice) {
        params.set("min_price", minPrice);
      }
      if (maxPrice) {
        params.set("max_price", maxPrice);
      }
      
      // Area Range
      if (minArea) {
        params.set("min_area", minArea);
      }
      if (maxArea) {
        params.set("max_area", maxArea);
      }
      
      // Currency
      if (currency) {
        params.set("currency", currency);
      }
      
      // Ordering/Sorting
      if (ordering) {
        params.set("ordering", ordering);
      }
      
      // Amenities (comma-separated IDs)
      if (selectedAmenities.length > 0) {
        params.set("amenity_ids", selectedAmenities.join(","));
      }

      
      // Set page size
      params.set("page_size", "6");
      
      // Build queryParams object for direct backend call
      const queryParams: Record<string, string> = {};
      params.forEach((value, key) => {
        queryParams[key] = value;
      });

      try {
        const response = await getPropertiesApi(queryParams);
      } catch (error) {
      }

      // Navigate to /listings/space with query parameters
      const queryString = params.toString();
      navigate(`/listings/space${queryString ? `?${queryString}` : ""}`);
    } else if (activeCategory === "fitness") {
      // Build query parameters for fitness search (same structure as property search)
      const params = new URLSearchParams();
      
      // Location handling: Use coordinates if available, otherwise use text search
      if (selectedLatitude !== null && selectedLongitude !== null) {
        // If coordinates exist, ONLY send lat, lng, and radius
        params.set("lat", selectedLatitude.toString());
        params.set("lng", selectedLongitude.toString());
        // Send radius if provided, otherwise use default 5
        const radiusValue = radius.trim() || "5";
        params.set("radius", radiusValue);
      } else {
        // If no coordinates, send text-based search parameters
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        if (location.trim()) {
          params.set("place", location.trim());
          params.set("address", location.trim());
        }
      }
      
      // Gym Type (find ID from name)
      if (gymType) {
        const selectedGymType = gymTypes.find(gt => gt.name === gymType);
        if (selectedGymType) {
          params.set("gym_type_id", selectedGymType.id.toString());
        }
      }
      
      // Gender Allowed
      if (genderAllowed) {
        params.set("gender_allowed", genderAllowed);
      }
      
      // Facilities (comma-separated IDs)
      if (selectedFacilities.length > 0) {
        params.set("facility_ids", selectedFacilities.join(","));
      }
      
      // 24 Hours
      if (is24Hours !== null) {
        params.set("is_24_hours", is24Hours.toString());
      }
      
      // Set page size
      params.set("page_size", "12");
      
      // Build queryParams object for direct backend call
      const queryParams: Record<string, string> = {};
      params.forEach((value, key) => {
        queryParams[key] = value;
      });

      try {
        const response = await getPublicGymsApi(queryParams);
      } catch (error) {
      }
      
      // Navigate to /listings/fitness with query parameters
      const queryString = params.toString();
      navigate(`/listings/fitness${queryString ? `?${queryString}` : ""}`);
    } else {
      // For other categories, navigate without filters for now
      navigate(`/view-all/${activeCategory}`);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return (
    <section className={`relative h-full pt-2 md:pt-12 ${showSuggestions ? "pb-64 md:pb-72 overflow-visible" : "pb-1 md:pb-2 overflow-hidden"} z-50`}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero opacity-0 dark:opacity-100" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/0 dark:bg-neon-cyan/10 rounded-full blur-3xl animate-pulse-glow" />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/0 dark:bg-neon-purple/10 rounded-full blur-3xl animate-pulse-glow"
        style={{ animationDelay: "1.5s" }}
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-0 dark:opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.2) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--primary) / 0.2) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10 w-full">
        {/* Stories/Agents Section */}
        <StoriesSection />

        <div className=" text-center max-w-4xl mx-auto mb-0 mt-0 animate-slide-up">
          <h1 className="font-display text-xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">
            Find Your Perfect
            <span className="block text-primary neon-text">Living Space in UAE</span>
          </h1>

          <p className="text-xs md:text-sm text-foreground max-w-2xl mx-auto mb-2 md:mb-3">
            <span className="block md:hidden">Discover your ideal place to live in UAE with Vionex AI.</span>
            <span className="hidden md:block">
              Discover your ideal place to live with Vionex AI.
              Choose properties that fit your budget.
              Sell your property at the best price with help from trusted local agents on Vionex AI marketplace.
            </span>
          </p>
        </div>

        {/* Category Tabs */}
        <div
          className="flex justify-center gap-2 mb-3 md:mb-3 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          {categories.map((cat, index) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "filterActive" : "filter"}
              onClick={() => handleCategoryClick(cat, index)}
              className="flex-col h-auto py-2 px-4"
            >
              <cat.icon className="h-4 w-4 mb-0.5" />
              <span className="text-[10px] font-medium">{cat.label}</span>
            </Button>
          ))}
        </div>

        {/* Search Card */}
        <div
          className="max-w-4xl mx-auto glass rounded-2xl p-2 md:p-3 neon-border animate-slide-up relative z-[100] overflow-visible"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Search Inputs - Single field for space and fitness, two fields for other categories */}
          {(activeCategory === "space" || activeCategory === "fitness") ? (
            <>
              {/* Single Search Field */}
              <div className="flex gap-2 mb-2 md:mb-3 relative z-[101]">
                <div className="relative flex-1 z-[102]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by area, building, or landmark..."
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    onFocus={() => {
                      // Always show suggestions on focus so first item can be \"Current location\"
                      setShowSuggestions(true);
                    }}
                    className="pl-10 h-10 text-sm"
                  />
                  
                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto pb-12"
                      style={{ zIndex: 99999, position: 'absolute' }}
                    >
                      {/* First static suggestion: use current location */}
                      <button
                        type="button"
                        onClick={() => {
                          handleDetectLocation();
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-start gap-2 border-b border-border"
                      >
                        <Locate className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            Use current location
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Detect your location and search nearby {activeCategory === "fitness" ? "gyms" : "spaces"}
                          </p>
                        </div>
                        {isLocating && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />
                        )}
                      </button>

                      {/* Google Places suggestions */}
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.place_id || index}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-start gap-2 border-b border-border last:border-b-0"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {suggestion.structured_formatting?.main_text || suggestion.description}
                            </p>
                            {suggestion.structured_formatting?.secondary_text && (
                              <p className="text-xs text-muted-foreground truncate">
                                {suggestion.structured_formatting.secondary_text}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  variant="neon" 
                  size="icon"
                  onClick={handleSearch}
                  className="md:w-auto md:px-4 md:h-10 h-10 w-10 flex-shrink-0"
                >
                  <Search className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden md:inline">Search</span>
                </Button>
                {/* Filters Toggle Button - Right side of Search */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center md:w-auto md:px-4 md:h-10 h-10 w-10 flex-shrink-0"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Filters</span>
                  {showFilters ? (
                    <ChevronUp className="h-3.5 w-3.5 hidden md:block" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 hidden md:block" />
                  )}
                </Button>
              </div>
              {showSuggestions && (
                <div className="h-48 md:h-56" />
              )}

              {/* Advanced Filters - Collapsible (Property filters for space, Fitness filters for fitness) */}
              {showFilters && (
                <div className="space-y-3 border-t border-glass-border pt-3 animate-in slide-in-from-top-2 duration-200">
                {activeCategory === "space" ? (
                <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Property Type */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Property Type</Label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All Types</option>
                      {propertyTypes.length > 0 ? (
                        propertyTypes.map((type) => (
                          <option key={type.id} value={type.name}>
                            {type.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No types available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Bedrooms */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Bedrooms</Label>
                    <select
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">Any</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5+</option>
                    </select>
                  </div>

                  {/* Bathrooms */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Bathrooms</Label>
                    <select
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">Any</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4+</option>
                    </select>
                  </div>

                  {/* Occupant Type */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Occupant Type</Label>
                    <select
                      value={occupantType}
                      onChange={(e) => setOccupantType(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All</option>
                      {occupantTypes.length > 0 ? (
                        occupantTypes.map((type) => (
                          <option key={type.id} value={type.name}>
                            {type.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No types available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Rent Period */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Rent Period</Label>
                    <select
                      value={rentPeriod}
                      onChange={(e) => setRentPeriod(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    disabled={isLoadingFilters}
                    >
                      <option value="">All</option>
                    {rentPeriods.length > 0 ? (
                      rentPeriods.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {isLoadingFilters ? "Loading..." : "No rent periods"}
                      </option>
                    )}
                    </select>
                  </div>

                  {/* Asset Type */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Asset Type</Label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All Types</option>
                      {assetTypes.length > 0 ? (
                        assetTypes.map((type) => (
                          <option key={type.id} value={type.name}>
                            {type.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No types available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Purpose</Label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All</option>
                      {purposes.length > 0 ? (
                        purposes.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No purposes available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Furnishing Status */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Furnishing</Label>
                    <select
                      value={furnishingStatus}
                      onChange={(e) => setFurnishingStatus(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All</option>
                      {furnishingStatuses.length > 0 ? (
                        furnishingStatuses.map((status) => (
                          <option key={status.id} value={status.name}>
                            {status.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No statuses available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Completion Status */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Completion</Label>
                    <select
                      value={completionStatus}
                      onChange={(e) => setCompletionStatus(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All</option>
                      {completionStatuses.length > 0 ? (
                        completionStatuses.map((status) => (
                          <option key={status.id} value={status.name}>
                            {status.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No statuses available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Min Price */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Min Price</Label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Max Price */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Max Price</Label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Min Area */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Min Area (sqm)</Label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minArea}
                      onChange={(e) => setMinArea(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Max Area */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Max Area (sqm)</Label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxArea}
                      onChange={(e) => setMaxArea(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Currency</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">All</option>
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>

                  {/* Ordering/Sorting */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Sort By</Label>
                    <select
                      value={ordering}
                      onChange={(e) => setOrdering(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">Default</option>
                      <option value="price">Price: Low to High</option>
                      <option value="-price">Price: High to Low</option>
                      <option value="created_at">Newest First</option>
                      <option value="-created_at">Oldest First</option>
                      <option value="updated_at">Recently Updated</option>
                      <option value="-updated_at">Least Updated</option>
                      <option value="views_count">Most Viewed</option>
                      <option value="-views_count">Least Viewed</option>
                      <option value="area_sqm">Area: Small to Large</option>
                      <option value="-area_sqm">Area: Large to Small</option>
                    </select>
                  </div>
                </div>

                {/* Amenities - Multi-select */}
                <div className="space-y-2 border-t border-glass-border pt-3">
                  <Label className="text-[10px] text-muted-foreground">Amenities</Label>
                  {isLoadingFilters ? (
                    <div className="text-xs text-muted-foreground py-2">Loading amenities...</div>
                  ) : amenities.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {amenities.map((amenity) => (
                        <label
                          key={amenity.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1.5 rounded text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAmenities.includes(amenity.id)}
                            onChange={() => handleAmenityToggle(amenity.id)}
                            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                            disabled={isLoadingFilters}
                          />
                          <span className="text-[10px] text-foreground truncate">
                            {amenity.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-2">No amenities available</div>
                  )}
                </div>
                </>
                ) : activeCategory === "fitness" ? (
                <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Gym Type */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Gym Type</Label>
                    <select
                      value={gymType}
                      onChange={(e) => setGymType(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                      disabled={isLoadingFilters}
                    >
                      <option value="">All Types</option>
                      {gymTypes.length > 0 ? (
                        gymTypes.map((type) => (
                          <option key={type.id} value={type.name}>
                            {type.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {isLoadingFilters ? "Loading..." : "No types available"}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Gender Allowed */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Gender</Label>
                    <select
                      value={genderAllowed}
                      onChange={(e) => setGenderAllowed(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">All</option>
                      <option value="MALE">Male Only</option>
                      <option value="FEMALE">Female Only</option>
                      <option value="MIXED">Unisex</option>
                    </select>
                  </div>

                  {/* 24 Hours */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Operating Hours</Label>
                    <select
                      value={is24Hours === null ? "" : is24Hours ? "true" : "false"}
                      onChange={(e) => setIs24Hours(e.target.value === "" ? null : e.target.value === "true")}
                      className="flex h-9 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">All</option>
                      <option value="true">24 Hours</option>
                      <option value="false">Specific Hours</option>
                    </select>
                  </div>
                </div>

                {/* Facilities - Multi-select */}
                <div className="space-y-2 border-t border-glass-border pt-3">
                  <Label className="text-[10px] text-muted-foreground">Facilities</Label>
                  {isLoadingFilters ? (
                    <div className="text-xs text-muted-foreground py-2">Loading facilities...</div>
                  ) : facilities.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {facilities.map((facility) => (
                        <label
                          key={facility.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1.5 rounded text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFacilities.includes(facility.id)}
                            onChange={() => {
                              if (selectedFacilities.includes(facility.id)) {
                                setSelectedFacilities(selectedFacilities.filter(id => id !== facility.id));
                              } else {
                                setSelectedFacilities([...selectedFacilities, facility.id]);
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                            disabled={isLoadingFilters}
                          />
                          <span className="text-[10px] text-foreground truncate">
                            {facility.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-2">No facilities available</div>
                  )}
                </div>
                </>
                ) : null}
              </div>
              )}
            </>
          ) : (
            /* Original two-field search for other categories */
          <div className="grid md:grid-cols-[1fr,1fr,auto] gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by area, building, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-12 pr-12"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:text-primary"
                onClick={handleDetectLocation}
                disabled={isLocating}
              >
                <Locate
                  className={`h-4 w-4 ${isLocating ? "animate-spin" : ""
                    }`}
                />
              </Button>
            </div>

              <Button 
                variant="neon" 
                size="lg" 
                onClick={handleSearch}
                className="md:w-auto w-full"
              >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
          )}

          {/* Quick Stats */}
          {(() => {
            const toNumber = (value: string) => Number(String(value).replace(/[^\d.]/g, ""));
            const activeCountValue = toNumber(offerStats.activeCount);
            const pricePerListingValue = toNumber(offerStats.pricePerListing);
            const validityMonthsValue = toNumber(offerStats.validityMonths);
            const cashbackValue = toNumber(offerStats.cashback);
            const hasStats =
              activeCountValue > 0 ||
              pricePerListingValue > 0 ||
              validityMonthsValue > 0 ||
              cashbackValue > 0;

            if (!hasStats) return null;

            return (
              <div className="flex flex-nowrap justify-center gap-2 md:gap-4 mt-2 md:mt-2.5 pt-2 md:pt-2.5 border-t border-glass-border overflow-x-auto scrollbar-hide">
                {activeCountValue > 0 ? (
                  <div className="text-center flex-shrink-0 min-w-[60px] md:min-w-0">
                    <p className="font-display text-sm md:text-lg lg:text-xl font-bold text-primary neon-text whitespace-nowrap">
                      {offerStats.activeCount}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-muted-foreground whitespace-nowrap">Active</p>
                  </div>
                ) : null}
                {pricePerListingValue > 0 ? (
                  <div className="text-center flex-shrink-0 min-w-[60px] md:min-w-0">
                    <p className="font-display text-sm md:text-lg lg:text-xl font-bold text-primary neon-text whitespace-nowrap">
                      {offerStats.pricePerListing} AED
                    </p>
                    <p className="text-[9px] md:text-[10px] text-muted-foreground whitespace-nowrap">Per Listing</p>
                  </div>
                ) : null}
                {validityMonthsValue > 0 ? (
                  <div className="text-center flex-shrink-0 min-w-[60px] md:min-w-0">
                    <p className="font-display text-sm md:text-lg lg:text-xl font-bold text-primary neon-text whitespace-nowrap">
                      {offerStats.validityMonths} Months
                    </p>
                    <p className="text-[9px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                      Validity
                    </p>
                  </div>
                ) : null}
                {cashbackValue > 0 ? (
                  <div className="text-center flex-shrink-0 min-w-[60px] md:min-w-0">
                    <p className="font-display text-sm md:text-lg lg:text-xl font-bold text-primary neon-text whitespace-nowrap">
                      {offerStats.cashback} %
                    </p>
                    <p className="text-[9px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                      Cashback
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })()}
        </div>
      </div>
        <PropertyMarketSnapshot />
    </section>
  );
};

export default HeroSection;
