import { useState, useEffect } from "react";
import { Plus, MapPin, Globe, Phone, DollarSign, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSavedCountriesApi, getCountriesFromGooglePlacesApi, addCountriesApi, deleteCountryApi, Country } from "@/services/admin/locations";
import { RefreshCw } from "lucide-react";

export const CountriesTab = () => {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]); // Saved countries from /countries/ for display
  const [googlePlacesCountries, setGooglePlacesCountries] = useState<Country[]>([]); // Countries from Google Places for add modal
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGooglePlaces, setIsLoadingGooglePlaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [selectedCountryToAdd, setSelectedCountryToAdd] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // fetchEmirates function removed - not calling /locations/emirates/ API

  // Fetch saved countries from /countries/ (for displaying cards)
  const fetchSavedCountries = async () => {
    setIsLoading(true);
    try {



      const response = await getSavedCountriesApi();



      if ('data' in response && 'status' in response) {




        if (response.data?.success && response.data?.data) {


          // Log each country
          response.data.data.forEach((country, index) => {

          });
          
          setCountries(response.data.data);
          
          if (response.data.meta) {

          }
        } else {
          console.warn("No countries data in response");
          console.warn("Response data structure:", response.data);
          setCountries([]);
        }
      } else if ('message' in response) {
        console.error("=== Error Response ===");
        console.error("Error message:", response.message);
        console.error("Error response:", (response as any).response);
        console.error("Error data:", (response as any).response?.data);
        toast({
          title: "Error",
          description: "Failed to fetch countries. Please try again.",
          variant: "destructive",
        });
        setCountries([]);
      }


    } catch (error) {
      console.error("=== Error fetching Saved Countries ===");
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("Error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast({
        title: "Error",
        description: "Failed to fetch countries. Please try again.",
        variant: "destructive",
      });
      setCountries([]);
    } finally {
      setIsLoading(false);

    }
  };

  // Fetch countries from Google Places (for add country modal dropdown)
  const fetchGooglePlacesCountries = async () => {
    setIsLoadingGooglePlaces(true);
    try {



      const response = await getCountriesFromGooglePlacesApi();


      if ('data' in response && 'status' in response) {
        if (response.data?.success && response.data?.data) {


          setGooglePlacesCountries(response.data.data);
        } else {
          console.warn("No Google Places countries data in response");
          setGooglePlacesCountries([]);
        }
      } else if ('message' in response) {
        console.error("Error fetching Google Places countries:", response.message);
        setGooglePlacesCountries([]);
      }
    } catch (error) {
      console.error("=== Error fetching Google Places Countries ===");
      console.error("Error:", error);
      setGooglePlacesCountries([]);
    } finally {
      setIsLoadingGooglePlaces(false);
    }
  };

  useEffect(() => {

    // Fetch saved countries from /countries/ (emirates API call removed)
    fetchSavedCountries();
  }, [toast]);

  // Fetch Google Places countries when add modal opens
  useEffect(() => {
    if (isAddCountryModalOpen) {
      fetchGooglePlacesCountries();
    }
  }, [isAddCountryModalOpen]);

  // Filter countries based on search query
  const filteredCountries = searchQuery.trim()
    ? countries.filter(
        (country) =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.phone_code.includes(searchQuery) ||
          country.currency.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countries;

  const handleRefreshCountries = async () => {
    setIsLoading(true);
    await fetchSavedCountries();
  };

  const handleAddCountry = () => {
    setSelectedCountryToAdd("");
    setIsAddCountryModalOpen(true);
  };

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountryToAdd(countryCode);
    // Find the selected country from googlePlacesCountries to auto-fill form
    const country = googlePlacesCountries.find((c) => c.code === countryCode);
    if (country) {

    }
  };

  const handleSaveCountry = async () => {
    if (!selectedCountryToAdd) {
      toast({
        title: "Error",
        description: "Please select a country",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {


      const response = await addCountriesApi([selectedCountryToAdd]);


      if ('data' in response && 'status' in response) {
        if (response.data?.success) {

          // Get the added country data from Google Places countries
          const addedCountry = googlePlacesCountries.find((c) => c.code === selectedCountryToAdd);
          
          if (addedCountry) {
            // Check if the response contains the new country data with ID
            let newCountry: Country | null = null;
            
            // Try to get country from API response
            if (response.data?.data) {
              if (Array.isArray(response.data.data) && response.data.data.length > 0) {
                // Array of countries in response
                newCountry = response.data.data[0] as Country;
              } else if (typeof response.data.data === 'object' && 'id' in response.data.data) {
                // Single country object in response
                newCountry = response.data.data as Country;
              }
            }
            
            // If no country data in response, fetch the updated list silently to get the ID
            if (!newCountry || !newCountry.id) {
              try {
                const refreshResponse = await getSavedCountriesApi();
                if ('data' in refreshResponse && 'status' in refreshResponse) {
                  if (refreshResponse.data?.success && refreshResponse.data?.data) {
                    const updatedCountry = refreshResponse.data.data.find(
                      (c: Country) => c.code === selectedCountryToAdd
                    );
                    if (updatedCountry) {
                      newCountry = updatedCountry;
                    } else {
                      // Fallback: construct from Google Places data
                      newCountry = { ...addedCountry };
                    }
                  }
                }
              } catch (refreshError) {
                console.error("Error fetching updated country:", refreshError);
                // Fallback: construct from Google Places data
                newCountry = { ...addedCountry };
              }
            }
            
            // Add the new country to the state without full page refresh
            if (newCountry) {
              setCountries((prev) => {
                // Check if country already exists (by code or ID)
                const exists = prev.some(
                  (c) => (newCountry.id && c.id === newCountry.id) || c.code === newCountry.code
                );
                if (exists) {
                  // Update existing country instead of adding duplicate
                  return prev.map((c) =>
                    (newCountry.id && c.id === newCountry.id) || c.code === newCountry.code
                      ? newCountry
                      : c
                  );
                }
                return [...prev, newCountry];
              });
            }
          }
          
          toast({
            title: "Success",
            description: response.data.message || "Country added successfully",
          });
          setIsAddCountryModalOpen(false);
          setSelectedCountryToAdd("");
        } else {
          toast({
            title: "Error",
            description: response.data?.message || "Failed to add country",
            variant: "destructive",
          });
        }
      } else if ('message' in response) {
        console.error("Error response:", response.message);
        toast({
          title: "Error",
          description: "Failed to add country. Please try again.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("=== Error adding Country ===");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to add country. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (country: Country) => {
    setCountryToDelete(country);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!countryToDelete || !countryToDelete.id) {
      toast({
        title: "Error",
        description: "Country information is missing",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {



      const response = await deleteCountryApi(countryToDelete.id);


      if ('data' in response && 'status' in response) {
        if (response.data?.success || response.status === 204 || response.status === 200) {

          // Remove the country from state without refetching
          if (countryToDelete.id) {
            setCountries((prev) => prev.filter((c) => c.id !== countryToDelete.id));
          } else if (countryToDelete.code) {
            // Fallback: remove by code if no ID
            setCountries((prev) => prev.filter((c) => c.code !== countryToDelete.code));
          }
          
          toast({
            title: "Success",
            description: response.data?.message || "Country deleted successfully",
          });
          setIsDeleteModalOpen(false);
          setCountryToDelete(null);
        } else {
          toast({
            title: "Error",
            description: response.data?.message || "Failed to delete country",
            variant: "destructive",
          });
        }
      } else if ('message' in response) {
        console.error("Error response:", response.message);
        toast({
          title: "Error",
          description: "Failed to delete country. Please try again.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("=== Error deleting Country ===");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete country. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Countries</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage countries from Google Places
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="neon"
            onClick={handleAddCountry}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Country
          </Button>
          <Button
            variant="outline"
            onClick={handleRefreshCountries}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search countries by name, code, phone code, or currency..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted/30 border-glass-border"
        />
      </div>

      {/* Countries Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <CountryCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? "No countries found" : "No countries found"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query."
              : "Add countries using the 'Add Country' button to see them here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCountries.map((country) => (
            <CountryCard
              key={country.id || country.code}
              country={country}
              onDelete={() => handleDeleteClick(country)}
            />
          ))}
        </div>
      )}

      {/* Add Country Modal */}
      <Dialog open={isAddCountryModalOpen} onOpenChange={setIsAddCountryModalOpen}>
        <DialogContent className="bg-card border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Country</DialogTitle>
            <DialogDescription>
              Select a country from Google Places to add to the database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="countrySelect">Select Country *</Label>
              <Select value={selectedCountryToAdd} onValueChange={handleCountrySelect}>
                <SelectTrigger id="countrySelect" className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Choose a country..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {isLoadingGooglePlaces ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading countries...
                    </div>
                  ) : googlePlacesCountries.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No countries available
                    </div>
                  ) : (
                    googlePlacesCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center gap-2">
                          {country.flag_image_url && (
                            <img
                              src={country.flag_image_url}
                              alt={country.name}
                              className="w-5 h-4 object-cover rounded"
                            />
                          )}
                          <span>{country.name}</span>
                          <span className="text-xs text-muted-foreground">({country.code})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedCountryToAdd && (
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-glass-border">
                {(() => {
                  const selectedCountryData = googlePlacesCountries.find(
                    (c) => c.code === selectedCountryToAdd
                  );
                  if (!selectedCountryData) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <span className="text-sm font-medium text-foreground">
                          {selectedCountryData.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Code:</span>
                        <span className="text-sm font-medium text-foreground">
                          {selectedCountryData.code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Phone Code:</span>
                        <span className="text-sm font-medium text-foreground">
                          {selectedCountryData.phone_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Currency:</span>
                        <span className="text-sm font-medium text-foreground">
                          {selectedCountryData.currency}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCountryModalOpen(false);
                setSelectedCountryToAdd("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              onClick={handleSaveCountry}
              disabled={isSubmitting || !selectedCountryToAdd}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Country"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-card border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Country</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{countryToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCountryToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

interface CountryCardProps {
  country: Country;
  onDelete: () => void;
}

const CountryCard = ({ country, onDelete }: CountryCardProps) => {
  return (
    <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-muted/20">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {country.flag_image_url ? (
                <img
                  src={country.flag_image_url}
                  alt={country.name}
                  className="w-12 h-12 rounded-lg object-cover border border-glass-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">{country.name}</h3>
                <p className="text-xs text-muted-foreground">{country.code}</p>
              </div>
            </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Phone:</span>
          <span className="text-foreground font-medium">{country.phone_code}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Currency:</span>
          <span className="text-foreground font-medium">{country.currency}</span>
        </div>
        
        {/* Delete Button */}
        <div className="pt-3 border-t border-glass-border">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
};

const CountryCardSkeleton = () => (
  <div className="bg-card border border-glass-border rounded-xl overflow-hidden animate-pulse">
    <div className="p-4 border-b border-glass-border bg-muted/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-muted rounded-lg" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="pt-3 border-t border-glass-border">
        <div className="h-4 bg-muted rounded w-20 mb-2" />
        <div className="h-6 bg-muted rounded w-full" />
      </div>
    </div>
  </div>
);

