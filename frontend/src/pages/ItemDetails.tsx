import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, Bed, MapPin, Users, Wifi, Bath, Clock, Phone, MessageCircle, 
  Shield, Check, Loader2, Droplet, Car, Navigation, Instagram, Youtube,
  X, Home, Building2, Snowflake, Flame, Tv, Radio, Waves, TreePine, 
  Dumbbell, Gamepad2, UtensilsCrossed, Coffee, Wind, Sun, Moon,
  Lock, Key, Bell, Camera, Monitor, Printer, Fan, AirVent, 
  Sofa, Lamp, DoorOpen,
  Baby, Dog, Cat, Bike, Bus, Train, Plane, Ship, Zap, Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import AdSidebar from "@/components/AdSidebar";
import AuthModal from "@/components/AuthModal";
import { getPropertyByIdApi, contactOwnerApi, incrementPropertyViewsApi, type SeekerProperty } from "@/services/seeker/myspace";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const itemFromState = location.state?.item;
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<SeekerProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContacting, setIsContacting] = useState(false);

  // Fetch property by ID when component mounts
  useEffect(() => {
    if (!id) {
      setError("Property ID is missing");
      setIsLoading(false);
      return;
    }

    const fetchProperty = async () => {
      setIsLoading(true);
      setError(null);
      try {


        const response = await getPropertyByIdApi(id);


        if ('data' in response && 'status' in response) {
          // It's an AxiosResponse
          const responseData = response.data;

          if (responseData?.success && responseData?.data) {




            setProperty(responseData.data);
          } else {
            console.error("No property data in response:", responseData);
            setError(responseData?.message || "Property not found");
          }
        } else {
          console.error("Unexpected response format:", response);
          setError("Failed to load property");
        }
      } catch (err) {
        console.error("=== ItemDetails: Error Fetching Property ===");
        console.error("Error:", err);
        setError("Failed to load property. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    incrementPropertyViewsApi(id).catch((err) => {
      console.warn("Failed to increment property views:", err);
    });
  }, [id]);

  // Use property from API if available, otherwise fall back to state
  const item = property || itemFromState;
  const seoTitle = item?.title ?? "Property Details";
  const seoDescription =
    item?.description ??
    "View property details, amenities, and contact the owner on Vionex AI.";

  // Get images from property - main image first, then gallery images
  // Use main_image (new API) or main_image_url (legacy) for main image
  let images: string[] = property 
    ? [
        ...(property.main_image ? [property.main_image] : property.main_image_url ? [property.main_image_url] : []),
        ...(property.gallery_images?.map(img => img.image) || [])
      ].filter(Boolean)
    : item?.images || [
        item?.image,
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
      ].filter(Boolean);
  
  // Ensure we have at least one image
  if (images.length === 0) {
    images = ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"];
  }

  // Helper function to format date
  const formatDateAgo = (dateString: string): string => {
    const createdDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to midnight for accurate day comparison
    const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (createdDateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (createdDateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else {
      const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysDiff} days ago`;
    }
  };

  const hasValue = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0 && value.trim() !== "0";
    if (typeof value === "number") return value !== 0;
    return true;
  };

  // WhatsApp handler
  const handleWhatsApp = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    // Use whatsapp_number from owner (required, no fallback)
    const whatsappNumber = property?.owner?.whatsapp_number;
    
    if (!whatsappNumber || !property?.id) {
      console.error("Owner WhatsApp number or property ID not available");
      toast({
        title: "Error",
        description: "Owner WhatsApp number not available",
        variant: "destructive",
      });
      return;
    }

    // Remove spaces and special characters, keep only numbers and +
    const phoneNumber = whatsappNumber.replace(/[\s-]/g, '');
    
    // Create WhatsApp message
    const message = `Hi, I'm interested in the property "${property.title}" at ${
      property.place || property.address
    }. I found this via Vionex AI. Could you please provide more information?`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp immediately
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // Make API call in background (fire and forget)
    setIsContacting(true);
    contactOwnerApi({
      property_id: property.id,
      contact_method: "whatsapp",
    })
      .then((response) => {


        if ('data' in response && 'status' in response) {
          const responseData = response.data;
          if (!responseData?.success) {
            console.warn("Contact owner API returned non-success:", responseData?.message);
          }
        }
      })
      .catch((err) => {
        console.error("Error contacting owner via API:", err);
        // Don't show error toast as WhatsApp already opened
      })
      .finally(() => {
        setIsContacting(false);
      });
  };

  // Phone call handler
  const handlePhoneCall = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!property?.owner?.phone_number || !property?.id) {
      console.error("Owner phone number or property ID not available");
      toast({
        title: "Error",
        description: "Owner information not available",
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = property.owner.phone_number.replace(/[\s-]/g, '');
    
    // Open phone dialer immediately
    window.location.href = `tel:${phoneNumber}`;

    // Make API call in background (fire and forget)
    setIsContacting(true);
    contactOwnerApi({
      property_id: property.id,
      contact_method: "call",
    })
      .then((response) => {


        if ('data' in response && 'status' in response) {
          const responseData = response.data;
          if (!responseData?.success) {
            console.warn("Contact owner API returned non-success:", responseData?.message);
          }
        }
      })
      .catch((err) => {
        console.error("Error contacting owner via API:", err);
        // Don't show error toast as call already initiated
      })
      .finally(() => {
        setIsContacting(false);
      });
  };

  // Auto-carousel with fade effect
  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        setIsFading(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleThumbnailClick = (index: number) => {
    if (index === currentImageIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
      setIsFading(false);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Seo title="Property Details" description={seoDescription} />
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Seo title="Property Details" description={seoDescription} />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || "Property not found"}
          </h1>
          <Button onClick={() => navigate("/")}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background]">
      <Seo title={seoTitle} description={seoDescription} />
      <Header />

      {/* Mobile & Tablet: Ads at top */}
      <div className="lg:hidden">
        <AdSidebar />
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="w-full lg:w-[70%] min-h-screen">
          <main className="container mx-auto px-4 py-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6 hover:bg-primary/10 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to listings
            </Button>

            {/* Image Gallery with Thumbnails */}
            <div className="mb-8">
              {/* Main Image */}
              <div className="relative rounded-2xl overflow-hidden mb-4">
                <img
                  src={images[currentImageIndex]}
                  alt={property?.title || item?.title || "Property image"}
                  className={`w-full h-64 md:h-96 object-cover transition-opacity duration-300 ${
                    isFading ? "opacity-0" : "opacity-100"
                  }`}
                />
              
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-primary/90 text-primary-foreground">
                    {property?.property_type_name || property?.property_type?.name || item?.type || "Property"}
                  </span>
                  {item?.isHot && (
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-neon-pink/90 text-foreground">
                      🔥 Hot Deal
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="absolute bottom-4 right-4">
                  <div className="glass rounded-xl px-3 py-2 md:px-6 md:py-3">
                    <p className="font-display text-lg md:text-3xl font-bold text-foreground neon-text">
                      {property?.price ? parseFloat(property.price).toLocaleString() : item?.price} <span className="text-xs md:text-lg font-normal text-muted-foreground">{property?.currency || "AED"}{property?.rent_period ? `/${property.rent_period}` : "/mo"}</span>
                    </p>
                  </div>
                </div>

                {/* Image counter */}
                <div className="absolute bottom-4 left-4 glass rounded-full px-3 py-1 text-sm text-foreground">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </div>

              {/* Thumbnails - Horizontal (Mobile & Desktop) */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 ${
                        index === currentImageIndex
                          ? "ring-2 ring-primary"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${item.title} - ${index + 1}`}
                        className="w-16 h-12 md:w-20 md:h-16 object-cover"
                      />
                      {index === currentImageIndex && (
                        <div className="absolute inset-0 bg-primary/20" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Location */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex-1">
                  {property?.title || item?.title}
                </h1>
                {property?.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-sm">
                      {formatDateAgo(property.created_at)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="flex items-center gap-2 text-muted-foreground flex-1">
                  <MapPin className="h-5 w-5 text-primary" />
                  {property?.place || property?.address || item?.location}
                </p>
                <div className="flex items-center gap-2">
                  {/* Social Media Icons - Always shown, navigate only if link exists */}
                  <button
                    className={`p-2 rounded-lg transition-all ${
                      property?.social_media?.instagram
                        ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                        : 'bg-muted/20 text-muted-foreground opacity-50 cursor-default'
                    }`}
                    onClick={() => {
                      if (property?.social_media?.instagram) {
                        window.open(property.social_media.instagram, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!property?.social_media?.instagram}
                  >
                    <Instagram className="h-4 w-4" />
                  </button>
                  <button
                    className={`p-2 rounded-lg transition-all ${
                      property?.social_media?.tiktok
                        ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                        : 'bg-muted/20 text-muted-foreground opacity-50 cursor-default'
                    }`}
                    onClick={() => {
                      if (property?.social_media?.tiktok) {
                        window.open(property.social_media.tiktok, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!property?.social_media?.tiktok}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </button>
                  <button
                    className={`p-2 rounded-lg transition-all ${
                      property?.social_media?.youtube
                        ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                        : 'bg-muted/20 text-muted-foreground opacity-50 cursor-default'
                    }`}
                    onClick={() => {
                      if (property?.social_media?.youtube) {
                        window.open(property.social_media.youtube, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!property?.social_media?.youtube}
                  >
                    <Youtube className="h-4 w-4" />
                  </button>
                  {property?.location_latitude && property?.location_longitude && (
                    <Button 
                      variant="neon" 
                      size="sm"
                      className="hidden md:flex items-center gap-2"
                      onClick={() => {
                        const lat = property.location_latitude;
                        const lng = property.location_longitude;
                        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
              {hasValue(property?.bedrooms) && (
                <div className="glass rounded-xl p-2 md:p-4 text-center neon-border">
                  <Bed className="h-4 w-4 md:h-6 md:w-6 text-primary mx-auto mb-1 md:mb-2" />
                  <p className="text-xs md:text-sm text-muted-foreground">Beds</p>
                  <p className="text-sm md:text-base font-semibold text-foreground">{property.bedrooms}</p>
                </div>
              )}
              {hasValue(property?.bathrooms) && (
                <div className="glass rounded-xl p-2 md:p-4 text-center neon-border">
                  <Bath className="h-4 w-4 md:h-6 md:w-6 text-primary mx-auto mb-1 md:mb-2" />
                  <p className="text-xs md:text-sm text-muted-foreground">Baths</p>
                  <p className="text-sm md:text-base font-semibold text-foreground">{property.bathrooms}</p>
                </div>
              )}
              {property?.property_type?.occupant_count !== undefined && property?.property_type?.occupant_count !== null && (
                <div className="glass rounded-xl p-2 md:p-4 text-center neon-border">
                  <Users className="h-4 w-4 md:h-6 md:w-6 text-primary mx-auto mb-1 md:mb-2" />
                  <p className="text-xs md:text-sm text-muted-foreground">Occupants (as per law)</p>
                  <p className="text-sm md:text-base font-semibold text-foreground">{property.property_type.occupant_count}</p>
                </div>
              )}
              {property?.occupant_type && (
                <div className="glass rounded-xl p-2 md:p-4 text-center neon-border">
                  <Users className="h-4 w-4 md:h-6 md:w-6 text-primary mx-auto mb-1 md:mb-2" />
                  <p className="text-xs md:text-sm text-muted-foreground">Type</p>
                  <p className="text-sm md:text-base font-semibold text-foreground">{property.occupant_type.name}</p>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="glass rounded-2xl p-6 mb-8 neon-border">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property?.property_type && hasValue(property.property_type.name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Property Type</span>
                    <span className="font-medium text-foreground">{property.property_type.name}</span>
                  </div>
                )}
                {property?.purpose && hasValue(property.purpose.name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Purpose</span>
                    <span className="font-medium text-foreground">{property.purpose.name}</span>
                  </div>
                )}
                {property?.furnishing_status && hasValue(property.furnishing_status.name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Furnishing</span>
                    <span className="font-medium text-foreground">{property.furnishing_status.name}</span>
                  </div>
                )}
                {property?.completion_status && hasValue(property.completion_status.name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium text-foreground">{property.completion_status.name}</span>
                  </div>
                )}
                {hasValue(property?.building_name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Building</span>
                    <span className="font-medium text-foreground">{property.building_name}</span>
                  </div>
                )}
                {hasValue(property?.floor_number) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Floor</span>
                    <span className="font-medium text-foreground">{property.floor_number}</span>
                  </div>
                )}
                {hasValue(property?.unit_number) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Unit</span>
                    <span className="font-medium text-foreground">{property.unit_number}</span>
                  </div>
                )}
                {hasValue(property?.rent_period) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Rent Period</span>
                    <span className="font-medium text-foreground capitalize">{property.rent_period}</span>
                  </div>
                )}
                {hasValue(property?.handover_date) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Handover Date</span>
                    <span className="font-medium text-foreground">{new Date(property.handover_date).toLocaleDateString()}</span>
                  </div>
                )}
                {hasValue(property?.developer_name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Developer</span>
                    <span className="font-medium text-foreground">{property.developer_name}</span>
                  </div>
                )}
                {hasValue(property?.project_name) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-medium text-foreground">{property.project_name}</span>
                  </div>
                )}
                {hasValue(property?.nationality) && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Nationality</span>
                    <span className="font-medium text-foreground">{property.nationality}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            {property?.amenities && property.amenities.length > 0 && (
              <div className="glass rounded-2xl p-6 mb-8 neon-border">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity) => {
                    // Check if it's a restriction/negative amenity
                    const isRestriction = (name: string) => {
                      const lowerName = name.toLowerCase();
                      return lowerName.includes('not allowed') || 
                             lowerName.includes('no ') || 
                             lowerName.includes('prohibited') ||
                             lowerName.includes('restricted') ||
                             lowerName.startsWith('no ');
                    };

                    // Get icon based on amenity name
                    const getAmenityIcon = (name: string) => {
                      const lowerName = name.toLowerCase();
                      const isNegative = isRestriction(name);

                      // ----- Dedicated icons for current amenities (admin list) -----
                      // We check these first so they always get a specific icon.
                      if (lowerName.includes("private changing")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <DoorOpen className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("yoga") || lowerName.includes("aerobics")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Dumbbell className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("exclusive rooftop") || lowerName.includes("rooftop lounge")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Building2 className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("bar counter")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Coffee className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("infinity pool")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Waves className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("sunset lounge")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Sun className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("sky gardens")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <TreePine className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("outdoor cinema")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Monitor className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("amphitheatre")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Gamepad2 className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("kids") && lowerName.includes("play")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Gamepad2 className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("indoor & outdoor gym") || lowerName.includes("indoor outdoor gym")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Dumbbell className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("bbq") || lowerName.includes("dining area")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <UtensilsCrossed className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName === "club" || lowerName.includes("clubhouse")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Home className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("pets not allowed")) {
                        return <X className="h-5 w-5 text-destructive" />;
                      }
                      if (lowerName.includes("pets allowed")) {
                        return <Dog className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("24/7 security") || lowerName.includes("24/7 security")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Shield className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("central a/c") || lowerName.includes("central ac")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Snowflake className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("water connection")) {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Droplet className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName === "gym") {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Dumbbell className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes("swimming pool") || lowerName === "swimming pool") {
                        return isNegative
                          ? <X className="h-5 w-5 text-destructive" />
                          : <Waves className="h-5 w-5 text-primary" />;
                      }

                      // ----- Generic icon rules (fallback for any other amenity) -----
                      // Extract the actual amenity name (remove negative words)
                      const cleanName = lowerName
                        .replace(/not allowed/gi, '')
                        .replace(/no /gi, '')
                        .replace(/prohibited/gi, '')
                        .replace(/restricted/gi, '')
                        .trim();
                      
                      // Water & Utilities
                      if (cleanName.includes('dewa') || cleanName.includes('water') || cleanName.includes('utility')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Droplet className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('electric') || cleanName.includes('power')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Zap className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('gas')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Flame className="h-5 w-5 text-primary" />;
                      }
                      
                      // Internet & Connectivity
                      if (cleanName.includes('wifi') || cleanName.includes('wi-fi') || cleanName.includes('internet')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Wifi className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('fiber') || cleanName.includes('etisalat') || cleanName.includes('du')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Radio className="h-5 w-5 text-primary" />;
                      }
                      
                      // Parking & Transportation
                      if (cleanName.includes('parking') || cleanName.includes('car') || cleanName.includes('garage')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Car className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('valet')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Key className="h-5 w-5 text-primary" />;
                      }
                      
                      // Climate Control
                      if (cleanName.includes('ac') || cleanName.includes('air conditioning') || cleanName.includes('cooling')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Snowflake className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('heating') || cleanName.includes('central heating')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Flame className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('fan') || cleanName.includes('ventilation')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Fan className="h-5 w-5 text-primary" />;
                      }
                      
                      // Entertainment
                      if (cleanName.includes('tv') || cleanName.includes('television') || cleanName.includes('cable')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Tv className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('gym') || cleanName.includes('fitness') || cleanName.includes('workout')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Dumbbell className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('pool') || cleanName.includes('swimming')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Waves className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('game') || cleanName.includes('playroom') || cleanName.includes('play area')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Gamepad2 className="h-5 w-5 text-primary" />;
                      }
                      
                      // Kitchen & Dining
                      if (cleanName.includes('kitchen') || cleanName.includes('cooking')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <UtensilsCrossed className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('dining') || cleanName.includes('restaurant')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <UtensilsCrossed className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('coffee') || cleanName.includes('cafe')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Coffee className="h-5 w-5 text-primary" />;
                      }
                      
                      // Security & Safety
                      if (cleanName.includes('security') || cleanName.includes('guard') || cleanName.includes('cctv')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Shield className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('alarm') || cleanName.includes('fire alarm')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Bell className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('safe') || cleanName.includes('lock')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Lock className="h-5 w-5 text-primary" />;
                      }
                      
                      // Outdoor & Nature
                      if (cleanName.includes('garden') || cleanName.includes('balcony') || cleanName.includes('terrace')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <TreePine className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('park') || cleanName.includes('playground')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <TreePine className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('beach') || cleanName.includes('sea view')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Waves className="h-5 w-5 text-primary" />;
                      }
                      
                      // Building Features
                      if (cleanName.includes('concierge') || cleanName.includes('reception')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Building2 className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('maid') || cleanName.includes('housekeeping')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Users className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('storage') || cleanName.includes('store room')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Box className="h-5 w-5 text-primary" />;
                      }
                      if (cleanName.includes('laundry') || cleanName.includes('washing')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Waves className="h-5 w-5 text-primary" />;
                      }
                      
                      // Pets
                      if (cleanName.includes('pet') || cleanName.includes('dog') || cleanName.includes('cat')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Dog className="h-5 w-5 text-primary" />;
                      }
                      
                      // Furniture
                      if (cleanName.includes('furnished') || cleanName.includes('furniture')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Sofa className="h-5 w-5 text-primary" />;
                      }
                      
                      // Views
                      if (cleanName.includes('view') || cleanName.includes('panoramic')) {
                        return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Camera className="h-5 w-5 text-primary" />;
                      }
                      
                      // Default icon - X for restrictions, Check for allowed
                      return isNegative ? <X className="h-5 w-5 text-destructive" /> : <Check className="h-5 w-5 text-primary" />;
                    };

                    const isNegative = isRestriction(amenity.name);
                    const icon = getAmenityIcon(amenity.name);

                    return (
                      <div 
                        key={amenity.id} 
                        className={`flex items-center gap-3 ${
                          isNegative ? 'opacity-90' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isNegative 
                            ? 'bg-destructive/20 border border-destructive/30' 
                            : 'bg-primary/20'
                        }`}>
                          {icon}
                        </div>
                        <span className={`text-foreground ${
                          isNegative ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {amenity.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {property?.description && (
              <div className="glass rounded-2xl p-6 mb-8 neon-border">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}

            {/* Safety Features */}
            <div className="glass rounded-2xl p-6 mb-8 neon-border">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Safety & Verification
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">Verified Property</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">Owner ID Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">24/7 Security</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">CCTV Monitored</span>
                </div>
              </div>
            </div>

            {/* Get Directions - Mobile Only */}
            {property?.location_latitude && property?.location_longitude && (
              <div className="md:hidden glass rounded-2xl p-6 mb-8 neon-border">
                <Button 
                  variant="neon" 
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    const lat = property.location_latitude;
                    const lng = property.location_longitude;
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <Navigation className="h-5 w-5" />
                  Get Directions
                </Button>
              </div>
            )}

            {/* Contact Actions */}
            <div className="glass rounded-2xl p-6 py-4 md:py-6 neon-border sticky bottom-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="neon" 
                  size="lg" 
                  className="flex-1 py-3 md:py-0"
                  onClick={handlePhoneCall}
                  disabled={!property?.owner?.phone_number || isContacting}
                >
                  {isContacting ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Phone className="h-5 w-5 mr-2" />
                  )}
                  Call Owner
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="flex-1 py-3 md:py-0"
                  onClick={handleWhatsApp}
                  disabled={!property?.owner?.whatsapp_number || isContacting}
                >
                  {isContacting ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="h-5 w-5 mr-2" />
                  )}
                  WhatsApp
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>

        {/* Desktop: Fixed Ad Sidebar */}
        <div className="hidden lg:block">
          <AdSidebar />
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

export default ItemDetails;
