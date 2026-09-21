import { useState } from "react";
import { Building2, User, Mail, Phone, MapPin, Package, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Seller, SellerStatus } from "@/stores/sellersStore";
import { sellersStore } from "@/stores/sellersStore";
import { SellerProductsModal } from "./SellerProductsModal";

interface SellerCardProps {
  seller: Seller;
}

export const SellerCard = ({ seller }: SellerCardProps) => {
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const listings = sellersStore.getSellerListings(seller.id);

  const getStatusBadge = (status: SellerStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-500/50 bg-gray-500/10">
            Inactive
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">
            Suspended
          </Badge>
        );
    }
  };

  const handleStatusChange = (newStatus: SellerStatus) => {
    if (newStatus === "active") {
      sellersStore.updateSeller(seller.id, { is_active: true });
    } else if (newStatus === "inactive") {
      sellersStore.updateSeller(seller.id, { is_active: false });
    }
  };

  const stats = {
    total: listings.length,
    pending: listings.filter((l) => l.status === "pending").length,
    approved: listings.filter((l) => l.status === "approved").length,
    rejected: listings.filter((l) => l.status === "rejected").length,
  };

  const sellerType = seller.seller_type?.toUpperCase();
  const isCompany = sellerType === "COMPANY";
  const displayName = seller.company_name || seller.full_name || seller.email || "Unknown";

  return (
    <>
      <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-muted/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 border-2 border-primary/30 flex-shrink-0">
              {seller.profile_picture ? (
                <AvatarImage src={seller.profile_picture} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary">
                {isCompany ? (
                  <Building2 className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {displayName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {seller.seller_type_display || seller.seller_type || "Unknown"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {getStatusBadge(seller.is_active ? "active" : "inactive")}
          <span className="text-xs text-muted-foreground">
            Joined: {(() => {
              const date = new Date(seller.date_joined);
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${day}-${month}-${year}`;
            })()}
          </span>
        </div>
      </div>

        {/* Contact Info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground line-clamp-1">{seller.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{seller.mobile_number}</span>
          </div>
          {seller.emirate && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{seller.emirate}</span>
            </div>
          )}
        </div>

        {/* Products Stats */}
        <div className="p-4 border-t border-glass-border bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Products</span>
            </div>
            <span className="text-sm font-bold text-primary">{stats.total}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-yellow-500 font-semibold">{stats.pending}</div>
              <div className="text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-green-500 font-semibold">{stats.approved}</div>
              <div className="text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-red-500 font-semibold">{stats.rejected}</div>
              <div className="text-muted-foreground">Rejected</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-glass-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsProductsModalOpen(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View & Manage Products
          </Button>
        </div>
      </div>

      <SellerProductsModal
        seller={seller}
        isOpen={isProductsModalOpen}
        onOpenChange={setIsProductsModalOpen}
      />
    </>
  );
};

