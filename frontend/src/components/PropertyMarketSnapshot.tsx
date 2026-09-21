import React, { useState, useEffect, useMemo } from "react";
import { ArrowUp, ArrowDown, ExternalLink, Building2, TrendingUp, TrendingDown, LineChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPropertiesApi, type SeekerProperty } from "@/services/seeker/myspace";
import { useNavigate } from "react-router-dom";

interface PropertyMarketData {
  id: number;
  developer: string;
  project: string;
  price: string;
  change: number;
  changePercent: number;
  status: "selling" | "soldout" | "available";
  image?: string;
  profilePhoto?: string;
  sell?: number;
  buy?: number;
  flips?: number;
  type?: "selling" | "buying" | "renting"; // Trading type: selling, buying, renting
  purposeLabel?: string;
}

const fallbackProfilePhoto =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&h=100&fit=crop";

const mapListingStatus = (status?: string): PropertyMarketData["status"] => {
  if (!status) return "available";
  switch (status.toUpperCase()) {
    case "SOLDOUT":
    case "SOLD_OUT":
    case "SOLD":
      return "soldout";
    case "SELLING":
      return "selling";
    default:
      return "available";
  }
};

const formatPrice = (price?: string) => {
  if (!price) return "0";
  const numeric = Number(price);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : price;
};

const mapPurposeToType = (purpose?: string): PropertyMarketData["type"] => {
  if (!purpose) return "selling";
  const normalized = purpose.trim().toLowerCase();
  if (normalized.includes("buy")) return "buying";
  if (normalized.includes("rent")) return "renting";
  if (normalized.includes("sell")) return "selling";
  return "selling";
};

const PropertyMarketSnapshot = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [properties, setProperties] = useState<SeekerProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await getPropertiesApi();
        if ("data" in response && response.data?.data) {
          setProperties(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const marketProperties: PropertyMarketData[] = useMemo(() => {
    return properties.map((property) => ({
      id: property.id,
      developer:
        property.user_full_name ||
        property.title ||
        property.property_type_name ||
        "Property",
      project: property.title ||  property.property_type_name ||property.place || "Unknown",
      price: formatPrice(property.price),
      change: 0,
      changePercent: 0,
      status: mapListingStatus(property.listing_status),
      type: mapPurposeToType(property.purpose_name),
      purposeLabel: property.purpose_name || undefined,
      // Use main image when available, otherwise fall back to profile avatar.
      profilePhoto: property.user_profile_picture || property.main_image || fallbackProfilePhoto,
    }));
  }, [properties]);

  useEffect(() => {
    if (marketProperties.length === 0) return;

    const count = marketProperties.length;
    const intervalMs = count >= 100 ? 1000 : count >= 50 ? 2000 : 3000;

    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % marketProperties.length);
        setTimeout(() => {
          setIsFlipping(false);
        }, 50);
      }, 300);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [marketProperties.length]);

  const currentProperty = marketProperties[currentIndex] || marketProperties[0];
  if (!currentProperty && isLoading) {
    return (
      <section className="pt-1 pb-5 md:py-2 px-0 md:px-4 bg-background dark:bg-gradient-to-b dark:from-background dark:to-background/95 mt-[10px] md:mt-1 relative z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="glass rounded-xl p-4 md:p-6 neon-border">
            <p className="text-sm text-muted-foreground">Loading market snapshot...</p>
          </div>
        </div>
      </section>
    );
  }
  if (!currentProperty) {
    return (
      <section className="pt-1 pb-5 md:py-2 px-0 md:px-4 bg-background dark:bg-gradient-to-b dark:from-background dark:to-background/95 mt-[10px] md:mt-1 relative z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="glass rounded-xl p-4 md:p-6 neon-border">
            <p className="text-sm text-muted-foreground">No properties available right now.</p>
          </div>
        </div>
      </section>
    );
  }
  const isPositive = currentProperty.change >= 0;

  const orderedProperties =
    marketProperties.length > 1
      ? [
          ...marketProperties.slice(currentIndex),
          ...marketProperties.slice(0, currentIndex),
        ]
      : marketProperties;

  const renderCard = (card: { type: string; key: string }) => {
    switch (card.type) {
      case "title":
        return (
          <div key={card.key} className="glass rounded-xl p-3 md:p-5 neon-border flex flex-col justify-center min-w-[200px] md:min-w-0 flex-shrink-0">
            <h2 className="text-base md:text-2xl font-bold text-foreground mb-1 md:mb-2">
              Market Snapshot
            </h2>
            <p className="text-[10px] md:text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              {new Date().toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      case "market-today":
        return (
          <Card
            key={card.key}
            className={`glass rounded-xl p-3 md:p-5 neon-border relative overflow-hidden transition-all duration-300 min-w-[200px] md:min-w-0 flex-shrink-0 ${
              isFlipping ? "animate-flip" : ""
            }`}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <div className="absolute top-2 right-2">
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </div>
            <div className="mb-2 md:mb-3">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Market Today</p>
              <h3 className="text-sm md:text-lg font-bold text-foreground truncate">
                {currentProperty.developer}
              </h3>
            </div>
            <div className="mb-2 md:mb-3">
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {currentProperty.price} AED
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <ArrowUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
              ) : (
                <ArrowDown className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
              )}
              {/* <span
                className={`text-[10px] md:text-sm font-semibold ${
                  isPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                Chg: {isPositive ? "+" : ""}
                {currentProperty.change.toLocaleString()} (
                {isPositive ? "+" : ""}
                {currentProperty.changePercent.toFixed(2)}%)
              </span> */}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2 truncate">
              {currentProperty.project}
            </p>
          </Card>
        );
      case "top-gainers":
        return (
          <Card key={card.key} className="glass rounded-xl p-3 md:p-5 neon-border relative overflow-hidden min-w-[200px] md:min-w-0 flex-shrink-0">
            <div className="absolute top-2 right-2">
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </div>
            <div className="mb-2 md:mb-3">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Top Gainers</p>
              <h3 className="text-sm md:text-lg font-bold text-foreground truncate">
                {topGainer?.developer || "N/A"}
              </h3>
            </div>
            <div className="mb-2 md:mb-3">
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {topGainer?.price || "N/A"} AED
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
              {/* <span className="text-[10px] md:text-sm font-semibold text-green-400">
                Chg: +
                {topGainer?.change.toLocaleString() || "0"} (+{topGainer?.changePercent.toFixed(2) || "0.00"}%) 
              </span> */}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2 truncate">
              {topGainer?.project || "N/A"}
            </p>
          </Card>
        );
      case "status":
        return (
          <Card key={card.key} className="glass rounded-xl p-3 md:p-5 neon-border relative overflow-hidden min-w-[200px] md:min-w-0 flex-shrink-0">
            <div className="absolute top-2 right-2">
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </div>
            <div className="mb-2 md:mb-3">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Status</p>
              <h3 className="text-sm md:text-lg font-bold text-foreground truncate">
                {currentProperty.developer}
              </h3>
            </div>
            <div className="mb-2 md:mb-3">
              {currentProperty.type && (
                <span
                  className={`inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold border ${
                    currentProperty.type === "selling"
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-green-500/10 text-green-400 border-green-500/30"
                  }`}
                >
                  <Building2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  {currentProperty.type === "selling" ? "Selling" : "Buying"}
                </span>
              )}
            </div>
            <div className="mb-1 md:mb-2">
              <p className="text-lg md:text-xl font-bold text-foreground">
                {currentProperty.price} AED
              </p>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">
              {currentProperty.project}
            </p>
          </Card>
        );
      default:
        return null;
    }
  };

  // Get top gainer property
  const topGainer = marketProperties
    .filter((p) => p.change > 0)
    .sort((a, b) => b.changePercent - a.changePercent)[0] || marketProperties[0];

  // Show all properties (no slicing)
  const displayProperties = marketProperties;
  const displayDesktopProperties = orderedProperties.length
    ? [0, 1, 2].map((offset) => orderedProperties[offset % orderedProperties.length])
    : [];
  const handleNavigate = (id: number) => {
    navigate(`/property/${id}`);
  };

  return (
    <section className="pt-1 pb-5 md:py-2 px-0 md:px-4 bg-background dark:bg-gradient-to-b dark:from-background dark:to-background/95 mt-[10px] md:mt-1 relative z-10">
      {/* Mobile: Auto-scroll with manual swipe (show all) */}
      <div className="md:hidden overflow-x-auto w-full pb-2 scrollbar-hide cursor-grab active:cursor-grabbing">
        <div
          className="flex gap-3 w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused]"
        >
          {[...displayProperties, ...displayProperties].map((property, index) => {
            const isPos = property.change >= 0;
            return (
              <div
                key={`${property.developer}-${index}`}
                className="flex-shrink-0 w-auto min-w-[200px] max-w-[90vw] p-2 rounded-lg bg-gradient-to-br from-background/50 to-primary/5 dark:from-background/80 dark:to-primary/10 hover:from-primary/10 hover:to-primary/20 dark:hover:from-primary/15 dark:hover:to-primary/25 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                onClick={() => handleNavigate(property.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleNavigate(property.id);
                  }
                }}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-accent/0 dark:from-primary/0 dark:via-primary/20 dark:to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative z-10 space-y-1.5">
                {/* First Row: Profile, Company Name, Badges */}
                <div className="flex items-center gap-2">
                  <img
                    src={property.profilePhoto || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&h=100&fit=crop"}
                    alt={property.developer}
                    className="w-8 h-8 rounded-full object-cover border-2 border-glass-border flex-shrink-0"
                  />
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {property.developer}
                    </h3>
                    {/* Selling/Buying Badge - Seal mark style */}
                    {property.type && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${
                          property.type === "selling"
                            ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white border-2 border-red-600 dark:border-red-700 shadow-sm dark:shadow-red-500/30"
                            : property.type === "buying"
                              ? "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white border-2 border-green-600 dark:border-green-700 shadow-sm dark:shadow-green-500/30"
                              : "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white border-2 border-blue-600 dark:border-blue-700 shadow-sm dark:shadow-blue-500/30"
                        }`}
                        style={{
                          boxShadow: property.type === "selling" 
                            ? "0 0 8px rgba(220, 38, 38, 0.4), 0 0 0 1px rgba(220, 38, 38, 0.3)" 
                            : property.type === "buying"
                              ? "0 0 8px rgba(34, 197, 94, 0.4), 0 0 0 1px rgba(34, 197, 94, 0.3)"
                              : "0 0 8px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)"
                        }}
                      >
                        {(property.purposeLabel || (property.type === "selling" ? "Sell" : property.type === "buying" ? "Buy" : "Rent")).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Hot Badge - Red badge to indicate hot properties */}
                 
                </div>
                
                {/* Second Row: Project Name */}
                <p className="text-[10px] text-muted-foreground truncate">
                  {property.project}
                </p>
                
                {/* Third Row: Price and Graph */}
                <div className="flex items-baseline gap-1.5">
                  <p className="text-sm font-bold text-foreground">
                    {property.price} AED
                  </p>
                  <div className="flex items-center gap-1">
                    {isPos ? (
                      <svg className="w-4 h-4 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-500 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                        <polyline points="17 18 23 18 23 12" />
                      </svg>
                    )}
                    {/* <span className={`text-[10px] font-bold ${isPos ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {isPos ? "+" : ""}{property.changePercent.toFixed(2)}%
                    </span> */}
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl">
        {/* Desktop: Fixed 3-card row */}
        <div className="hidden md:block relative glass rounded-xl neon-border overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-primary/10 dark:via-background dark:to-accent/10 border-2 border-primary/20 dark:border-primary/30 shadow-lg dark:shadow-neon">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-accent/0 dark:from-primary/0 dark:via-primary/10 dark:to-accent/0 opacity-50 dark:opacity-30 pointer-events-none" />
          <div className="grid grid-cols-3">
            {displayDesktopProperties.map((property, index) => {
              const isPos = property.change >= 0;
              return (
                <React.Fragment key={`${property.id}-${index}`}>
                  <div
                    className={`p-2 md:p-3 transition-all duration-300 border border-primary/20 dark:border-primary/30 bg-gradient-to-br from-background/50 to-primary/5 dark:from-background/80 dark:to-primary/10 hover:from-primary/10 hover:to-primary/20 dark:hover:from-primary/15 dark:hover:to-primary/25 ${isFlipping ? "animate-flip" : ""} relative overflow-hidden group cursor-pointer`}
                    onClick={() => handleNavigate(property.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleNavigate(property.id);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-accent/0 dark:from-primary/0 dark:via-primary/20 dark:to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <div className="space-y-1.5 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          <img
                            src={property.profilePhoto || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&h=100&fit=crop"}
                            alt={property.developer}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-glass-border"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <h3 className="text-xs md:text-sm font-bold text-foreground truncate">
                            {property.developer}
                          </h3>
                          {property.type && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold flex-shrink-0 ${
                                property.type === "selling"
                                  ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white border-2 border-red-600 dark:border-red-700 shadow-sm dark:shadow-red-500/30"
                                  : property.type === "buying"
                                    ? "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white border-2 border-green-600 dark:border-green-700 shadow-sm dark:shadow-green-500/30"
                                    : "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white border-2 border-blue-600 dark:border-blue-700 shadow-sm dark:shadow-blue-500/30"
                              }`}
                              style={{
                                boxShadow: property.type === "selling" 
                                  ? "0 0 8px rgba(220, 38, 38, 0.4), 0 0 0 1px rgba(220, 38, 38, 0.3)" 
                                  : property.type === "buying"
                                    ? "0 0 8px rgba(34, 197, 94, 0.4), 0 0 0 1px rgba(34, 197, 94, 0.3)"
                                    : "0 0 8px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)"
                              }}
                            >
                              {(property.purposeLabel || (property.type === "selling" ? "Sell" : property.type === "buying" ? "Buy" : "Rent")).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                        {property.project}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-base md:text-lg font-bold text-foreground">
                          {property.price} AED
                        </p>
                        <div className="flex items-center gap-1">
                          {isPos ? (
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                              <polyline points="17 6 23 6 23 12" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-red-500 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                              <polyline points="17 18 23 18 23 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertyMarketSnapshot;

