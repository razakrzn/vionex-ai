import { useState, useMemo } from "react";
import { Building2, MapPin, Bed, Bath, Users, XCircle, Edit, Loader2, Package, AlertCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartnerProperty } from "@/services/partner/myspace";

interface PartnerRejectedTabProps {
  properties: PartnerProperty[];
  isLoading: boolean;
  onEdit: (propertyId: number) => void;
}

export const PartnerRejectedTab = ({ properties, isLoading, onEdit }: PartnerRejectedTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) {
      return properties;
    }

    const query = searchQuery.toLowerCase().trim();
    return properties.filter((property) => {
      const title = property.title?.toLowerCase() || "";
      const place = property.place?.toLowerCase() || "";
      const propertyType = property.property_type_name?.toLowerCase() || "";
      const price = property.price?.toString() || "";
      const currency = property.currency?.toLowerCase() || "";
      const rejectionNote = property.rejection_note?.toLowerCase() || "";

      return (
        title.includes(query) ||
        place.includes(query) ||
        propertyType.includes(query) ||
        price.includes(query) ||
        currency.includes(query) ||
        rejectionNote.includes(query)
      );
    });
  }, [properties, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading rejected properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by title, location, type, price, rejection note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? `No rejected properties found matching "${searchQuery}"` : "No rejected properties."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {filteredProperties.map((property) => (
          <div
            key={property.id}
            className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
          >
            {/* Image */}
            <div className="relative h-48 bg-muted overflow-hidden">
              {property.main_image ? (
                <img
                  src={property.main_image}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                  <XCircle className="w-3 h-3 mr-1" /> Rejected
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{property.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{property.place || "N/A"}</span>
                </div>
              </div>

              {/* Rejection Note */}
              {property.rejection_note && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-900 dark:text-red-200 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-800 dark:text-red-300">{property.rejection_note}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {property.bedrooms && (
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    <span>{property.bedrooms}</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    <span>{property.bathrooms}</span>
                  </div>
                )}
                {property.occupant_type && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{property.occupant_type.name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                <div>
                  <p className="font-semibold text-primary">
                    {parseFloat(property.price).toLocaleString()} {property.currency || "AED"}
                  </p>
                  {property.rent_period && (
                    <p className="text-xs text-muted-foreground">/{property.rent_period}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(property.id)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

