import { useState, useEffect } from "react";
import { MapPin, Clock, Users, Image as ImageIcon, Loader2, Edit, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getGymsApi, deleteGymApi, type Gym } from "@/services/admin/fitness";
import { DeleteConfirmationModal } from "@/pages/admin/components/DeleteConfirmationModal";
import { AddGymModal } from "./AddGymModal";

type FilterType = "all" | "approved" | "pending" | "rejected";

interface GymsTabProps {
  isApproved: boolean;
  onAddGym: () => void;
  onGymAdded?: () => void;
}

export const GymsTab = ({ isApproved, onAddGym, onGymAdded }: GymsTabProps) => {
  const { toast } = useToast();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<number | null>(null);
  const [gymToDelete, setGymToDelete] = useState<Gym | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGyms = async () => {
    setIsLoading(true);
    try {
      const response = await getGymsApi();
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        if (responseData?.success) {
          const gymsData = responseData.data || [];
          setGyms(gymsData);
        } else {
          toast({
            title: "Error",
            description: responseData?.message || "Failed to fetch gyms",
            variant: "destructive",
          });
          setGyms([]);
        }
      }
    } catch (error) {
      console.error("Error fetching gyms:", error);
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

  useEffect(() => {
    fetchGyms();
  }, []);

  // Refresh gyms when a new gym is added
  useEffect(() => {
    const handleGymAdded = () => {
      fetchGyms();
    };
    
    window.addEventListener("gymAdded", handleGymAdded);
    
    return () => {
      window.removeEventListener("gymAdded", handleGymAdded);
    };
  }, []);

  const formatTime = (time: string) => {
    if (!time) return "N/A";
    // Convert HH:MM:SS to HH:MM format
    return time.substring(0, 5);
  };

  const getGenderLabel = (gender: string) => {
    switch (gender?.toUpperCase()) {
      case "MIXED":
        return "Mixed (Men & Women)";
      case "MALE":
        return "Male Only";
      case "FEMALE":
        return "Female Only";
      default:
        return gender || "N/A";
    }
  };

  // Calculate stats
  const stats = {
    total: gyms.length,
    approved: gyms.filter(g => g.is_approved === true).length,
    pending: gyms.filter(g => g.is_approved === false && (g.rejection_note === null || g.rejection_note === undefined)).length,
    rejected: gyms.filter(g => g.is_approved === false && g.rejection_note !== null && g.rejection_note !== undefined).length,
  };

  // Filter gyms based on filter type and search query
  const filteredGyms = gyms.filter((gym) => {
    // Apply filter
    if (filter === "approved" && gym.is_approved !== true) return false;
    if (filter === "pending" && (gym.is_approved !== false || (gym.rejection_note !== null && gym.rejection_note !== undefined))) return false;
    if (filter === "rejected" && (gym.is_approved !== false || gym.rejection_note === null || gym.rejection_note === undefined)) return false;
    
    // Apply search
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = gym.name?.toLowerCase().includes(searchLower) || false;
      const addressMatch = (gym.address || "").toLowerCase().includes(searchLower);
      const gymTypeMatch = (gym.gym_type?.name || gym.gym_type_name || "").toLowerCase().includes(searchLower);
      
      if (!nameMatch && !addressMatch && !gymTypeMatch) return false;
    }
    
    return true;
  });

  const handleEdit = (gymId: number) => {
    setSelectedGymId(gymId);
    setIsEditModalOpen(true);
  };

  const handleDelete = (gym: Gym) => {
    setGymToDelete(gym);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!gymToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await deleteGymApi(gymToDelete.id);
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        if (responseData?.success) {
          toast({
            title: "Success",
            description: "Gym deleted successfully",
          });
          
          // Remove gym from list
          setGyms((prev) => prev.filter((g) => g.id !== gymToDelete.id));
          
          // Trigger refresh event
          window.dispatchEvent(new Event("gymAdded"));
        } else {
          toast({
            title: "Error",
            description: responseData?.message || "Failed to delete gym",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error deleting gym:", error);
      toast({
        title: "Error",
        description: "Failed to delete gym. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setGymToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">My Gyms</h2>
          <p className="text-muted-foreground mt-1">
            {gyms.length} {gyms.length === 1 ? "gym" : "gyms"} registered
          </p>
        </div>
        {isApproved && (
          <Button 
            variant="default" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onAddGym}
          >
            Add New Gym
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-glass-border overflow-x-auto scrollbar-hide md:overflow-x-visible">
        <div className="flex items-center gap-2 min-w-max px-1 md:px-0">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            onClick={() => setFilter("all")}
            className="rounded-b-none flex-shrink-0 whitespace-nowrap"
          >
            All ({stats.total})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "ghost"}
            onClick={() => setFilter("approved")}
            className="rounded-b-none flex-shrink-0 whitespace-nowrap"
          >
            Approved ({stats.approved})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "ghost"}
            onClick={() => setFilter("pending")}
            className="rounded-b-none flex-shrink-0 whitespace-nowrap"
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "ghost"}
            onClick={() => setFilter("rejected")}
            className="rounded-b-none flex-shrink-0 whitespace-nowrap"
          >
            Rejected ({stats.rejected})
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gyms by name, address, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
      </div>

      {gyms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">No gyms yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isApproved 
                    ? "Get started by adding your first gym to your fitness business."
                    : "Your account needs to be approved to add gyms."}
                </p>
                {isApproved && (
                  <Button onClick={onAddGym} variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Add Your First Gym
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredGyms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">No gyms found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "No gyms match your search criteria." : `No gyms found in ${filter} category.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGyms.map((gym) => (
            <Card key={gym.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-muted">
                {gym.main_image ? (
                  <img
                    src={gym.main_image}
                    alt={gym.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/400x300?text=No+Image";
                    }}
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
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">{gym.name}</h3>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  {gym.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{gym.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {gym.is_24_hours 
                        ? "Open 24 hours"
                        : `${formatTime(gym.opening_time)} - ${formatTime(gym.closing_time)}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>{getGenderLabel(gym.gender_allowed)}</span>
                  </div>
                </div>

                {gym.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {gym.description}
                  </p>
                )}

                {/* Rejection Note */}
                {gym.rejection_note && gym.rejection_note.trim() && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg mt-3">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Rejection Note:</p>
                        <p className="text-sm text-red-700 dark:text-red-400 line-clamp-2">{gym.rejection_note}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(gym.id)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(gym)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Gym Modal */}
      <AddGymModal
        isOpen={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setSelectedGymId(null);
          }
        }}
        gymId={selectedGymId || undefined}
        onSuccess={() => {
          fetchGyms();
          window.dispatchEvent(new Event("gymAdded"));
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Gym"
        description="Are you sure you want to delete this gym? This action cannot be undone."
        itemName={gymToDelete?.name}
      />
    </div>
  );
};

