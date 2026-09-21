import { useState, useEffect } from "react";
import { X, Building2, Car, Package, Eye, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search } from "lucide-react";
import { Seller } from "@/stores/sellersStore";
import { sellersStore } from "@/stores/sellersStore";
import { listingsStore, Listing, ListingStatus } from "@/stores/listingsStore";
import { ReviewModal } from "./ReviewModal";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface SellerProductsModalProps {
  seller: Seller;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SellerProductsModal = ({
  seller,
  isOpen,
  onOpenChange,
}: SellerProductsModalProps) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    const updateListings = () => {
      setListings(sellersStore.getSellerListings(seller.id));
    };
    updateListings();
    return listingsStore.subscribe(updateListings);
  }, [seller.id]);

  const getFilteredListings = (): Listing[] => {
    let filtered = listings;

    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((l) => l.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.location.toLowerCase().includes(query) ||
          l.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const handleDeleteClick = (id: number, title: string) => {
    setListingToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (listingToDelete) {
      listingsStore.deleteListing(listingToDelete.id);
      setListingToDelete(null);
    }
  };

  const openReviewModal = (listing: Listing) => {
    setSelectedListing(listing);
    setIsReviewModalOpen(true);
  };

  const filteredListings = getFilteredListings();

  const stats = {
    total: listings.length,
    pending: listings.filter((l) => l.status === "pending").length,
    approved: listings.filter((l) => l.status === "approved").length,
    rejected: listings.filter((l) => l.status === "rejected").length,
  };

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
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Manage Products</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {seller.company_name || seller.full_name || seller.email || "Unknown"} • {seller.email}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/30 border border-glass-border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-glass-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products List */}
          <div className="space-y-4">
            {filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products found</p>
              </div>
            ) : (
              filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-card border border-glass-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {listing.photoPreviews.length > 0 ? (
                        <img
                          src={listing.photoPreviews[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(listing.category)}
                            <h3 className="font-semibold text-foreground line-clamp-1">
                              {listing.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {listing.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {listing.location}, {listing.emirate}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          {getStatusBadge(listing.status)}
                          <span className="text-lg font-bold text-primary">{listing.price}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReviewModal(listing)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(listing.id, listing.title)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="flex-1" />
                        <span className="text-xs text-muted-foreground self-center">
                          {listing.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReviewModal
        listing={selectedListing}
        isOpen={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
        itemName={listingToDelete?.title}
      />
    </>
  );
};

