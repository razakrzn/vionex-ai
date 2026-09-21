
import { Building2, Car, Package, Clock, CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Listing, ListingStatus } from "@/stores/listingsStore";

interface ListingCardProps {
  listing: Listing;
  onReview: () => void;
  onDelete: () => void;
}

export const ListingCard = ({ listing, onReview, onDelete }: ListingCardProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "property":
        return <Building2 className="w-4 h-4" />;
      case "vehicle":
        return <Car className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
    }
  };

  return (
    <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <div className="aspect-video bg-muted relative">
        {listing.photoPreviews.length > 0 ? (
          <img
            src={listing.photoPreviews[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">{getStatusBadge(listing.status)}</div>
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {getCategoryIcon(listing.category)}
            <span className="ml-1 capitalize">{listing.category}</span>
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {listing.location}, {listing.emirate}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Partner: {listing.partnerName}</span>
          <span className="text-xs text-muted-foreground">{listing.createdAt}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onReview}>
            <Eye className="w-4 h-4 mr-1" />
            Review
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};