import {
  Bed,
  MapPin,
  Wifi,
  Bath,
  Clock,
  Gauge,
  Box,
  Users,
  Dumbbell,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PropertyCardProps {
  id: number;
  title: string;
  location: string;
  price: number;
  currency?: string;
  rentPeriod?: string;
  type: string;
  beds?: number;
  bathrooms?: number;
  occupantType?: string;
  occupantsCount?: number;
  kmRun?: number;
  usage?: string;
  amenities: string[];
  image: string;
  daysListed: number;
  isHot?: boolean;
  category: "space" | "drive" | "needs" | "fitness"; // <-- updated to include fitness
  distanceKm?: number; // Distance in kilometers from search location
  gymTypeName?: string; // For fitness category
  genderAllowed?: string; // For fitness category
  purposeName?: string; // Purpose name (e.g., "Sell", "Buy", "Rent")
}

const PropertyCard = (props: PropertyCardProps) => {
  const {
    id,
    title,
    location,
    price,
    currency = "AED",
    rentPeriod,
    type,
    beds,
    bathrooms,
    occupantType,
    occupantsCount,
    kmRun,
    usage,
    amenities,
    image,
    daysListed,
    isHot = false,
    category,
    distanceKm,
    gymTypeName,
    genderAllowed,
    purposeName,
  } = props;

  const navigate = useNavigate();

  // Helper function to check if a value should be hidden (0, null, undefined, or "none"/"None"/"NONE")
  const shouldHide = (value: any): boolean => {
    if (value === null || value === undefined || value === 0) return true;
    if (typeof value === 'string' && value.toLowerCase() === 'none') return true;
    return false;
  };

  const handleDetailsClick = () => {
    switch (category) {
      case "space":
        navigate(`/property/${id}`, { state: { item: props } });
        break;
      case "fitness":
        navigate(`/gym/${id}`);
        break;
      case "drive":
        navigate(`/vehicle/${id}`, { state: { item: props } });
        break;
      case "needs":
        navigate(`/needs/${id}`, { state: { item: props } });
        break;
      default:
        navigate(`/item/${id}`, { state: { item: props } });
        break;
    }
  };

  return (
    <div className="group glass rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-glow hover:-translate-y-2 neon-border">
      {/* Image */}
      <div className="relative h-48 overflow-hidden cursor-pointer" onClick={handleDetailsClick}>
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Badges - Hide gym type badge for fitness category */}
        {category !== "fitness" && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20 max-w-[70%]">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/90 text-primary-foreground backdrop-blur-sm max-w-full truncate">
              {type}
            </span>
            {isHot && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-neon-pink/90 text-foreground backdrop-blur-sm max-w-full truncate">
                🔥 Hot
              </span>
            )}
          </div>
        )}
        {category === "fitness" && isHot && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20 max-w-[70%]">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-neon-pink/90 text-foreground backdrop-blur-sm max-w-full truncate">
              🔥 Hot
            </span>
          </div>
        )}

        {/* Purpose Name - Show in top right for space category */}
        {category === "space" && purposeName && (
          <div className="absolute top-3 right-3 z-30 max-w-[30%]">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-background/90 text-primary backdrop-blur-sm max-w-full truncate font-medium border border-primary/20">
              {purposeName}
            </span>
          </div>
        )}

        {/* Price - Hide for fitness category or if price is 0, null, or "none" */}
        {category !== "fitness" && !shouldHide(price) && (
          <div className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] z-20">
            <div className="bg-background/90 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-primary/20 max-w-full">
              <div className="flex items-center gap-1 md:gap-1.5">
                <p className="font-display text-sm md:text-2xl font-bold text-primary neon-text whitespace-nowrap">
                  {price.toLocaleString()}
                </p>
                {rentPeriod && (
                  <span className="text-[10px] md:text-xs text-primary/60 capitalize whitespace-nowrap">
                    / {rentPeriod}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-5">
        {/* Mobile: Simplified Content */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="font-display font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors cursor-pointer flex-1"
              onClick={handleDetailsClick}
            >
              {title}
            </h3>
            {!shouldHide(distanceKm) && (
              <span className="text-primary font-medium text-xs whitespace-nowrap">{distanceKm.toFixed(1)} km</span>
            )}
          </div>
          {category === "fitness" ? (
            <>
              {gymTypeName && !shouldHide(gymTypeName) && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                  <Dumbbell className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="truncate">{gymTypeName}</span>
                </p>
              )}
              <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="truncate">{location}</span>
              </p>
              {genderAllowed && !shouldHide(genderAllowed) && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                  <User className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="truncate">{genderAllowed === "MIXED" ? "Unisex" : genderAllowed}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="truncate">{location}</span>
              </p>
              {/* Days Listed - Below location for space category */}
              {category === "space" && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 text-primary flex-shrink-0" />
                  <span>{daysListed === 0 ? "Today" : daysListed === 1 ? "Yesterday" : `${daysListed} days ago`}</span>
                </p>
              )}
            </>
          )}
          <Button variant="neon" size="sm" className="w-full text-xs h-8" onClick={handleDetailsClick}>
            View
          </Button>
        </div>

        {/* Desktop: Full Content */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3
              className="font-display font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors cursor-pointer flex-1"
              onClick={handleDetailsClick}
            >
              {title}
            </h3>
            {!shouldHide(distanceKm) && (
              <span className="text-primary font-medium text-sm whitespace-nowrap">{distanceKm.toFixed(1)} km</span>
            )}
          </div>

          {category === "fitness" ? (
            <>
              {/* Gym Type */}
              {gymTypeName && !shouldHide(gymTypeName) && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  {gymTypeName}
                </p>
              )}
              {/* Location */}
              <p className="flex items-center gap-1 text-sm text-muted-foreground mb-2 min-w-0">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate" title={location}>{location}</span>
              </p>
              {/* Gender Allowed */}
              {genderAllowed && !shouldHide(genderAllowed) && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <User className="h-4 w-4 text-primary" />
                  {genderAllowed === "MIXED" ? "Unisex" : genderAllowed}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="flex items-center gap-1 text-sm text-muted-foreground mb-2 min-w-0">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate" title={location}>{location}</span>
              </p>
              {/* Days Listed - Below location for space category */}
              {category === "space" && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{daysListed === 0 ? "Today" : daysListed === 1 ? "Yesterday" : `${daysListed} days ago`}</span>
                </p>
              )}
            </>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {category === "space" && (
              <>
                {!shouldHide(beds) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bed className="h-4 w-4 text-primary" />
                    <span>{beds} Bed{beds !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {!shouldHide(bathrooms) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bath className="h-4 w-4 text-primary" />
                    <span>{bathrooms} Bath{bathrooms !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {occupantType && !shouldHide(occupantType) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{occupantType}</span>
                  </div>
                )}
                {!shouldHide(occupantsCount) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{occupantsCount} Occupant{occupantsCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </>
            )}

            {category === "drive" && (
              <>
                {!shouldHide(kmRun) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    <span>{kmRun} KM</span>
                  </div>
                )}
                {usage && !shouldHide(usage) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Box className="h-4 w-4" />
                    <span>{usage}</span>
                  </div>
                )}
              </>
            )}

            {category === "needs" && usage && !shouldHide(usage) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Box className="h-4 w-4" />
                <span>{usage}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDetailsClick}>
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;

