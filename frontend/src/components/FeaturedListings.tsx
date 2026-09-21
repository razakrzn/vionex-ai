import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PropertyCard from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { getPropertiesApi, type SeekerProperty } from "@/services/seeker/myspace";
import { getPublicGymsApi, type Gym } from "@/services/admin/fitness";
import { Skeleton } from "@/components/ui/skeleton";
import { log } from "console";

/* ===================== HEADER CONTENT ===================== */

const featuredDataMap = {
  0: {
    badge: "Featured Listings",
    title: "My Space",
    highlight: "Spaces",
    description:
      "Affordable single, family, and camp spaces across UAE.",
  },
  1: {
    badge: "Featured Listings",
    title: "My Fitness",
    highlight: "Gyms",
    description:
      "Discover premium fitness centers and gyms across UAE.",
  },
  2: {
    badge: "Featured Listings",
    title: "My Drive",
    highlight: "Vehicles",
    description:
      "Buy and sell cars, bikes, and vehicles across UAE with verified buyers.",
  },
  3: {
    badge: "Featured Listings",
    title: "My Needs",
    highlight: "Items",
    description:
      "Find electronics, furniture, and daily essentials at the best prices.",
  },
};

/* ===================== LISTINGS ===================== */

const spaceListings = [
  {
    id: 1,
    title: "Executive Single Space in Dubai Marina",
    location: "Dubai Marina, Dubai",
    price: 1200,
    type: "Single Space",
    beds: 1,
    occupants: 3,
    amenities: ["wifi", "bath", "ac"],
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
    daysListed: 5,
    isHot: true,
  },
];

const driveListings = [
  {
    id: 101,
    title: "Toyota Corolla 2020",
    location: "Sharjah, UAE",
    price: 35000,
    type: "Car",
    kmRun: 82000,
    usage: "Personal Use",
    amenities: [],
    image: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=600&q=80",
    daysListed: 4,
    isHot: true,
  },
];

const needsListings = [
  {
    id: 201,
    title: "iPhone 13 Pro – 256GB",
    location: "Abu Dhabi, UAE",
    price: 2800,
    type: "Electronics",
    usage: "Lightly Used",
    amenities: [],
    image: "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=600&q=80",
    daysListed: 2,
    isHot: true,
  },
];

/* ===================== MAP ===================== */

const listingsMap = {
  0: spaceListings,
  1: driveListings,
  2: needsListings,
};

const categoryMap = {
  0: "space",
  1: "fitness",
  2: "drive",
  3: "needs",
};

/* ===================== COMPONENT ===================== */

const FeaturedListings = ({ activeIndex = 0 }) => {
  const navigate = useNavigate();
  const content = featuredDataMap[activeIndex] || featuredDataMap[0];
  const category = categoryMap[activeIndex] || "space";
  
  // State for properties and gyms - always load both
  const [properties, setProperties] = useState<SeekerProperty[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoadingGyms, setIsLoadingGyms] = useState(false);
  
  // Always load both properties and gyms
  useEffect(() => {
    loadProperties();
    loadGyms();
  }, [activeIndex]);
  
  const loadProperties = async () => {
    setIsLoadingProperties(true);
    try {
      // Request a bit more from backend so we still have 6 after filtering by approval
      const response = await getPropertiesApi({ page_size: "6" });
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data?.data ?? response.data;
    

        
        let propertiesArray: SeekerProperty[] = [];
        
        if (Array.isArray(responseData)) {
          propertiesArray = responseData;
        } else if (responseData?.success && Array.isArray(responseData?.data)) {
          propertiesArray = responseData.data;
        }
        
        // Filter only approved properties
        const approvedProperties = propertiesArray.filter(p => p.is_approved === true);
        
        // Limit to 6 featured properties
        setProperties(approvedProperties.slice(0, 6));
      }
    } catch (error) {
    } finally {
      setIsLoadingProperties(false);
    }
  };
  
  const loadGyms = async () => {
    setIsLoadingGyms(true);
    try {
      const response = await getPublicGymsApi();
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data?.data ?? response.data;
        
        let gymsArray: Gym[] = [];
        
        if (Array.isArray(responseData)) {
          gymsArray = responseData;
        } else if (responseData?.success && Array.isArray(responseData?.data)) {
          gymsArray = responseData.data;
        }
        
        // Filter only approved gyms
        const approvedGyms = gymsArray.filter(g => g.is_approved === true);
        
        setGyms(approvedGyms.slice(0, 6)); // Limit to 6 for featured
      }
    } catch (error) {
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
    const mainImage = property.main_image || property.main_image_url ;
    
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
      amenities: [],
      image: mainImage,
      daysListed: daysListed,
      isHot: false,
      category: "space" as const,
      purposeName: purposeName,
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
  
  // Map properties and gyms to card format
  const propertyCards = properties.slice(0, 6).map(mapPropertyToCard);
  const gymCards = gyms.slice(0, 6).map(mapGymToCard);

  // Determine order based on activeIndex
  // activeIndex 0 (My Space): Show 5 properties first, then 6 gyms
  // activeIndex 1 (My Fitness): Show 6 gyms first, then 5 properties
  const firstSection = activeIndex === 0 ? propertyCards : gymCards;
  const secondSection = activeIndex === 0 ? gymCards : propertyCards;
  const firstSectionTitle = activeIndex === 0 ? "My Space" : "My Fitness";
  const secondSectionTitle = activeIndex === 0 ? "My Fitness" : "My Space";
  const firstSectionCategory = activeIndex === 0 ? "space" : "fitness";
  const secondSectionCategory = activeIndex === 0 ? "fitness" : "space";
  const isLoadingFirst = activeIndex === 0 ? isLoadingProperties : isLoadingGyms;
  const isLoadingSecond = activeIndex === 0 ? isLoadingGyms : isLoadingProperties;

  return (
    <section className="pt-4 pb-8 md:py-20 mt-0 md:mt-0 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-72 h-72 bg-neon-blue/5 rounded-full blur-3xl" />
      <div className="container mx-auto px-4 relative z-10">
        {/* First Section Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Featured Listings</span>
          </div>

          <div className="flex flex-row items-center justify-between gap-4 mb-2">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {firstSectionTitle}
            </h2>

            <Button variant="outline" className="flex-shrink-0" onClick={() => navigate(`/listings/${firstSectionCategory}`)}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-muted-foreground mt-2 max-w-xl">
            {activeIndex === 0 
              ? "Affordable single, family, and camp spaces across UAE."
              : "Discover premium fitness centers and gyms across UAE."}
          </p>
        </div>

        {/* First Section Grid */}
        {isLoadingFirst ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-16">
            {[...Array(activeIndex === 0 ? 5 : 6)].map((_, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        ) : firstSection.length === 0 ? (
          <div className="text-center py-12 mb-16">
            <p className="text-muted-foreground">
              {activeIndex === 0 ? "No properties available." : "No gyms available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-16">
            {firstSection.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PropertyCard {...item} category={firstSectionCategory} />
              </div>
            ))}
          </div>
        )}

        {/* Second Section Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Featured Listings</span>
          </div>

          <div className="flex flex-row items-center justify-between gap-4 mb-2">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {secondSectionTitle}
            </h2>

            <Button variant="outline" className="flex-shrink-0" onClick={() => navigate(`/listings/${secondSectionCategory}`)}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-muted-foreground mt-2 max-w-xl">
            {activeIndex === 0 
              ? "Discover premium fitness centers and gyms across UAE."
              : "Affordable single, family, and camp spaces across UAE."}
          </p>
        </div>

        {/* Second Section Grid */}
        {isLoadingSecond ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(activeIndex === 0 ? 6 : 5)].map((_, index) => (
              <PropertyCardSkeleton key={`second-${index}`} />
            ))}
          </div>
        ) : secondSection.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {activeIndex === 0 ? "No gyms available." : "No properties available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {secondSection.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${(firstSection.length + index) * 0.1}s` }}
              >
                <PropertyCard {...item} category={secondSectionCategory} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Shimmer Skeleton Component for Property Cards
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

export default FeaturedListings;
