import { useState, useEffect } from "react";
import { Search, Filter, Building2, User, Mail, Phone, MapPin, FileText, CheckCircle2, XCircle, Clock, Image as ImageIcon, Eye, Download } from "lucide-react";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Seller, SellerType, SellerApprovalStatus } from "@/stores/sellersStore";
import { useToast } from "@/hooks/use-toast";
import { getAdminUsersApi, getUserByIdApi } from "@/services/admin/users";
import { verifySellerApi } from "@/services/admin/sellerReviewing";

export const ReviewSellersTab = () => {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSellerId, setUpdatingSellerId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    sellerId: string | number | null;
    sellerName: string;
    status: SellerApprovalStatus | null;
    rejectionNote: string;
  }>({
    isOpen: false,
    sellerId: null,
    sellerName: "",
    status: null,
    rejectionNote: "",
  });

  useEffect(() => {
    // Fetch sellers from backend
    const fetchSellers = async () => {
      setIsLoading(true);
      try {

        // Fetch both owners and gym_owners
        const [ownersResponse, gymOwnersResponse] = await Promise.all([
          getAdminUsersApi("owner"),
          getAdminUsersApi("gym_owner")
        ]);



        let allUsers: any[] = [];
        
        // Process owners response
        if ('data' in ownersResponse && 'status' in ownersResponse) {
          if (ownersResponse.data?.data && Array.isArray(ownersResponse.data.data)) {
            allUsers = [...allUsers, ...ownersResponse.data.data];
          }
        }
        
        // Process gym_owners response
        if ('data' in gymOwnersResponse && 'status' in gymOwnersResponse) {
          if (gymOwnersResponse.data?.data && Array.isArray(gymOwnersResponse.data.data)) {
            allUsers = [...allUsers, ...gymOwnersResponse.data.data];
          }
        }

        if (allUsers.length > 0) {
          // Map API response to Seller format
          const mappedSellers: Seller[] = allUsers.map((user: any) => {
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

      } catch (error) {
        console.error("=== Error fetching Sellers (Review Sellers Tab) ===");
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

  // Helper function to get seller display name
  const getSellerDisplayName = (seller: Seller): string => {
    return seller.company_name || seller.full_name || seller.email || "Unknown";
  };

  // Helper function to get seller type for filtering
  const getSellerTypeForFilter = (seller: Seller): string => {
    const type = seller.seller_type?.toUpperCase();
    if (type === "COMPANY") return "company";
    if (type === "INDIVIDUAL") return "individual";
    if (type === "AGENT") return "agent";
    return "unknown";
  };

  const getFilteredSellers = (): Seller[] => {
    let filtered = sellers;

    // Filter by role first
    if (roleFilter !== "all") {
      filtered = filtered.filter(
        (s) => (s.role || "").toLowerCase() === roleFilter
      );
    }

    // Filter by type (only when role is owner)
    if (roleFilter === "owner" && typeFilter !== "all") {
      filtered = filtered.filter((s) => getSellerTypeForFilter(s) === typeFilter);
    }

    // Filter by approval status
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => (s.approvalStatus || "pending") === statusFilter);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          getSellerDisplayName(s).toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.mobile_number.toLowerCase().includes(query) ||
          s.company_name?.toLowerCase().includes(query) ||
          s.full_name?.toLowerCase().includes(query) ||
          s.emirate?.toLowerCase().includes(query) ||
          s.emirates_id_number?.toLowerCase().includes(query) ||
          s.license_number?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredSellers = getFilteredSellers();

  const handleApprovalStatusChangeClick = (sellerId: string | number, status: SellerApprovalStatus) => {
    // Get seller name for confirmation message
    const seller = sellers.find((s) => s.id === sellerId);
    const sellerName = seller?.company_name || seller?.full_name || seller?.email || "this seller";
    
    // Open confirmation modal
    setConfirmationModal({
      isOpen: true,
      sellerId: sellerId,
      sellerName: sellerName,
      status: status,
      rejectionNote: "",
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmationModal.sellerId || !confirmationModal.status) {
      return;
    }

    const sellerId = confirmationModal.sellerId;
    const status = confirmationModal.status;
    const rejectionNote = confirmationModal.rejectionNote;
    
    // Validate rejection note is required when rejecting
    if (status === "rejected" && !rejectionNote.trim()) {
      toast({
        title: "Rejection Note Required",
        description: "Please provide a rejection note when rejecting a user.",
        variant: "destructive",
      });
      return;
    }
    
    // Close confirmation modal
    setConfirmationModal({
      isOpen: false,
      sellerId: null,
      sellerName: "",
      status: null,
      rejectionNote: "",
    });
    
    setUpdatingSellerId(sellerId);
    
    try {




      const response = await verifySellerApi(sellerId, status, rejectionNote || undefined);


      if ('data' in response && 'status' in response) {
        // It's an AxiosResponse


        if (response.data?.success) {
          // Update local state
          setSellers((prevSellers) =>
            prevSellers.map((seller) =>
              seller.id === sellerId ? { ...seller, approvalStatus: status } : seller
            )
          );
          
          toast({
            title: "Status Updated",
            description: `Seller status changed to ${status}`,
          });
        } else {
          toast({
            title: "Error",
            description: response.data?.message || "Failed to update seller status",
            variant: "destructive",
          });
        }
      } else if ('message' in response) {
        // It's an AxiosError
        const errorResponse = response as AxiosError;
        console.error("Error response:", errorResponse.message);
        console.error("Error data:", errorResponse.response?.data);
        
        const errorMessage = (errorResponse.response?.data as any)?.message || "Failed to update seller status";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("=== Error verifying seller ===");
      console.error("Error:", error);
      
      toast({
        title: "Error",
        description: "Failed to update seller status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingSellerId(null);
    }
  };

  const getApprovalStatusBadge = (status?: SellerApprovalStatus) => {
    const currentStatus = status || "pending";
    switch (currentStatus) {
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const stats = {
    total: sellers.length,
    pending: sellers.filter((s) => (s.approvalStatus || "pending") === "pending").length,
    approved: sellers.filter((s) => s.approvalStatus === "approved").length,
    rejected: sellers.filter((s) => s.approvalStatus === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review Sellers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve seller registrations with documents and profile information
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Sellers" value={stats.total} icon={User} />
        <StatCard label="Pending Review" value={stats.pending} icon={Clock} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
        <RoleFilter value={roleFilter} onChange={setRoleFilter} />
        {roleFilter === "owner" && (
          <TypeFilter value={typeFilter} onChange={setTypeFilter} />
        )}
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Sellers Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <SellerReviewCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSellers.map((seller) => (
              <SellerReviewCard
                key={seller.id}
                seller={seller}
                onViewDetails={() => {
                  setSelectedSeller(seller);
                  setIsDetailModalOpen(true);
                }}
                onStatusChange={handleApprovalStatusChangeClick}
                getStatusBadge={getApprovalStatusBadge}
                getDisplayName={getSellerDisplayName}
                getSellerType={getSellerTypeForFilter}
                updatingSellerId={updatingSellerId}
              />
            ))}
          </div>
          {filteredSellers.length === 0 && !isLoading && <EmptyState />}
        </>
      )}

      {/* Seller Detail Modal */}
      {selectedSeller && (
        <SellerDetailModal
          seller={selectedSeller}
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          onStatusChange={handleApprovalStatusChangeClick}
          getStatusBadge={getApprovalStatusBadge}
          updatingSellerId={updatingSellerId}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false, sellerId: null, sellerName: "", status: null, rejectionNote: "" })}
        onConfirm={handleConfirmStatusChange}
        sellerName={confirmationModal.sellerName}
        status={confirmationModal.status}
        rejectionNote={confirmationModal.rejectionNote}
        onRejectionNoteChange={(note) => setConfirmationModal({ ...confirmationModal, rejectionNote: note })}
      />
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
      placeholder="Search by name, email, phone, ID, or company..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10 bg-muted/30 border-glass-border"
    />
  </div>
);

const RoleFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
      <Filter className="w-4 h-4 mr-2" />
      <SelectValue placeholder="Role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Roles</SelectItem>
      <SelectItem value="owner">Owner</SelectItem>
      <SelectItem value="gym_owner">Gym Owner</SelectItem>
    </SelectContent>
  </Select>
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
      <SelectItem value="pending">Pending</SelectItem>
      <SelectItem value="approved">Approved</SelectItem>
      <SelectItem value="rejected">Rejected</SelectItem>
    </SelectContent>
  </Select>
);

interface SellerReviewCardProps {
  seller: Seller;
  onViewDetails: () => void;
  onStatusChange: (sellerId: string | number, status: SellerApprovalStatus) => void;
  getStatusBadge: (status?: SellerApprovalStatus) => JSX.Element;
  getDisplayName: (seller: Seller) => string;
  getSellerType: (seller: Seller) => string;
  updatingSellerId: string | number | null;
}

const SellerReviewCard = ({ seller, onViewDetails, onStatusChange, getStatusBadge, getDisplayName, getSellerType, updatingSellerId }: SellerReviewCardProps) => {
  const sellerType = seller.seller_type?.toUpperCase();
  const isCompany = sellerType === "COMPANY";
  
  return (
    <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-muted/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              {seller.profile_picture ? (
                <AvatarImage src={seller.profile_picture} alt={getDisplayName(seller)} />
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
                {getDisplayName(seller)}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">
                {seller.role === "gym_owner" 
                  ? (seller.role_display || "Gym Owner")
                  : (seller.seller_type_display || getSellerType(seller))}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {getStatusBadge(seller.approvalStatus)}
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

      {/* Quick Actions */}
      <div className="p-4 border-t border-glass-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewDetails}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
            onClick={() => onStatusChange(seller.id, "approved")}
            disabled={updatingSellerId === seller.id}
          >
            {updatingSellerId === seller.id ? (
              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10"
            onClick={() => onStatusChange(seller.id, "pending")}
            disabled={updatingSellerId === seller.id}
          >
            {updatingSellerId === seller.id ? (
              <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
            onClick={() => onStatusChange(seller.id, "rejected")}
            disabled={updatingSellerId === seller.id}
          >
            {updatingSellerId === seller.id ? (
              <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface SellerDetailModalProps {
  seller: Seller;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (sellerId: string | number, status: SellerApprovalStatus) => void;
  getStatusBadge: (status?: SellerApprovalStatus) => JSX.Element;
  updatingSellerId: string | number | null;
}

const SellerDetailModal = ({ seller, isOpen, onOpenChange, onStatusChange, getStatusBadge, updatingSellerId }: SellerDetailModalProps) => {
  const { toast } = useToast();
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && seller.id) {
      fetchUserDetails();
    }
  }, [isOpen, seller.id]);

  const fetchUserDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const response = await getUserByIdApi(seller.id);
      
      if (response && "data" in response) {
        const responseData = response.data as any;
        if (responseData.success && responseData.data) {
          setUserDetails(responseData.data);
        } else {
          // Fallback to seller data if API fails
          setUserDetails(null);
        }
      }
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      // Fallback to seller data if API fails
      setUserDetails(null);
      toast({
        title: "Warning",
        description: "Could not fetch detailed user information. Showing available data.",
        variant: "default",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Use fetched user details if available, otherwise fallback to seller data
  const displayData = userDetails || seller;
  
  const documentUrls = Array.isArray(displayData.document_uploads)
    ? displayData.document_uploads
    : displayData.document_uploads
    ? [displayData.document_uploads]
    : [];

  const sellerType = displayData.seller_type?.toUpperCase();
  const isCompany = sellerType === "COMPANY";
  const isAgent = sellerType === "AGENT";
  const displayName = displayData.company_name || displayData.full_name || displayData.email || "Unknown";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              {displayData.profile_picture ? (
                <AvatarImage src={displayData.profile_picture} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary">
                {isCompany ? (
                  <Building2 className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xl font-bold">
                {displayName}
              </div>
              <div className="text-sm text-muted-foreground">
                {displayData.role === "gym_owner" 
                  ? (displayData.role_display || "Gym Owner")
                  : (displayData.seller_type_display || displayData.seller_type || "Unknown")}
              </div>
            </div>
            {getStatusBadge(seller.approvalStatus)}
          </DialogTitle>
          <DialogDescription>
            Review seller information and documents before approval
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading user details...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Profile Picture */}
            {displayData.profile_picture && (
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={displayData.profile_picture}
                    alt="Profile"
                    className="w-32 h-32 rounded-xl object-cover border-2 border-glass-border"
                  />
                  <a
                    href={displayData.profile_picture}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 p-2 bg-primary rounded-full hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4 text-primary-foreground" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Email" value={displayData.email || "N/A"} icon={Mail} />
              <InfoField label="Phone" value={displayData.mobile_number || "N/A"} icon={Phone} />
              {displayData.whatsapp_number && <InfoField label="WhatsApp" value={displayData.whatsapp_number} icon={Phone} />}
              {displayData.state && <InfoField label="State" value={displayData.state} icon={MapPin} />}
              {displayData.city && <InfoField label="City" value={displayData.city} icon={MapPin} />}
              {displayData.country_name && <InfoField label="Country" value={displayData.country_name} icon={MapPin} />}
              {displayData.address && <InfoField label="Address" value={displayData.address} icon={MapPin} />}
              <InfoField label="Mobile Verified" value={displayData.is_mobile_verified ? "Yes" : "No"} />
              <InfoField label="Email Verified" value={displayData.is_email_verified ? "Yes" : "No"} />
              <InfoField label="Status" value={displayData.is_active ? "Active" : "Inactive"} />
              {displayData.is_suspended !== undefined && (
                <InfoField label="Suspended" value={displayData.is_suspended ? "Yes" : "No"} />
              )}
              {displayData.suspension_reason && (
                <InfoField label="Suspension Reason" value={displayData.suspension_reason} />
              )}
              {displayData.suspended_at && (
                <InfoField label="Suspended At" value={new Date(displayData.suspended_at).toLocaleString()} />
              )}
            </div>
          </div>

          {/* Seller Type Specific Information */}
          {isCompany && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Company Name" value={displayData.company_name || "N/A"} />
                <InfoField label="License Number" value={displayData.license_number || "N/A"} />
                {displayData.website_url && (
                  <InfoField label="Website URL" value={
                    <a href={displayData.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {displayData.website_url}
                    </a>
                  } />
                )}
                {displayData.full_name && (
                  <InfoField label="Authorized Person" value={displayData.full_name} />
                )}
                {displayData.emirates_id_number && (
                  <InfoField label="Authorized Person Emirates ID" value={displayData.emirates_id_number} />
                )}
              </div>
            </div>
          )}

          {(sellerType === "INDIVIDUAL" || isAgent || displayData.role === "gym_owner") && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {displayData.role === "gym_owner" ? "Gym Owner Details" : isAgent ? "Agent Details" : "Individual Details"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Full Name" value={displayData.full_name || "N/A"} />
                {displayData.emirates_id_number && (
                  <InfoField label="Emirates ID" value={displayData.emirates_id_number} />
                )}
                {displayData.emirates_id_expiry && (
                  <InfoField label="Emirates ID Expiry" value={displayData.emirates_id_expiry} />
                )}
                {displayData.license_number && (
                  <InfoField label={displayData.role === "gym_owner" ? "License Number" : "License/RERA Number"} value={displayData.license_number} />
                )}
                {isAgent && displayData.company_name && (
                  <InfoField label="Company Name" value={displayData.company_name} />
                )}
                {displayData.role === "gym_owner" && displayData.company_name && (
                  <InfoField label="Company Name" value={displayData.company_name} />
                )}
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Verification Status" value={displayData.verification_status || "N/A"} />
              {displayData.rejection_note && (
                <InfoField label="Rejection Note" value={displayData.rejection_note} />
              )}
              {displayData.referral_code && (
                <InfoField label="Referral Code" value={displayData.referral_code} />
              )}
              <InfoField label="Date Joined" value={displayData.date_joined ? new Date(displayData.date_joined).toLocaleString() : "N/A"} />
              {displayData.last_login && (
                <InfoField label="Last Login" value={new Date(displayData.last_login).toLocaleString()} />
              )}
              {displayData.is_subscribed !== undefined && (
                <InfoField label="Subscribed" value={displayData.is_subscribed ? "Yes" : "No"} />
              )}
              {displayData.about_me && (
                <InfoField label="About Me" value={displayData.about_me} />
              )}
            </div>
          </div>

          {/* Document Uploads */}
          {documentUrls.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Uploaded Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentUrls.map((url, index) => (
                  <div key={index} className="space-y-2">
                    <Label>Document {index + 1}</Label>
                    <div className="relative group">
                      <img
                        src={url}
                        alt={`Document ${index + 1}`}
                        className="w-full h-48 rounded-lg object-cover border-2 border-glass-border cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => window.open(url, "_blank")}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-2 bg-primary rounded-full hover:bg-primary/90 transition-colors"
                      >
                        <Download className="w-4 h-4 text-primary-foreground" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-glass-border">
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                onStatusChange(String(seller.id), "approved");
                onOpenChange(false);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onStatusChange(String(seller.id), "pending");
              }}
            >
              <Clock className="w-4 h-4 mr-2" />
              Set Pending
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onStatusChange(String(seller.id), "rejected");
                onOpenChange(false);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const InfoField = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: any }) => (
  <div className="space-y-1">
    <Label className="text-sm text-muted-foreground">{label}</Label>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      {typeof value === 'string' ? (
        <span className="text-foreground font-medium">{value}</span>
      ) : (
        <span className="text-foreground font-medium">{value}</span>
      )}
    </div>
  </div>
);


const SellerReviewCardSkeleton = () => (
  <div className="bg-card border border-glass-border rounded-xl overflow-hidden animate-pulse">
    {/* Header Skeleton */}
    <div className="p-4 border-b border-glass-border bg-muted/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
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

    {/* Actions Skeleton */}
    <div className="p-4 border-t border-glass-border space-y-2">
      <div className="h-9 bg-muted rounded w-full" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-9 bg-muted rounded" />
        <div className="h-9 bg-muted rounded" />
        <div className="h-9 bg-muted rounded" />
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-16">
    <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">No sellers found</h3>
    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
  </div>
);

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sellerName: string;
  status: SellerApprovalStatus | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, sellerName, status, rejectionNote, onRejectionNoteChange }: ConfirmationModalProps) => {
  const statusLabels: Record<SellerApprovalStatus, { label: string; icon: any; color: string }> = {
    approved: {
      label: "approve",
      icon: CheckCircle2,
      color: "text-green-600",
    },
    rejected: {
      label: "reject",
      icon: XCircle,
      color: "text-red-600",
    },
    pending: {
      label: "set to pending",
      icon: Clock,
      color: "text-yellow-600",
    },
  };

  const statusInfo = status ? statusLabels[status] : null;
  const StatusIcon = statusInfo?.icon || CheckCircle2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusInfo?.color || ""}`} />
            Confirm Status Change
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to {statusInfo?.label || "change status"} for <strong>{sellerName}</strong>?
          </DialogDescription>
        </DialogHeader>
        {status === "rejected" && (
          <div className="space-y-2 pt-4">
            <Label htmlFor="rejection-note" className="text-sm font-medium">
              Rejection Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection-note"
              placeholder="Please provide a reason for rejection..."
              value={rejectionNote}
              onChange={(e) => onRejectionNoteChange(e.target.value)}
              className="min-h-[100px] resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              A rejection note is required when rejecting a user.
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className={`flex-1 ${
              status === "approved"
                ? "bg-green-600 hover:bg-green-700"
                : status === "rejected"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
            onClick={onConfirm}
          >
            <StatusIcon className="w-4 h-4 mr-2" />
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

