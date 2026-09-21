import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Clock, Phone, MessageCircle, Shield, Check, Loader2, Navigation, Instagram, Youtube, Dumbbell, Users, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSidebar from "@/components/AdSidebar";
import AuthModal from "@/components/AuthModal";
import { getPublicGymByIdApi, incrementGymViewsApi, type Gym } from "@/services/admin/fitness";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";

const GymDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  
  const [gym, setGym] = useState<Gym | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const seoTitle = gym?.name ?? "Gym Details";
  const seoDescription =
    gym?.description ??
    "Explore gym facilities, memberships, and contact details on Vionex AI.";

  // Fetch gym by ID when component mounts
  useEffect(() => {
    if (!id) {
      setError("Gym ID is missing");
      setIsLoading(false);
      return;
    }

    const fetchGym = async () => {
      setIsLoading(true);
      setError(null);
      try {


        const gymId = parseInt(id, 10);
        if (isNaN(gymId)) {
          setError("Invalid gym ID");
          setIsLoading(false);
          return;
        }

        const response = await getPublicGymByIdApi(gymId);


        if ('data' in response && 'status' in response) {
          // It's an AxiosResponse
          const responseData = response.data;

          if (responseData?.success && responseData?.data) {

            setGym(responseData.data);
          } else {
            console.error("No gym data in response:", responseData);
            setError(responseData?.message || "Gym not found");
          }
        } else {
          console.error("Unexpected response format:", response);
          setError("Failed to load gym");
        }
      } catch (err) {
        console.error("=== GymDetails: Error Fetching Gym ===");
        console.error("Error:", err);
        setError("Failed to load gym. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGym();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const gymId = Number(id);
    if (Number.isNaN(gymId)) return;
    incrementGymViewsApi(gymId).catch((err) => {
      console.warn("Failed to increment gym views:", err);
    });
  }, [id]);

  // Get images from gym - main image first, then gallery images
  let images: string[] = gym 
    ? [
        ...(gym.main_image ? [gym.main_image] : []),
        ...(gym.gallery_images?.map(img => img.image) || [])
      ].filter(Boolean)
    : [];

  // Ensure we have at least one image
  if (images.length === 0) {
    images = ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"];
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

  // Helper function to get gender label
  const getGenderLabel = (gender: string): string => {
    if (gender === "MIXED") return "Unisex";
    if (gender === "MALE") return "Male";
    if (gender === "FEMALE") return "Female";
    return gender;
  };

  // Format API time (HH:MM:SS) into a readable 12-hour format.
  // Example: "00:00:00" -> "12 AM"
  const formatOperatingTime = (time?: string | null): string => {
    if (!time) return "N/A";

    const [hourRaw = "0", minuteRaw = "0"] = time.split(":");
    const hour24 = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (Number.isNaN(hour24) || Number.isNaN(minute)) return time;

    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;

    if (minute === 0) {
      return `${hour12} ${period}`;
    }

    return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  };

  // WhatsApp handler
  const handleWhatsApp = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    const whatsappNumber = gym?.owner?.whatsapp_number;
    
    if (!whatsappNumber || !gym?.id) {
      console.error("Owner WhatsApp number or gym ID not available");
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
    const message = `Hi, I'm interested in "${gym.name}". Could you please provide more information?`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp immediately
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    setIsContacting(true);
    // Note: There might be a contact API for gyms, but for now we'll just open WhatsApp
    setTimeout(() => {
      setIsContacting(false);
    }, 1000);
  };

  // Phone call handler
  const handlePhoneCall = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!gym?.owner?.phone_number || !gym?.id) {
      console.error("Owner phone number or gym ID not available");
      toast({
        title: "Error",
        description: "Owner information not available",
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = gym.owner.phone_number.replace(/[\s-]/g, '');
    
    // Open phone dialer immediately
    window.location.href = `tel:${phoneNumber}`;

    setIsContacting(true);
    setTimeout(() => {
      setIsContacting(false);
    }, 1000);
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
        <Seo title="Gym Details" description={seoDescription} />
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading gym details...</p>
        </div>
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Seo title="Gym Details" description={seoDescription} />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || "Gym not found"}
          </h1>
          <Button onClick={() => navigate("/")}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  // Get starting price from packages if available
  const getStartingPrice = () => {
    if (gym.packages && gym.packages.length > 0) {
      const prices = gym.packages
        .map(pkg => parseFloat(pkg.price))
        .filter(price => !isNaN(price));
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    return null;
  };

  const startingPrice = getStartingPrice();

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
            <div className="flex gap-4 mb-8">
              {/* Main Image */}
              <div className="relative flex-1 rounded-2xl overflow-hidden">
                <img
                  src={images[currentImageIndex]}
                  alt={gym.name || "Gym image"}
                  className={`w-full h-64 md:h-96 object-cover transition-opacity duration-300 ${
                    isFading ? "opacity-0" : "opacity-100"
                  }`}
                />
              
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-primary/90 text-primary-foreground">
                    {gym.gym_type?.name || gym.gym_type_name || "Gym"}
                  </span>
                </div>

                {/* Price - Show starting price if packages exist */}
                {startingPrice && (
                  <div className="absolute bottom-4 right-4">
                    <div className="glass rounded-xl px-3 py-2 md:px-6 md:py-3">
                      <p className="font-display text-lg md:text-3xl font-bold text-foreground neon-text">
                        {startingPrice.toLocaleString()} <span className="text-xs md:text-lg font-normal text-muted-foreground">AED</span>
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground text-right">Starting from</p>
                    </div>
                  </div>
                )}

                {/* Image counter */}
                <div className="absolute bottom-4 left-4 glass rounded-full px-3 py-1 text-sm text-foreground">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </div>

              {/* Thumbnail Strip - Right Side */}
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2 w-24">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                        index === currentImageIndex
                          ? "ring-2 ring-primary scale-105"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${gym.name} - ${index + 1}`}
                        className="w-full h-16 object-cover"
                      />
                      {index === currentImageIndex && (
                        <div className="absolute inset-0 bg-primary/20" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Thumbnails - Horizontal */}
            {images.length > 1 && (
              <div className="flex md:hidden gap-2 mb-6 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 ${
                      index === currentImageIndex
                        ? "ring-2 ring-primary"
                        : "opacity-60"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${gym.name} - ${index + 1}`}
                      className="w-16 h-12 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Location */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex-1">
                  {gym.name}
                </h1>
                {gym.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-sm">
                      {formatDateAgo(gym.created_at)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="flex items-center gap-2 text-muted-foreground flex-1">
                  <MapPin className="h-5 w-5 text-primary" />
                  {gym.address}
                </p>
                {gym.latitude && gym.longitude && (
                  <Button 
                    variant="neon" 
                    size="sm"
                    className="hidden md:flex items-center gap-2"
                    onClick={() => {
                      const lat = gym.latitude;
                      const lng = gym.longitude;
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

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-4 text-center neon-border">
                <Dumbbell className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-semibold text-foreground">{gym.gym_type?.name || gym.gym_type_name || "N/A"}</p>
              </div>
              <div className="glass rounded-xl p-4 text-center neon-border">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-semibold text-foreground">{getGenderLabel(gym.gender_allowed)}</p>
              </div>
              <div className="glass rounded-xl p-4 text-center neon-border">
                <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="font-semibold text-foreground">
                  {gym.is_24_hours
                    ? "24 Hours"
                    : gym.opening_time && gym.closing_time
                    ? `${formatOperatingTime(gym.opening_time)} - ${formatOperatingTime(gym.closing_time)}`
                    : "N/A"}
                </p>
              </div>
              {gym.facilities && gym.facilities.length > 0 && (
                <div className="glass rounded-xl p-4 text-center neon-border">
                  <Check className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Facilities</p>
                  <p className="font-semibold text-foreground">{gym.facilities.length}</p>
                </div>
              )}
            </div>

            {/* Gym Details */}
            <div className="glass rounded-2xl p-6 mb-8 neon-border">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4">Gym Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gym.gym_type && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Gym Type</span>
                    <span className="font-medium text-foreground">{gym.gym_type.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-glass-border">
                  <span className="text-muted-foreground">Gender Allowed</span>
                  <span className="font-medium text-foreground">{getGenderLabel(gym.gender_allowed)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-glass-border">
                  <span className="text-muted-foreground">Operating Hours</span>
                  <span className="font-medium text-foreground">
                    {gym.is_24_hours 
                      ? "24 Hours" 
                      : gym.opening_time && gym.closing_time
                      ? `${formatOperatingTime(gym.opening_time)} - ${formatOperatingTime(gym.closing_time)}`
                      : "N/A"}
                  </span>
                </div>
                {gym.off_day && gym.off_day.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-glass-border">
                    <span className="text-muted-foreground">Off Days</span>
                    <span className="font-medium text-foreground">{gym.off_day.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Facilities */}
            {gym.facilities && gym.facilities.length > 0 && (
              <div className="glass rounded-2xl p-6 mb-8 neon-border">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Facilities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gym.facilities.map((facility) => {
                    const facilityName = typeof facility === 'object' ? facility.name : String(facility);
                    // Get icon based on facility name
                    const getFacilityIcon = (name: string) => {
                      const lowerName = name.toLowerCase();
                      if (lowerName.includes('cardio') || lowerName.includes('treadmill') || lowerName.includes('running')) {
                        return <Dumbbell className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes('pool') || lowerName.includes('swimming')) {
                        return <Users className="h-5 w-5 text-primary" />;
                      }
                      if (lowerName.includes('yoga') || lowerName.includes('stretching')) {
                        return <Check className="h-5 w-5 text-primary" />;
                      }
                      return <Check className="h-5 w-5 text-primary" />;
                    };

                    return (
                      <div key={typeof facility === 'object' ? facility.id : facility} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          {getFacilityIcon(facilityName)}
                        </div>
                        <span className="text-foreground">{facilityName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Packages */}
            {gym.packages && gym.packages.length > 0 && (
              <div className="glass rounded-2xl p-6 mb-8 neon-border">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Membership Packages</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gym.packages.map((pkg) => (
                    <div key={pkg.id} className="border border-glass-border rounded-xl p-4 hover:border-primary transition-colors">
                      <h3 className="font-semibold text-foreground mb-2">{pkg.title}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-primary">{pkg.price} AED</span>
                        <span className="text-muted-foreground">{pkg.duration}</span>
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {gym.description && (
              <div className="glass rounded-2xl p-6 mb-8 neon-border">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {gym.description}
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
                  <span className="text-foreground">Verified Gym</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">Owner Verified</span>
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

            {/* Social Media */}
            {gym.social_media && (gym.social_media.instagram || gym.social_media.facebook || gym.social_media.youtube) && (
              <div className="glass rounded-2xl p-6 mb-8 neon-border">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Follow Us</h2>
                <div className="flex flex-row gap-2 md:gap-3 flex-wrap">
                  {gym.social_media.instagram && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={() => window.open(gym.social_media?.instagram, '_blank', 'noopener,noreferrer')}
                    >
                      <Instagram className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                      <span className="truncate">Instagram</span>
                    </Button>
                  )}
                  {gym.social_media.facebook && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={() => window.open(gym.social_media?.facebook, '_blank', 'noopener,noreferrer')}
                    >
                      <Facebook className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                      <span className="truncate">Facebook</span>
                    </Button>
                  )}
                  {gym.social_media.youtube && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={() => window.open(gym.social_media?.youtube, '_blank', 'noopener,noreferrer')}
                    >
                      <Youtube className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                      <span className="truncate">YouTube</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Get Directions - Mobile Only */}
            {gym.latitude && gym.longitude && (
              <div className="md:hidden glass rounded-2xl p-6 mb-8 neon-border">
                <Button 
                  variant="neon" 
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    const lat = gym.latitude;
                    const lng = gym.longitude;
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
                  disabled={!gym?.owner?.phone_number || isContacting}
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
                  disabled={!gym?.owner?.whatsapp_number || isContacting}
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

export default GymDetails;

