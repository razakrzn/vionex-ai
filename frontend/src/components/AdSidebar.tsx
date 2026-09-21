import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import requestmodel from "@/services/requestmodel";
import base_url from "@/services/base_url";

type AdProperty = {
  id: number;
  company: string;
  companyInitials: string;
  propertyName: string;
  totalUnits?: number | null;
  images: string[];
  logo?: string;
  videoUrl?: string;
  whatsappNumber?: string | null;
};

type ApiAd = {
  id: number;
  title: string;
  brand_name: string;
  logo?: string;
  location: string;
  video_url?: string | null;
  total_units: number;
  available_units: number;
  billing_cycle: string;
  whatsapp_number?: string | null;
  verification_status?: string;
  gallery_images?: Array<{ id: number; image: string }>;
};

// Helper function to get initials from brand name
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Convert API ad to AdProperty
const convertApiAdToProperty = (ad: ApiAd): AdProperty => {
  // Extract gallery images only (exclude logo from carousel)
  const images = ad.gallery_images?.map((img) => 
    typeof img === 'object' ? img.image : img
  ) || [];
  
  return {
    id: ad.id,
    company: ad.brand_name || "",
    companyInitials: ad.brand_name ? getInitials(ad.brand_name) : "",
    propertyName: ad.title || "",
    totalUnits: ad.total_units ?? null,
    images: images.length > 0 ? images : [], // Only gallery images, no logo
    logo: ad.logo, // Logo stored separately
    videoUrl: ad.video_url || undefined,
    whatsappNumber: ad.whatsapp_number ?? null,
  };
};

// Shimmer skeleton component
const ShimmerCard = ({ size = "compact" }: { size?: "compact" | "tall" }) => {
  const isCompact = size === "compact";
  
  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Profile with company name shimmer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 animate-shimmer bg-[length:200%_100%]" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-20 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
          </div>
        </div>
      </div>

      {/* Carousel shimmer */}
      <div className="relative w-full overflow-hidden rounded-md bg-muted/50 dark:bg-muted/30 flex-1 min-h-0">
        <div className={`w-full ${isCompact ? "h-full" : "aspect-[16/9]"} bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 animate-shimmer bg-[length:200%_100%]`} />
      </div>

      {/* Property name shimmer */}
      <div className="mt-0.5">
        <div className="h-4 w-3/4 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
      </div>

      {/* Stats + CTA shimmer */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="flex flex-col flex-1 gap-1">
          <div className="h-2.5 w-12 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
          <div className="h-5 w-8 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
        </div>

        <div className="flex flex-col flex-1 items-center gap-1">
          <div className="h-2.5 w-16 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
          <div className="h-5 w-8 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
        </div>

        <div className="flex justify-end flex-1">
          <div className="h-7 w-20 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/30 dark:via-muted/20 dark:to-muted/30 rounded animate-shimmer bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
};

type AdCardProps = {
  property: AdProperty;
  size?: "compact" | "tall";
};

const AdCard = ({ property, size = "compact" }: AdCardProps) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [displayTotalUnits, setDisplayTotalUnits] = useState(0);

  // Carousel: auto-rotate every 5s with fade transition
  useEffect(() => {
    if (!property.images.length) return;
    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % property.images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [property.images.length]);

  // Simple count-up animation for demo numbers
  useEffect(() => {
    if (!property.totalUnits && property.totalUnits !== 0) {
      setDisplayTotalUnits(0);
      return;
    }
    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let currentStep = 0;
    const totalUnits = Number(property.totalUnits ?? 0);
    const totalIncrement = totalUnits / steps;
    const timer = setInterval(() => {
      currentStep += 1;
      if (currentStep >= steps) {
        setDisplayTotalUnits(totalUnits);
        clearInterval(timer);
        return;
      }
      setDisplayTotalUnits((prev) => Math.min(totalUnits, Math.round(prev + totalIncrement)));
    }, stepTime);

    return () => clearInterval(timer);
  }, [property.totalUnits]);

  

  const isCompact = size === "compact";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Carousel */}
      <div className="relative w-full overflow-hidden rounded-lg bg-background/80 dark:bg-background/40 border border-border/40 dark:border-border/60 flex-1 min-h-0">
        <div
          className={`w-full ${
            isCompact
              ? "h-full min-h-[180px] sm:min-h-[200px] md:min-h-[240px] xl:min-h-[260px]"
              : "aspect-[4/3] min-h-[220px] sm:min-h-[240px] md:min-h-[280px]"
          } relative`}
        >
          {property.videoUrl ? (
            <video
              src={property.videoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            property.images.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt={property.propertyName}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  idx === imageIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))
          )}
        </div>
        {/* Gradient overlay for text readability */}
        {/* Company badge */}
        {(property.logo || property.company) && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/80 dark:bg-background/70 backdrop-blur-sm border border-border/50 shadow-sm">
              {property.logo && (
                <div className="w-7 h-7 rounded-full bg-background/90 dark:bg-background/70 flex items-center justify-center shadow-sm overflow-hidden">
                  <img
                    src={property.logo}
                    alt={property.company || "Company logo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {!property.logo && property.companyInitials && (
                <div className="w-7 h-7 rounded-full bg-background/90 dark:bg-background/70 flex items-center justify-center shadow-sm overflow-hidden">
                  <span className="text-xs font-semibold text-primary">
                    {property.companyInitials}
                  </span>
                </div>
              )}
              {property.company && (
                <span className="text-[11px] md:text-xs font-medium text-foreground line-clamp-1 max-w-[140px]">
                  {property.company}
                </span>
              )}
            </div>
          </div>
        )}
        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3 md:p-4 text-white">
          <div className="space-y-2">
            {property.propertyName && (
              <h3 className="text-sm md:text-base font-semibold line-clamp-2">
                {property.propertyName}
              </h3>
            )}
            <div className="flex items-end justify-between gap-3">
              {property.totalUnits !== null && property.totalUnits !== undefined && (
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] md:text-xs text-white/70">Units</span>
                  <span className="text-sm md:text-base font-semibold tabular-nums">
                    {displayTotalUnits}
                  </span>
                </div>
              )}
              
              <div className="flex justify-end flex-1">
                <Button
                  size="sm"
                  className="text-xs md:text-sm px-3 py-1.5 h-7 whitespace-nowrap bg-white/90 text-black hover:bg-white"
                  onClick={() => {
                    const whatsappNumber =
                      property.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER;
                    if (!whatsappNumber) return;
                    const hasDetails = Boolean(property.propertyName || property.company);
                    const message = encodeURIComponent(
                      hasDetails
                        ? `Hello! I'm interested in ${property.propertyName || "this ad"}${
                            property.company ? ` by ${property.company}` : ""
                          }.`
                        : "Hi, I’m interested in posting an ad on your platform. Could you please share the steps, pricing, and any requirements? Thank you!"
                    );
                    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(
                      /[^0-9]/g,
                      ""
                    )}?text=${message}`;
                    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  Buy now
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Dots */}
        {property.images.length > 1 && !property.videoUrl && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {property.images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`h-1.5 rounded-full transition-all ${
                idx === imageIndex
                  ? "w-3 bg-primary"
                  : "w-2 bg-primary/40 hover:bg-primary/60"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setImageIndex(idx)}
            />
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

const AdSidebar = () => {
  const [ads, setAds] = useState<AdProperty[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch ads on component mount
  useEffect(() => {
    const loadAds = async () => {
      try {
        const url = `${base_url}/ads/`;
        const response = await requestmodel("GET", url, undefined, {});
        const responseData = (response as any)?.data ?? response;
        
        if (responseData?.success && Array.isArray(responseData.data)) {
          const convertedAds = responseData.data
            .filter((ad: ApiAd) => ad.verification_status === "APPROVED")
            .map(convertApiAdToProperty);
          setAds(convertedAds);
        }
      } catch (error) {
        console.error("Error loading ads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAds();
  }, []);

  // Auto-rotate ads every 10 seconds if there are multiple ads
  useEffect(() => {
    if (ads.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [ads.length]);

  // Get current ads to display
  const getCurrentAds = (): AdProperty[] => {
    // For mobile: show 1 ad, rotate if multiple
    // For tablet/desktop: show 2 ads, rotate if more than 2
    if (ads.length === 1) {
      return [ads[0], ads[0]]; // Duplicate for tablet/desktop
    }
    
    const firstAd = ads[currentAdIndex];
    const secondAd = ads[(currentAdIndex + 1) % ads.length];
    return [firstAd, secondAd];
  };

  const [firstAd, secondAd] = getCurrentAds();

  if (isLoading) {
    return (
      <>
        {/* Mobile: shimmer */}
        <div className="block md:hidden w-full p-3 pt-14">
          <div className="w-full min-h-[240px] sm:min-h-[260px] flex flex-col p-4">
            <ShimmerCard size="tall" />
          </div>
        </div>

        {/* Tablet: shimmer */}
      <div className="hidden md:flex lg:hidden w-full gap-3 p-4 pt-20">
        <div className="flex-1 min-h-[220px] md:min-h-[260px] flex items-center justify-center p-4">
            <ShimmerCard size="compact" />
          </div>
        <div className="flex-1 min-h-[220px] md:min-h-[260px] flex items-center justify-center p-4">
            <ShimmerCard size="compact" />
          </div>
        </div>

        {/* Desktop: shimmer */}
        <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-[30%] bg-background/90 dark:bg-background/50 backdrop-blur-none dark:backdrop-blur-sm border-l border-primary/10 dark:border-primary/20 flex-col z-40 pt-10">
          <div className="flex-1 border-b border-primary/10 dark:border-primary/20 p-4 flex items-center justify-center">
            <ShimmerCard size="compact" />
          </div>
          <div className="flex-1 p-4 flex items-center justify-center">
            <ShimmerCard size="compact" />
          </div>
        </aside>
      </>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: 1 Ad at top */}
      <div className="block md:hidden w-full px-3 pt-14 pb-1">
        <div className="w-full min-h-[240px] sm:min-h-[260px] flex flex-col p-4">
          <AdCard property={ads[currentAdIndex]} size="tall" />
        </div>
      </div>

      {/* Tablet: 2 Ads at top horizontally */}
      <div className="hidden md:flex lg:hidden w-full gap-3 p-4 pt-20">
        <div className="flex-1 min-h-[220px] md:min-h-[260px] flex items-center justify-center p-4">
          <AdCard property={firstAd} size="compact" />
        </div>

        <div className="flex-1 min-h-[220px] md:min-h-[260px] flex items-center justify-center p-4">
          <AdCard property={secondAd} size="compact" />
        </div>
      </div>

      {/* Desktop: Fixed 30% sidebar with 2 ads stacked */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-[30%] bg-background/90 dark:bg-background/50 backdrop-blur-none dark:backdrop-blur-sm border-l border-primary/10 dark:border-primary/20 flex-col z-40 pt-20">
        {/* Ad Slot 1 */}
        <div className="flex-1 border-b border-primary/10 dark:border-primary/20 p-4 flex items-center justify-center">
            <AdCard property={firstAd} size="compact" />
        </div>

        {/* Ad Slot 2 */}
        <div className="flex-1 p-4 flex items-center justify-center">
            <AdCard property={secondAd} size="compact" />
        </div>
      </aside>
    </>
  );
};

export default AdSidebar;
