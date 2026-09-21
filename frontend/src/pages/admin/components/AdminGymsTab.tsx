import { useState, useEffect } from "react";
import { Search, Eye, CheckCircle2, XCircle, Loader2, Dumbbell, MapPin, Clock, Users, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getGymsApi, approveGymApi, rejectGymApi, type Gym } from "@/services/admin/fitness";
import { Card, CardContent } from "@/components/ui/card";

// Helper function to format gender label
const getGenderLabel = (gender: string) => {
  const genderMap: Record<string, string> = {
    MALE: "Male Only",
    FEMALE: "Female Only",
    MIXED: "Mixed",
  };
  return genderMap[gender] || gender;
};

// Helper function to format time
const formatTime = (time: string | null | undefined) => {
  if (!time) return "N/A";
  // Convert HH:MM:SS to HH:MM format
  return time.substring(0, 5);
};

type FilterType = "all" | "pending" | "approved" | "rejected";

export const AdminGymsTab = () => {
  const { toast } = useToast();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [processingGymId, setProcessingGymId] = useState<number | null>(null);

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    setIsLoading(true);
    try {

      const response = await getGymsApi();


      if ('data' in response && 'status' in response) {
        const responseData = response.data;

        // Handle the actual API response structure
        if (responseData?.success && Array.isArray(responseData?.data)) {
          const gymsArray = responseData.data;

          // Map API response to Gym interface
          const mappedGyms: Gym[] = gymsArray.map((gym: any) => ({
            id: gym.id,
            name: gym.name,
            gym_type_name: gym.gym_type_name, // Store as string from API
            gym_type: gym.gym_type_name ? {
              id: 0, // Not provided in response
              name: gym.gym_type_name,
            } : undefined,
            description: gym.description, // May not be in response
            address: gym.address,
            latitude: gym.latitude, // May not be in response
            longitude: gym.longitude, // May not be in response
            opening_time: gym.opening_time,
            closing_time: gym.closing_time,
            is_24_hours: gym.is_24_hours || false,
            off_day: gym.off_day || [],
            gender_allowed: gym.gender_allowed,
            main_image: gym.main_image,
            gallery_images: gym.gallery_images, // May not be in response
            facilities: gym.facilities, // May not be in response
            social_media: gym.social_media, // May not be in response
            owner: gym.owner, // May not be in response
            is_approved: gym.is_approved,
            is_active: gym.is_active,
            rejection_note: gym.rejection_note,
            views_count: gym.views_count, // May not be in response
            created_at: gym.created_at,
            updated_at: gym.updated_at, // May not be in response
          }));
          
          setGyms(mappedGyms);
        } else {
          console.error("Unexpected response structure:", responseData);
          toast({
            title: "Error",
            description: "Unexpected response structure",
            variant: "destructive",
          });
          setGyms([]);
        }
      }
    } catch (error) {
      console.error("Error loading gyms:", error);
      toast({
        title: "Error",
        description: "Failed to load gyms. Please try again.",
        variant: "destructive",
      });
      setGyms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewGym = (gym: Gym) => {
    setSelectedGym(gym);
    setIsDetailModalOpen(true);
  };

  const handleApproveClick = (gym: Gym) => {
    setSelectedGym(gym);
    setPendingAction("approve");
    setIsConfirmationModalOpen(true);
  };

  const handleRejectClick = (gym: Gym) => {
    setSelectedGym(gym);
    setPendingAction("reject");
    setRejectionNote("");
    setIsConfirmationModalOpen(true);
  };

  const handleApprove = async (gym: Gym) => {
    setProcessingGymId(gym.id);
    try {


      const response = await approveGymApi(gym.id);


      if ('data' in response && 'status' in response) {
        const responseData = response.data;

        if ((responseData as any)?.success || response.status === 200) {
          toast({
            title: "Success",
            description: (responseData as any)?.message || "Gym approved successfully",
          });
          
          // Update only the specific gym in the state
          setGyms(prevGyms =>
            prevGyms.map(g =>
              g.id === gym.id
                ? { ...g, is_approved: true }
                : g
            )
          );
          
          // Update selected gym if it's the same one
          if (selectedGym?.id === gym.id) {
            setSelectedGym(prev => prev ? { ...prev, is_approved: true } : null);
          }
          
          // Close modals
          setIsConfirmationModalOpen(false);
          setIsDetailModalOpen(false);
          setSelectedGym(null);
          setPendingAction(null);
          setRejectionNote("");
        } else {
          toast({
            title: "Error",
            description: (responseData as any)?.message || "Failed to approve gym",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to approve gym",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error approving gym:", error);
      toast({
        title: "Error",
        description: "Failed to approve gym",
        variant: "destructive",
      });
    } finally {
      setProcessingGymId(null);
    }
  };

  const handleReject = async (gym: Gym, rejectionNote?: string) => {
    // Validate rejection note is required
    if (!rejectionNote || !rejectionNote.trim()) {
      toast({
        title: "Rejection Note Required",
        description: "Please provide a rejection note when rejecting a gym.",
        variant: "destructive",
      });
      return;
    }

    setProcessingGymId(gym.id);
    try {



      const response = await rejectGymApi(gym.id, rejectionNote);


      if ('data' in response && 'status' in response) {
        const responseData = response.data;

        if ((responseData as any)?.success || response.status === 200) {
          toast({
            title: "Success",
            description: (responseData as any)?.message || "Gym rejected successfully",
          });
          
          // Update only the specific gym in the state
          setGyms(prevGyms =>
            prevGyms.map(g =>
              g.id === gym.id
                ? { ...g, is_approved: false, rejection_note: rejectionNote }
                : g
            )
          );
          
          // Update selected gym if it's the same one
          if (selectedGym?.id === gym.id) {
            setSelectedGym(prev => prev ? { ...prev, is_approved: false, rejection_note: rejectionNote } : null);
          }
          
          // Close modals
          setIsConfirmationModalOpen(false);
          setIsDetailModalOpen(false);
          setSelectedGym(null);
          setPendingAction(null);
          setRejectionNote("");
        } else {
          toast({
            title: "Error",
            description: (responseData as any)?.message || "Failed to reject gym",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to reject gym",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error rejecting gym:", error);
      toast({
        title: "Error",
        description: "Failed to reject gym",
        variant: "destructive",
      });
    } finally {
      setProcessingGymId(null);
    }
  };

  const handleConfirmAction = () => {
    if (!selectedGym) return;

    if (pendingAction === "approve") {
      handleApprove(selectedGym);
    } else {
      handleReject(selectedGym, rejectionNote);
    }
  };

  // Calculate stats
  const stats = {
    total: gyms.length,
    pending: gyms.filter(g => g.is_approved === false && (g.rejection_note === null || g.rejection_note === undefined)).length,
    approved: gyms.filter(g => g.is_approved === true).length,
    rejected: gyms.filter(g => g.is_approved === false && g.rejection_note !== null && g.rejection_note !== undefined).length,
  };

  // Filter gyms based on filter type and search query
  const filteredGyms = gyms.filter((gym) => {
    // Apply filter
    if (filter === "pending" && (gym.is_approved !== false || (gym.rejection_note !== null && gym.rejection_note !== undefined))) return false;
    if (filter === "approved" && gym.is_approved !== true) return false;
    if (filter === "rejected" && (gym.is_approved !== false || gym.rejection_note === null || gym.rejection_note === undefined)) return false;
    
    // Apply search
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = gym.name?.toLowerCase().includes(searchLower) || false;
    const addressMatch = (gym.address || "").toLowerCase().includes(searchLower);
    const gymTypeMatch = (gym.gym_type?.name || gym.gym_type_name || "").toLowerCase().includes(searchLower);
    const ownerMatch = (gym.owner?.name || "").toLowerCase().includes(searchLower);
    
    return nameMatch || addressMatch || gymTypeMatch || ownerMatch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading gyms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gyms</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Dumbbell className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-glass-border">
        <Button
          variant={filter === "all" ? "default" : "ghost"}
          onClick={() => setFilter("all")}
          className="rounded-b-none"
        >
          All ({stats.total})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "ghost"}
          onClick={() => setFilter("pending")}
          className="rounded-b-none"
        >
          Pending ({stats.pending})
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "ghost"}
          onClick={() => setFilter("approved")}
          className="rounded-b-none"
        >
          Approved ({stats.approved})
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "ghost"}
          onClick={() => setFilter("rejected")}
          className="rounded-b-none"
        >
          Rejected ({stats.rejected})
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gyms by name, address, type, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
      </div>

      {/* Gyms Grid */}
      {filteredGyms.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No gyms found matching your search." : "No gyms available."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGyms.map((gym) => (
            <GymCard
              key={gym.id}
              gym={gym}
              onView={() => handleViewGym(gym)}
              onApprove={() => handleApproveClick(gym)}
              onReject={() => handleRejectClick(gym)}
              isProcessing={processingGymId === gym.id}
            />
          ))}
        </div>
      )}

      {/* Gym Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGym?.name}</DialogTitle>
            <DialogDescription>Gym Details</DialogDescription>
          </DialogHeader>
          
          {selectedGym ? (
            <GymDetailContent 
              gym={selectedGym}
              onApprove={() => handleApproveClick(selectedGym)}
              onReject={() => handleRejectClick(selectedGym)}
              isProcessing={processingGymId === selectedGym.id}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmationModalOpen} onOpenChange={setIsConfirmationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === "approve" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Confirm {pendingAction === "approve" ? "Approval" : "Rejection"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {pendingAction} the gym <strong>"{selectedGym?.name}"</strong>?
            </DialogDescription>
          </DialogHeader>
          {pendingAction === "reject" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="rejection-note" className="text-sm font-medium">
                Rejection Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-note"
                placeholder="Please provide a reason for rejection (e.g., Gym information is incomplete. Please provide more details about facilities.)"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="min-h-[100px] resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">
                A rejection note is required when rejecting a gym.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmationModalOpen(false);
                setPendingAction(null);
                setRejectionNote("");
              }}
              disabled={processingGymId !== null}
            >
              Cancel
            </Button>
            <Button
              variant={pendingAction === "approve" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={processingGymId !== null}
              className={pendingAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {processingGymId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {pendingAction === "approve" ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirm {pendingAction === "approve" ? "Approve" : "Reject"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface GymCardProps {
  gym: Gym;
  onView: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

const GymCard = ({ gym, onView, onApprove, onReject, isProcessing = false }: GymCardProps) => {
  const [imageError, setImageError] = useState(false);
  
  const handleImageClick = () => {
    if (gym.main_image) {
      window.open(gym.main_image, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {gym.main_image && !imageError ? (
          <img
            src={gym.main_image}
            alt={gym.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={handleImageClick}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Status Badge - Top Right */}
        <div className="absolute top-3 right-3 z-10">
          {gym.is_approved === true ? (
            <Badge className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Approved
            </Badge>
          ) : gym.is_approved === false && gym.rejection_note !== null && gym.rejection_note !== undefined ? (
            <Badge className="bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
          ) : gym.is_approved === false ? (
            <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-1">
            {gym.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{gym.address}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {(gym.gym_type?.name || gym.gym_type_name) && (
            <div className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{gym.gym_type?.name || gym.gym_type_name}</span>
            </div>
          )}
          {gym.gender_allowed && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{getGenderLabel(gym.gender_allowed)}</span>
            </div>
          )}
        </div>

        {gym.is_24_hours ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>24 Hours</span>
          </div>
        ) : gym.opening_time && gym.closing_time ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTime(gym.opening_time)} - {formatTime(gym.closing_time)}</span>
          </div>
        ) : null}

        {/* Rejection Note */}
        {gym.rejection_note && gym.rejection_note.trim() && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Rejection Note:</p>
                <p className="text-sm text-red-700 dark:text-red-400 line-clamp-2">{gym.rejection_note}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={onView}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          {!gym.is_approved && onApprove && onReject && (
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={onApprove}
                disabled={isProcessing}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={onReject}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
          {gym.is_approved && onReject && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onReject}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface GymDetailContentProps {
  gym: Gym;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

const GymDetailContent = ({ gym, onApprove, onReject, isProcessing = false }: GymDetailContentProps) => {
  return (
    <div className="space-y-6">
      {/* Main Image */}
      {gym.main_image && (
        <div className="relative h-64 rounded-lg overflow-hidden">
          <img
            src={gym.main_image}
            alt={gym.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Gym Name</Label>
          <p className="text-foreground font-semibold">{gym.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Gym Type</Label>
          <p className="text-foreground">{gym.gym_type?.name || gym.gym_type_name || "N/A"}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Address</Label>
          <p className="text-foreground">{gym.address}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Gender Allowed</Label>
          <p className="text-foreground">{getGenderLabel(gym.gender_allowed)}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Operating Hours</Label>
          <p className="text-foreground">
            {gym.is_24_hours 
              ? "24 Hours" 
              : gym.opening_time && gym.closing_time
              ? `${formatTime(gym.opening_time)} - ${formatTime(gym.closing_time)}`
              : "N/A"}
          </p>
        </div>
        {gym.off_day && gym.off_day.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Off Days</Label>
            <p className="text-foreground">{gym.off_day.join(", ")}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {(gym.description && gym.description.trim()) && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
          <p className="text-foreground mt-1">{gym.description}</p>
        </div>
      )}

      {/* Facilities */}
      {gym.facilities && Array.isArray(gym.facilities) && gym.facilities.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Facilities</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {gym.facilities.map((facility, index) => (
              <Badge key={facility.id || index} variant="outline">
                {typeof facility === 'object' ? facility.name : String(facility)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Social Media */}
      {gym.social_media && typeof gym.social_media === 'object' && (gym.social_media.facebook || gym.social_media.instagram) && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Social Media</Label>
          <div className="flex flex-col gap-2 mt-2">
            {gym.social_media.facebook && (
              <a
                href={gym.social_media.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Facebook
              </a>
            )}
            {gym.social_media.instagram && (
              <a
                href={gym.social_media.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Instagram
              </a>
            )}
          </div>
        </div>
      )}

      {/* Owner Info */}
      {gym.owner && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Owner Information</Label>
          <div className="mt-2 space-y-1">
            <p className="text-foreground">Name: {gym.owner.name}</p>
            <p className="text-foreground">Email: {gym.owner.email}</p>
            {gym.owner.phone_number && (
              <p className="text-foreground">Phone: {gym.owner.phone_number}</p>
            )}
          </div>
        </div>
      )}

      {/* Gallery Images */}
      {gym.gallery_images && gym.gallery_images.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Gallery Images</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {gym.gallery_images.map((img) => (
              <div key={img.id} className="relative h-32 rounded-lg overflow-hidden">
                <img
                  src={img.image}
                  alt={`${gym.name} gallery`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => window.open(img.image, '_blank', 'noopener,noreferrer')}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="pt-4 border-t border-glass-border space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-muted-foreground">Status:</Label>
          {gym.is_approved ? (
            <Badge className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Approved
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              Pending Approval
            </Badge>
          )}
        </div>
        {gym.rejection_note && (
          <div>
            <Label className="text-sm font-medium text-destructive">Rejection Note:</Label>
            <p className="text-sm text-destructive mt-1">{gym.rejection_note}</p>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          {!gym.is_approved && onApprove && (
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Gym
                </>
              )}
            </Button>
          )}
          {onReject && (
            <Button
              variant="destructive"
              className={!gym.is_approved && onApprove ? "flex-1" : "w-full"}
              onClick={onReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Gym
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

