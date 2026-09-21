import { useState } from "react";
import { Search, Filter, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingCard } from "./ListingCard";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { listingsStore, Listing, ListingStatus } from "@/stores/listingsStore";
import type { TabType } from "../types";

interface ListingsTabProps {
  activeTab: TabType;
  listings: Listing[];
  searchQuery: string;
  categoryFilter: string;
  onSearchChange: (query: string) => void;
  onCategoryFilterChange: (filter: string) => void;
  onReview: (listing: Listing) => void;
}

export const ListingsTab = ({
  activeTab,
  listings,
  searchQuery,
  categoryFilter,
  onSearchChange,
  onCategoryFilterChange,
  onReview,
}: ListingsTabProps) => {
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<{ id: number; title: string } | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange(value);
  };

  const getFilteredListings = (): Listing[] => {
    let filtered = listings;

    // Filter by status
    if (activeTab === "pending") {
      filtered = filtered.filter((l) => l.status === "pending");
    } else if (activeTab === "approved") {
      filtered = filtered.filter((l) => l.status === "approved");
    } else if (activeTab === "rejected") {
      filtered = filtered.filter((l) => l.status === "rejected");
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((l) => l.category === categoryFilter);
    }

    // Search
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.partnerName.toLowerCase().includes(query) ||
          l.location.toLowerCase().includes(query)
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

  const filteredListings = getFilteredListings();

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={searchTerm} onChange={handleSearch} />
        <CategoryFilter value={categoryFilter} onChange={onCategoryFilterChange} />
      </div>

      <ListingsGrid
        listings={filteredListings}
        onReview={onReview}
        onDelete={handleDeleteClick}
      />

      {filteredListings.length === 0 && <EmptyState activeTab={activeTab} />}

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

const SearchInput = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search by title, partner, or location..."
      value={value}
      onChange={onChange}
      className="pl-10 bg-muted/30 border-glass-border"
    />
  </div>
);

const CategoryFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
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
);

const ListingsGrid = ({
  listings,
  onReview,
  onDelete,
}: {
  listings: Listing[];
  onReview: (listing: Listing) => void;
  onDelete: (id: number, title: string) => void;
}) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {listings.map((listing) => (
      <ListingCard
        key={listing.id}
        listing={listing}
        onReview={() => onReview(listing)}
        onDelete={() => onDelete(listing.id, listing.title)}
      />
    ))}
  </div>
);

const EmptyState = ({ activeTab }: { activeTab: TabType }) => (
  <div className="text-center py-16">
    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">No listings found</h3>
    <p className="text-muted-foreground">
      {activeTab === "pending"
        ? "No pending listings to review."
        : "Try adjusting your search or filters."}
    </p>
  </div>
);