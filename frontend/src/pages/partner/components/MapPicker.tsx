import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Search, Loader2 } from "lucide-react";

// Google Maps API Key from environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface MapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const MapPicker = ({ isOpen, onClose, onSelect, initialLat, initialLng }: MapPickerProps) => {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Default to Dubai, UAE if no initial position
  const defaultCenter: [number, number] = [25.2048, 55.2708];
  const center = selectedPosition || (initialLat && initialLng ? [initialLat, initialLng] : defaultCenter);

  // Load Google Maps script
  useEffect(() => {
    if (!isOpen) return;

    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [isOpen]);

  // Reset map when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up map instance when dialog closes
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        // Remove click listener if it exists
        if (mapInstanceRef.current.clickListener) {
          window.google?.maps?.event?.removeListener(mapInstanceRef.current.clickListener);
        }
        mapInstanceRef.current = null;
      }
    }
  }, [isOpen]);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || !isOpen) return;
    
    // If map already exists, don't recreate it
    if (mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Trigger resize to ensure map renders properly
    setTimeout(() => {
      if (mapInstanceRef.current) {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        mapInstanceRef.current.setCenter({ lat: center[0], lng: center[1] });
      }
    }, 100);

    // Initialize services
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);

    // Add marker if position is selected
    if (selectedPosition) {
      markerRef.current = new window.google.maps.Marker({
        position: { lat: selectedPosition[0], lng: selectedPosition[1] },
        map: map,
        draggable: true,
      });

      // Update position when marker is dragged
      markerRef.current.addListener("dragend", (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const roundedLat = parseFloat(lat.toFixed(8));
        const roundedLng = parseFloat(lng.toFixed(8));
        setSelectedPosition([roundedLat, roundedLng]);
      });
    }

    // Handle map clicks - ensure clicks are captured
    const clickListener = map.addListener("click", (e: any) => {
      if (!e.latLng) return;
      
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const roundedLat = parseFloat(lat.toFixed(8));
      const roundedLng = parseFloat(lng.toFixed(8));
      
      setSelectedPosition([roundedLat, roundedLng]);

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setPosition({ lat: roundedLat, lng: roundedLng });
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: { lat: roundedLat, lng: roundedLng },
          map: map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        markerRef.current.addListener("dragend", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const roundedLat = parseFloat(lat.toFixed(8));
          const roundedLng = parseFloat(lng.toFixed(8));
          setSelectedPosition([roundedLat, roundedLng]);
        });
      }
    });

    // Store listener reference for cleanup
    mapInstanceRef.current.clickListener = clickListener;

  }, [isGoogleMapsLoaded, isOpen, center]);

  // Update map center when position changes (but don't re-initialize map)
  useEffect(() => {
    if (mapInstanceRef.current && selectedPosition) {
      mapInstanceRef.current.setCenter({ lat: selectedPosition[0], lng: selectedPosition[1] });
      if (markerRef.current) {
        markerRef.current.setPosition({ lat: selectedPosition[0], lng: selectedPosition[1] });
      } else if (mapInstanceRef.current) {
        // Create marker if it doesn't exist
        markerRef.current = new window.google.maps.Marker({
          position: { lat: selectedPosition[0], lng: selectedPosition[1] },
          map: mapInstanceRef.current,
          draggable: true,
        });
        markerRef.current.addListener("dragend", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const roundedLat = parseFloat(lat.toFixed(8));
          const roundedLng = parseFloat(lng.toFixed(8));
          setSelectedPosition([roundedLat, roundedLng]);
        });
      }
    }
  }, [selectedPosition]);

  useEffect(() => {
    if (initialLat && initialLng) {
      setSelectedPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  const performSearch = (query: string) => {
    if (!query.trim() || !autocompleteServiceRef.current) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "ae" }, // Restrict to UAE
        },
        (predictions: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions);
            setShowLocationSuggestions(true);
          } else {
            setSearchResults([]);
          }
          setIsSearching(false);
        }
      );
    } catch (error) {
      console.error("Error searching location:", error);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    // Clear previous debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (searchQuery.length >= 2) {
      // Debounce search for better performance
      searchDebounceRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
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

  const handleSelectSearchResult = (place: any) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: place.place_id,
        fields: ["geometry", "formatted_address", "name"],
      },
      (placeDetails: any, status: string) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          const lat = placeDetails.geometry.location.lat();
          const lng = placeDetails.geometry.location.lng();
          const roundedLat = parseFloat(lat.toFixed(8));
          const roundedLng = parseFloat(lng.toFixed(8));
          
          // Set selected position
          setSelectedPosition([roundedLat, roundedLng]);
          setSearchQuery(placeDetails.formatted_address || placeDetails.name || place.description);
    setSearchResults([]);
          setShowLocationSuggestions(false);

          // Navigate map to the selected location with smooth animation
          if (mapInstanceRef.current) {
            // Smooth pan and zoom to the location
            mapInstanceRef.current.panTo({ lat: roundedLat, lng: roundedLng });
            mapInstanceRef.current.setZoom(15); // Zoom in closer when selecting from search
            
            // Update or create marker
            if (markerRef.current) {
              markerRef.current.setPosition({ lat: roundedLat, lng: roundedLng });
            } else {
              markerRef.current = new window.google.maps.Marker({
                position: { lat: roundedLat, lng: roundedLng },
                map: mapInstanceRef.current,
                draggable: true,
              });

              // Add drag listener for new marker
              markerRef.current.addListener("dragend", (e: any) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                const roundedLat = parseFloat(lat.toFixed(8));
                const roundedLng = parseFloat(lng.toFixed(8));
                setSelectedPosition([roundedLat, roundedLng]);
              });
            }
          }
        }
      }
    );
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onSelect(selectedPosition[0], selectedPosition[1]);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Select Location on Map
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Search Bar */}
          <div className="space-y-2 relative">
            <Label htmlFor="location-search">Search for a place</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="location-search"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    // Auto-search as user types (with debounce) - show suggestions dynamically
                    if (value.length >= 1) {
                      // Clear previous debounce
                      if (searchDebounceRef.current) {
                        clearTimeout(searchDebounceRef.current);
                      }
                      // Debounce search - reduced to 200ms for faster response
                      searchDebounceRef.current = setTimeout(() => {
                        if (value.length >= 1) {
                          performSearch(value);
                        }
                      }, 200);
                    } else {
                      setSearchResults([]);
                      setShowLocationSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    // Show suggestions if we have any
                    if (searchResults.length > 0) {
                      setShowLocationSuggestions(true);
                    }
                  }}
                  onBlur={(e) => {
                    // Delay hiding to allow click on suggestion
                    setTimeout(() => {
                      setShowLocationSuggestions(false);
                    }, 300);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type to search locations in UAE..."
                  className="pl-10 bg-muted/30 border-glass-border"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {/* Search Results - Show dynamically as user types */}
                {showLocationSuggestions && searchResults.length > 0 && (
                  <div className="absolute z-[9999] w-full mt-1 border border-glass-border rounded-lg bg-card shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={result.place_id || index}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectSearchResult(result);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectSearchResult(result);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-glass-border last:border-b-0 flex items-start gap-2"
                      >
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{result.description}</p>
                          {result.structured_formatting && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {result.structured_formatting.secondary_text}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Click on the map, drag the marker, or search for a place to select the property location.
          </p>
          
          <div className="w-full h-[500px] rounded-lg overflow-hidden border border-glass-border relative">
            {!isGoogleMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: "500px" }} />
          </div>

          {selectedPosition && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Selected Coordinates:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Latitude: </span>
                  <span className="font-mono">{selectedPosition[0].toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Longitude: </span>
                  <span className="font-mono">{selectedPosition[1].toFixed(6)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-glass-border pt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="neon"
            onClick={handleConfirm}
            disabled={!selectedPosition}
          >
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

