import { useState, useEffect } from "react";
import { Search, Filter, Building2, User, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SellerCard } from "./SellerCard";
import { Seller, SellerType, SellerStatus, SellerApprovalStatus } from "@/stores/sellersStore";
import { getAdminUsersApi } from "@/services/admin/users";
import { useToast } from "@/hooks/use-toast";

export const SellersTab = () => {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    // Fetch sellers from backend
    const fetchSellers = async () => {
      setIsLoading(true);
      try {

        const response = await getAdminUsersApi("owner");


        if ('data' in response && 'status' in response) {
          // It's an AxiosResponse



          if (response.data?.data && Array.isArray(response.data.data)) {

            // Map API response to Seller format
            const mappedSellers: Seller[] = response.data.data.map((user: any) => {
              // Map verification_status to approvalStatus
              let approvalStatus: SellerApprovalStatus = "pending";
              if (user.verification_status === "approved") {
                approvalStatus = "approved";
              } else if (user.verification_status === "rejected") {
                approvalStatus = "rejected";
              } else {
                approvalStatus = "pending";
              }
              
              return {
                id: user.id,
                email: user.email,
                role: user.role,
                role_display: user.role_display,
                mobile_number: user.mobile_number,
                full_name: user.full_name,
                address: user.address || null,
                seller_type: user.seller_type,
                seller_type_display: user.seller_type_display,
                company_name: user.company_name,
                license_number: user.license_number,
                emirates_id_number: user.emirates_id_number,
                emirate: user.emirate_name || user.emirate || null,
                is_mobile_verified: user.is_mobile_verified,
                profile_picture: user.profile_picture,
                document_uploads: user.document_uploads,
                is_active: user.is_active,
                date_joined: user.date_joined,
                approvalStatus: approvalStatus,
              };
            });

            setSellers(mappedSellers);
          } else {
            console.warn("No sellers data in response");
            setSellers([]);
          }
        } else if ('message' in response) {
          // It's an AxiosError
          console.error("Error response:", response.message);
          console.error("Error data:", (response as any).response?.data);
          toast({
            title: "Error",
            description: "Failed to fetch sellers. Please try again.",
            variant: "destructive",
          });
          setSellers([]);
        }

      } catch (error) {
        console.error("=== Error fetching Sellers (Sellers Tab) ===");
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sellers. Please try again.",
          variant: "destructive",
        });
        setSellers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSellers();
  }, [toast]);

  const getFilteredSellers = (): Seller[] => {
    let filtered = sellers;

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => {
        const sellerType = s.seller_type?.toUpperCase();
        if (typeFilter === "company") return sellerType === "COMPANY";
        if (typeFilter === "individual") return sellerType === "INDIVIDUAL";
        if (typeFilter === "agent") return sellerType === "AGENT";
        return false;
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => {
        if (statusFilter === "active") return s.is_active;
        if (statusFilter === "inactive") return !s.is_active;
        return false;
      });
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.full_name?.toLowerCase().includes(query)) ||
          s.email.toLowerCase().includes(query) ||
          s.mobile_number.toLowerCase().includes(query) ||
          s.company_name?.toLowerCase().includes(query) ||
          s.emirate?.toLowerCase().includes(query) ||
          s.emirates_id_number?.toLowerCase().includes(query) ||
          s.license_number?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredSellers = getFilteredSellers();

  const stats = {
    total: sellers.length,
    companies: sellers.filter((s) => s.seller_type?.toUpperCase() === "COMPANY").length,
    individuals: sellers.filter((s) => s.seller_type?.toUpperCase() === "INDIVIDUAL").length,
    active: sellers.filter((s) => s.is_active).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Seller Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage sellers (companies and individuals) who list products
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Sellers" value={stats.total} icon={User} />
        <StatCard label="Companies" value={stats.companies} icon={Building2} />
        <StatCard label="Individuals" value={stats.individuals} icon={User} />
        <StatCard label="Active" value={stats.active} icon={Package} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
        <TypeFilter value={typeFilter} onChange={setTypeFilter} />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Sellers Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <SellerCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <SellersGrid sellers={filteredSellers} />
          {filteredSellers.length === 0 && !isLoading && <EmptyState />}
        </>
      )}

    </div>
  );
};

const StatCard = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
  <div className="bg-card border border-glass-border rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <Icon className="w-8 h-8 text-primary opacity-50" />
    </div>
  </div>
);

const SearchInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search by name, email, phone, or company..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10 bg-muted/30 border-glass-border"
    />
  </div>
);

const TypeFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Filter className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Types</SelectItem>
      <SelectItem value="company">Companies</SelectItem>
      <SelectItem value="individual">Individuals</SelectItem>
      <SelectItem value="agent">Agents</SelectItem>
    </SelectContent>
  </Select>
);

const StatusFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Filter className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Status</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
      <SelectItem value="suspended">Suspended</SelectItem>
    </SelectContent>
  </Select>
);

const SellersGrid = ({ sellers }: { sellers: Seller[] }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {sellers.map((seller) => (
      <SellerCard key={seller.id} seller={seller} />
    ))}
  </div>
);

const SellerCardSkeleton = () => (
  <div className="bg-card border border-glass-border rounded-xl overflow-hidden animate-pulse">
    {/* Header Skeleton */}
    <div className="p-4 border-b border-glass-border bg-muted/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    </div>

    {/* Contact Info Skeleton */}
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded flex-1" />
      </div>
    </div>

    {/* Products Stats Skeleton */}
    <div className="p-4 border-t border-glass-border bg-muted/10">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-muted rounded w-20" />
        <div className="h-4 bg-muted rounded w-8" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
      </div>
    </div>

    {/* Actions Skeleton */}
    <div className="p-4 border-t border-glass-border">
      <div className="h-9 bg-muted rounded w-full" />
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-16">
    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">No sellers found</h3>
    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
  </div>
);

