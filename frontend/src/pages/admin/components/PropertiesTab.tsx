import { useState, useEffect, useMemo } from "react";
import { Search, Eye, CheckCircle2, XCircle, Loader2, Building2, MapPin, Bed, Bath, DollarSign, Calendar, User, ExternalLink, MoreVertical, Tag, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getPropertiesApi, getPropertyByIdApi, approvePropertyApi, rejectPropertyApi, updateListingStatusApi, deletePropertyApi, type Property } from "@/services/admin/properties";

type FilterType = "all" | "approved" | "pending" | "rejected" | "sold";

export const PropertiesTab = () => {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [processingPropertyId, setProcessingPropertyId] = useState<number | null>(null);
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [isAvailableModalOpen, setIsAvailableModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setIsLoading(true);
    try {

      const response = await getPropertiesApi();




      if ('data' in response && 'status' in response) {


        const responseData = response.data?.data ?? response.data;


        let propertiesArray: Property[] = [];
        
        if (Array.isArray(responseData)) {
          propertiesArray = responseData;
        } else if (responseData?.success && Array.isArray(responseData?.data)) {
          propertiesArray = responseData.data;
        } else {
          console.error("Unexpected response structure:", responseData);
          toast({
            title: "Error",
            description: "Unexpected response structure",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Map the new API response structure to Property interface
        const mappedProperties: Property[] = propertiesArray.map((property: any) => {
          const mapped: Property = {
            id: property.id,
            title: property.title || "",
            // New fields from API
            property_type_name: property.property_type_name,
            place: property.place,
            main_image: property.main_image,
            occupant_type: property.occupant_type,
            rent_period: property.rent_period,
            // Map for backward compatibility
            address: property.place || property.address || "N/A",
            main_image_url: property.main_image || property.main_image_url,
            property_type: property.property_type || (property.property_type_name ? {
              id: 0,
              name: property.property_type_name,
              slug: "",
              description: ""
            } : undefined),
            // Other fields
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            price: property.price || "0",
            currency: property.currency || "AED",
            is_approved: property.is_approved,
            created_at: property.created_at,
            // Preserve any other fields
            ...property
          };
          return mapped;
        });


        mappedProperties.forEach((property, index) => {

        });

        setProperties(mappedProperties);
      } else {
        console.error("Error loading properties:", response);
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProperty = async (property: Property) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);



    // Extract images from the property object directly
    const images: string[] = [];
    // Use main_image (new API) or main_image_url (legacy) for main image
    const mainImg = property.main_image || property.main_image_url;
    if (mainImg) {
      images.push(mainImg);

    }
    if (property.gallery_images && Array.isArray(property.gallery_images)) {

      property.gallery_images.forEach((img: any, index: number) => {

        if (img.image) {
          images.push(img.image);

        }
      });
    }

    setPropertyImages(images);
    
    try {
      // Fetch full property details for complete information
      const response = await getPropertyByIdApi(property.id);


      if ('data' in response && 'status' in response) {
        const fullProperty = (response.data?.data ?? response.data) as Property;



        if (fullProperty) {
          setSelectedProperty(fullProperty as Property);
          
          // Update images from full property data
          const updatedImages: string[] = [];
          // Use main_image (new API) or main_image_url (legacy) for main image
          const mainImg = fullProperty.main_image || fullProperty.main_image_url;
          if (mainImg) {
            updatedImages.push(mainImg);
          }
          if (fullProperty.gallery_images && Array.isArray(fullProperty.gallery_images)) {
            fullProperty.gallery_images.forEach((img: any) => {
              if (img.image) {
                updatedImages.push(img.image);
              }
            });
          }

          setPropertyImages(updatedImages);
        }
      }
    } catch (error) {
      console.error("Error loading property details:", error);
      // Use images we already extracted from the property object
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleApproveClick = (property: Property) => {
    setSelectedProperty(property);
    setPendingAction("approve");
    setIsConfirmationModalOpen(true);
  };

  const handleRejectClick = (property: Property) => {
    setSelectedProperty(property);
    setPendingAction("reject");
    setRejectionNote(""); // Reset rejection note when opening modal
    setIsConfirmationModalOpen(true);
  };

  const handleApprove = async (property: Property) => {
    setProcessingPropertyId(property.id);
    try {


      const response = await approvePropertyApi(property.id);


      if ('data' in response && 'status' in response) {
        const responseData = response.data?.data ?? response.data;

        if (responseData?.success || response.status === 200) {
          toast({
            title: "Success",
            description: responseData?.message || "Property approved successfully",
          });
          
          // Update only the specific property in the state
          setProperties(prevProperties =>
            prevProperties.map(p =>
              p.id === property.id
                ? { ...p, is_approved: true }
                : p
            )
          );
          
          // Update selected property if it's the same one
          if (selectedProperty?.id === property.id) {
            setSelectedProperty(prev => prev ? { ...prev, is_approved: true } : null);
          }
          
          // Close modals
          setIsConfirmationModalOpen(false);
          setIsDetailModalOpen(false);
          setSelectedProperty(null);
          setPendingAction(null);
          setRejectionNote(""); // Clear rejection note after successful approval
        } else {
          toast({
            title: "Error",
            description: responseData?.message || "Failed to approve property",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to approve property",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error approving property:", error);
      toast({
        title: "Error",
        description: "Failed to approve property",
        variant: "destructive",
      });
    } finally {
      setProcessingPropertyId(null);
    }
  };

  const handleReject = async (property: Property, rejectionNote?: string) => {
    // Validate rejection note is required
    if (!rejectionNote || !rejectionNote.trim()) {
      toast({
        title: "Rejection Note Required",
        description: "Please provide a rejection note when rejecting a property.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPropertyId(property.id);
    try {



      const response = await rejectPropertyApi(property.id, rejectionNote);


      if ('data' in response && 'status' in response) {
        const responseData = response.data?.data ?? response.data;

        if (responseData?.success || response.status === 200) {
          toast({
            title: "Success",
            description: responseData?.message || "Property rejected successfully",
          });
          
          // Update only the specific property in the state
          setProperties(prevProperties =>
            prevProperties.map(p =>
              p.id === property.id
                ? { ...p, is_approved: false }
                : p
            )
          );
          
          // Update selected property if it's the same one
          if (selectedProperty?.id === property.id) {
            setSelectedProperty(prev => prev ? { ...prev, is_approved: false } : null);
          }
          
          // Close modals
          setIsConfirmationModalOpen(false);
          setIsDetailModalOpen(false);
          setSelectedProperty(null);
          setPendingAction(null);
          setRejectionNote(""); // Clear rejection note after successful rejection
        } else {
          toast({
            title: "Error",
            description: responseData?.message || "Failed to reject property",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to reject property",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error rejecting property:", error);
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    } finally {
      setProcessingPropertyId(null);
    }
  };

  const handleApproveDirect = async (property: Property) => {
    await handleApprove(property);
  };

  const handleRejectDirect = (property: Property) => {
    // Open confirmation modal to get rejection note
    handleRejectClick(property);
  };

  const handleSoldClick = (property: Property) => {
    setSelectedProperty(property);
    setIsSoldModalOpen(true);
  };

  const handleSoldConfirm = async () => {
    if (!selectedProperty) return;

    setProcessingPropertyId(selectedProperty.id);
    try {
      const response = await updateListingStatusApi(selectedProperty.id, "SOLD");
      
      if ('data' in response && (response.data?.success || response.status === 200 || response.status === 201)) {
        setIsSoldModalOpen(false);
        toast({
          title: "Success",
          description: "Property marked as sold successfully!",
          variant: "default",
        });
        // Reload properties to reflect the change
        await loadProperties();
      } else {
        throw new Error("Failed to update listing status");
      }
    } catch (error: any) {
      console.error("Error marking property as sold:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to mark property as sold. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPropertyId(null);
    }
  };

  const handleAvailableClick = (property: Property) => {
    setSelectedProperty(property);
    setIsAvailableModalOpen(true);
  };

  const handleAvailableConfirm = async () => {
    if (!selectedProperty) return;

    setProcessingPropertyId(selectedProperty.id);
    try {
      const response = await updateListingStatusApi(selectedProperty.id, "AVAILABLE");
      
      if ('data' in response && (response.data?.success || response.status === 200 || response.status === 201)) {
        setIsAvailableModalOpen(false);
        toast({
          title: "Success",
          description: "Property marked as available successfully!",
          variant: "default",
        });
        // Reload properties to reflect the change
        await loadProperties();
      } else {
        throw new Error("Failed to update listing status");
      }
    } catch (error: any) {
      console.error("Error marking property as available:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to mark property as available. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPropertyId(null);
    }
  };

  const handleDeleteClick = (property: Property) => {
    setSelectedProperty(property);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProperty) return;

    setProcessingPropertyId(selectedProperty.id);
    try {
      const response = await deletePropertyApi(selectedProperty.id);
      
      if ('data' in response && (response.data?.success || response.status === 200 || response.status === 201 || response.status === 204)) {
        setIsDeleteModalOpen(false);
        toast({
          title: "Success",
          description: "Property deleted successfully!",
          variant: "default",
        });
        // Reload properties to reflect the change
        await loadProperties();
        // Close detail modal if open
        setIsDetailModalOpen(false);
        setSelectedProperty(null);
      } else {
        throw new Error("Failed to delete property");
      }
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPropertyId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedProperty || !pendingAction) return;

    // Validate rejection note is required when rejecting
    if (pendingAction === "reject" && !rejectionNote.trim()) {
      toast({
        title: "Rejection Note Required",
        description: "Please provide a rejection note when rejecting a property.",
        variant: "destructive",
      });
      return;
    }

    if (pendingAction === "approve") {
      await handleApprove(selectedProperty);
    } else {
      await handleReject(selectedProperty, rejectionNote);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const approved = properties.filter(p => p.is_approved === true && (p.listing_status !== "SOLD" || !p.listing_status));
    const pending = properties.filter(p => p.is_approved === false && (!p.rejection_note || p.rejection_note === null || p.rejection_note === ""));
    const rejected = properties.filter(p => p.is_approved === false && p.rejection_note && p.rejection_note !== null && p.rejection_note !== "");
    const sold = properties.filter(p => p.listing_status === "SOLD");
    
    return {
      all: properties.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      sold: sold.length,
    };
  }, [properties]);

  // Filter properties based on filter type and search query
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Apply status filter
    if (filter === "approved") {
      filtered = filtered.filter(p => p.is_approved === true && (p.listing_status !== "SOLD" || !p.listing_status));
    } else if (filter === "pending") {
      filtered = filtered.filter(p => p.is_approved === false && (!p.rejection_note || p.rejection_note === null || p.rejection_note === ""));
    } else if (filter === "rejected") {
      filtered = filtered.filter(p => p.is_approved === false && p.rejection_note && p.rejection_note !== null && p.rejection_note !== "");
    } else if (filter === "sold") {
      filtered = filtered.filter(p => p.listing_status === "SOLD");
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((property) => {
        const titleMatch = property.title?.toLowerCase().includes(searchLower) || false;
        const addressMatch = (property.address || property.place || "").toLowerCase().includes(searchLower);
        const ownerMatch = (property.owner_name || "").toLowerCase().includes(searchLower);
        const propertyTypeMatch = (property.property_type_name || property.property_type?.name || "").toLowerCase().includes(searchLower);
        
        return titleMatch || addressMatch || ownerMatch || propertyTypeMatch;
      });
    }

    return filtered;
  }, [properties, filter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-glass-border pb-4">
        <Button
          variant={filter === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-primary text-primary-foreground" : ""}
        >
          All ({stats.all})
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("approved")}
          className={filter === "approved" ? "bg-primary text-primary-foreground" : ""}
        >
          Approved ({stats.approved})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("pending")}
          className={filter === "pending" ? "bg-primary text-primary-foreground" : ""}
        >
          Pending ({stats.pending})
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("rejected")}
          className={filter === "rejected" ? "bg-primary text-primary-foreground" : ""}
        >
          Rejected ({stats.rejected})
        </Button>
        <Button
          variant={filter === "sold" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("sold")}
          className={filter === "sold" ? "bg-primary text-primary-foreground" : ""}
        >
          Sold ({stats.sold})
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties by title, address, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No properties found matching your search." : "No properties available."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onView={() => handleViewProperty(property)}
              onApprove={() => handleApproveDirect(property)}
              onReject={() => handleRejectDirect(property)}
              onSold={() => handleSoldClick(property)}
              onAvailable={() => handleAvailableClick(property)}
              onDelete={() => handleDeleteClick(property)}
              isProcessing={processingPropertyId === property.id}
            />
          ))}
        </div>
      )}

      {/* Property Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
            <DialogDescription>Property Details</DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedProperty ? (
            <PropertyDetailContent
              property={selectedProperty}
              images={propertyImages}
              onApprove={() => handleApproveDirect(selectedProperty)}
              onReject={() => handleRejectDirect(selectedProperty)}
              isProcessing={processingPropertyId === selectedProperty.id}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Make Available Confirmation Modal */}
      <Dialog open={isAvailableModalOpen} onOpenChange={setIsAvailableModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Make Property Available
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark the property <strong>"{selectedProperty?.title}"</strong> as available?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action will update the listing status to "AVAILABLE" and the property will be moved back to the available listings.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAvailableModalOpen(false)}
              disabled={processingPropertyId === selectedProperty?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAvailableConfirm}
              disabled={processingPropertyId === selectedProperty?.id}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingPropertyId === selectedProperty?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Make Available
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sold Confirmation Modal */}
      <Dialog open={isSoldModalOpen} onOpenChange={setIsSoldModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Mark Property as Sold
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark the property <strong>"{selectedProperty?.title}"</strong> as sold?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action will update the listing status to "SOLD" and the property will be moved to the sold category.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSoldModalOpen(false)}
              disabled={processingPropertyId === selectedProperty?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSoldConfirm}
              disabled={processingPropertyId === selectedProperty?.id}
              className="bg-primary hover:bg-primary/90"
            >
              {processingPropertyId === selectedProperty?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 mr-2" />
                  Mark as Sold
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Property
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the property <strong>"{selectedProperty?.title}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The property will be permanently removed from the system.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={processingPropertyId === selectedProperty?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={processingPropertyId === selectedProperty?.id}
              variant="destructive"
            >
              {processingPropertyId === selectedProperty?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
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
              Are you sure you want to {pendingAction} the property <strong>"{selectedProperty?.title}"</strong>?
            </DialogDescription>
          </DialogHeader>
          {pendingAction === "reject" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="rejection-note" className="text-sm font-medium">
                Rejection Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-note"
                placeholder="Please provide a reason for rejection (e.g., Property images are unclear. Please upload higher quality photos.)"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="min-h-[100px] resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">
                A rejection note is required when rejecting a property.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmationModalOpen(false);
                setPendingAction(null);
                setRejectionNote(""); // Clear rejection note on cancel
              }}
              disabled={processingPropertyId !== null}
            >
              Cancel
            </Button>
            <Button
              variant={pendingAction === "approve" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={processingPropertyId !== null}
              className={pendingAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {processingPropertyId !== null ? (
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

interface PropertyCardProps {
  property: Property;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSold?: () => void;
  onAvailable?: () => void;
  onDelete?: () => void;
  isProcessing?: boolean;
}

const PropertyCard = ({ property, onView, onApprove, onReject, onSold, onAvailable, onDelete, isProcessing = false }: PropertyCardProps) => {
  const [imageError, setImageError] = useState(false);








  const handleImageClick = () => {
    const mainImg = property.main_image || property.main_image_url;
    if (mainImg) {
      window.open(mainImg, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-muted/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Building2 className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-1">{property.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="line-clamp-1">{property.place || property.address || "N/A"}</span>
              </div>
            </div>
          </div>
          {/* Action Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {property.listing_status === "SOLD" ? (
                onAvailable && (
                  <DropdownMenuItem onClick={onAvailable} disabled={isProcessing}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Make it Available
                  </DropdownMenuItem>
                )
              ) : (
                <>
                  {!property.is_approved && (
                    <DropdownMenuItem onClick={onApprove} disabled={isProcessing}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                  )}
                  {property.is_approved && property.listing_status !== "SOLD" && onSold && (
                    <DropdownMenuItem onClick={onSold} disabled={isProcessing}>
                      <Tag className="w-4 h-4 mr-2" />
                      Mark as Sold
                    </DropdownMenuItem>
                  )}
                  {property.is_approved && onDelete && (
                    <DropdownMenuItem onClick={onDelete} disabled={isProcessing} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onReject} disabled={isProcessing}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-2">
          {(property.property_type_name || property.property_type?.name) && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
              {property.property_type_name || property.property_type?.name}
            </Badge>
          )}
          {property.purpose?.name && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              {property.purpose.name}
            </Badge>
          )}
          {property.occupant_type?.name && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
              {property.occupant_type.name}
            </Badge>
          )}
          {property.rent_period && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
              {property.rent_period}
            </Badge>
          )}
          {property.listing_status === "SOLD" ? (
            <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30">
              Sold
            </Badge>
          ) : property.is_approved !== undefined && property.rejection_note && property.rejection_note !== null && property.rejection_note !== "" ? (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
              Rejected
            </Badge>
          ) : property.is_approved !== undefined ? (
            <Badge 
              variant="outline" 
              className={property.is_approved 
                ? "bg-green-500/10 text-green-500 border-green-500/30" 
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
              }
            >
              {property.is_approved ? "Approved" : "Pending"}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Image - Clickable to open externally */}
      <div className="relative h-48 bg-muted overflow-hidden cursor-pointer group" onClick={handleImageClick}>
        {(() => {
          const mainImg = property.main_image || property.main_image_url;
          if (mainImg && !imageError) {
            return (
              <>
                <img
                  src={mainImg}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    console.error("Image load error for property:", property.id);
                    console.error("Image URL:", mainImg);
                    console.error("Error event:", e);
                    setImageError(true);
                  }}
                  onLoad={() => {


                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-black/50 rounded-full p-2">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                </div>
              </>
            );
          }
          return (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-12 h-12 text-muted-foreground" />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <p className="text-xs text-muted-foreground">Image failed to load</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Property Details */}
        <div className="flex flex-wrap gap-3 text-sm">
          {property.bedrooms && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{property.bathrooms}</span>
            </div>
          )}
          {property.area_sqm && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{property.area_sqm} sqm</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="font-semibold text-primary">
            {property.price} {property.currency}
          </span>
        </div>

        {/* Owner - only show if available */}
        {property.owner_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground line-clamp-1">{property.owner_name}</span>
          </div>
        )}
      </div>

      {/* View Details Button */}
      <div className="p-4 border-t border-glass-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onView}
          disabled={isProcessing}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </div>
    </div>
  );
};

interface PropertyDetailContentProps {
  property: Property;
  images: string[];
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

const PropertyDetailContent = ({ property, images, onApprove, onReject, isProcessing = false }: PropertyDetailContentProps) => {




  return (
    <div className="space-y-6">
      {/* Images */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group"
              onClick={() => window.open(img, '_blank', 'noopener,noreferrer')}
            >
              <img
                src={img}
                alt={`Property image ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  console.error(`Detail Image ${index + 1} load error:`, img);
                  console.error("Error event:", e);
                }}
                onLoad={() => {

                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-black/50 rounded-full p-2">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {images.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No images available</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <p className="text-foreground font-semibold">{property.title}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Location</label>
            <p className="text-foreground">{property.place || property.address || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Property Type</label>
            <p className="text-foreground">{property.property_type_name || property.property_type?.name || "N/A"}</p>
          </div>
          {property.property_type?.occupant_count !== undefined && property.property_type?.occupant_count !== null && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Occupants (as per law)</label>
              <p className="text-foreground">{property.property_type.occupant_count}</p>
            </div>
          )}
          {property.occupant_type?.name && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Occupant Type</label>
              <p className="text-foreground">{property.occupant_type.name}</p>
            </div>
          )}
          {property.rent_period && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Rent Period</label>
              <p className="text-foreground">{property.rent_period}</p>
            </div>
          )}
          {property.purpose?.name && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose</label>
              <p className="text-foreground">{property.purpose.name}</p>
            </div>
          )}
          {property.nationality && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nationality</label>
              <p className="text-foreground">{property.nationality}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Price</label>
            <p className="text-foreground font-semibold text-primary">
              {property.price} {property.currency}
            </p>
          </div>
          {property.bedrooms && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bedrooms</label>
              <p className="text-foreground">{property.bedrooms}</p>
            </div>
          )}
          {property.bathrooms && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bathrooms</label>
              <p className="text-foreground">{property.bathrooms}</p>
            </div>
          )}
          {property.area_sqm && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Area</label>
              <p className="text-foreground">{property.area_sqm} sqm</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Details */}
      {property.description && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Description</label>
          <p className="text-foreground mt-1">{property.description}</p>
        </div>
      )}
  
      {/* Owner Info */}
      <div className="pt-4 border-t border-glass-border">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Owner:</span>
          <span className="text-foreground">{property.owner.name}</span>
        </div>
        {property.created_at && (
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Created: {new Date(property.created_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-glass-border">
        {!property.is_approved && (
          <Button
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={onApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
        )}
        <Button
          variant="destructive"
          className={property.is_approved ? "flex-1" : "flex-1"}
          onClick={onReject}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4 mr-2" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
};

