import { useState, useMemo } from "react";
import { Building2, MapPin, Bed, Bath, Users, Clock, CheckCircle2, Edit, Loader2, Package, Trash2, CheckCircle, Wallet, XCircle, AlertCircle, Tag, Search, Plus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PartnerProperty, updateListingStatusApi, deletePropertyApi } from "@/services/partner/myspace";
import { useToast } from "@/hooks/use-toast";

interface PartnerPropertiesTabProps {
  properties: PartnerProperty[];
  isLoading: boolean;
  onEdit: (propertyId: number) => void;
  onAddProperty?: () => void;
  onPropertyUpdate?: () => void; // Callback to refresh properties list
  isApproved?: boolean;
}

export const PartnerPropertiesTab = ({ properties, isLoading, onEdit, onAddProperty, onPropertyUpdate, isApproved = false }: PartnerPropertiesTabProps) => {
  const { toast } = useToast();
  const [soldConfirmOpen, setSoldConfirmOpen] = useState(false);
  const [soldInfoOpen, setSoldInfoOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInfoOpen, setDeleteInfoOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PartnerProperty | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [soldCheckboxes, setSoldCheckboxes] = useState({
    removed: false,
    cannotUpdate: false,
  });
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);

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

      return (
        title.includes(query) ||
        place.includes(query) ||
        propertyType.includes(query) ||
        price.includes(query) ||
        currency.includes(query)
      );
    });
  }, [properties, searchQuery]);

  const handleSoldClick = (property: PartnerProperty) => {
    setSelectedProperty(property);
    setSoldConfirmOpen(true);
  };

  const handleSoldConfirm = () => {
    // Just open the info modal, don't call API yet
    setSoldConfirmOpen(false);
    setSoldInfoOpen(true);
    // Reset checkboxes
    setSoldCheckboxes({
      removed: false,
      cannotUpdate: false,
    });
  };

  const handleSoldFinalConfirm = async () => {
    if (!selectedProperty) return;
    
    setIsProcessing(true);
    
    try {
      const response = await updateListingStatusApi(selectedProperty.id, "SOLD");
      
      if ('data' in response && response.data?.success) {
        setSoldInfoOpen(false);
        toast({
          title: "Success",
          description: "Property marked as sold successfully! You earned 10 points!",
          variant: "default",
        });
        // Refresh properties list
        onPropertyUpdate?.();
        // Dispatch event to refresh wallet
        window.dispatchEvent(new CustomEvent("wallet-refresh"));
        // Reset checkboxes
        setSoldCheckboxes({
          removed: false,
          cannotUpdate: false,
        });
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
      setIsProcessing(false);
    }
  };

  const allSoldCheckboxesChecked = soldCheckboxes.removed && soldCheckboxes.cannotUpdate;

  const handleDeleteClick = (property: PartnerProperty) => {
    setSelectedProperty(property);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    // Just open the info modal, don't call API yet
    setDeleteConfirmOpen(false);
    setDeleteInfoOpen(true);
    // Reset checkbox
    setDeleteCheckbox(false);
  };

  const handleDeleteFinalConfirm = async () => {
    if (!selectedProperty) return;
    
    setIsProcessing(true);
    
    try {
      const response = await deletePropertyApi(selectedProperty.id);
      
      if ('status' in response && (response.status === 200 || response.status === 204)) {
        setDeleteInfoOpen(false);
        toast({
          title: "Success",
          description: "Property deleted successfully!",
          variant: "default",
        });
        // Refresh properties list
        onPropertyUpdate?.();
        // Reset checkbox
        setDeleteCheckbox(false);
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
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading properties...</p>
      </div>
    );
  }


  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, location, type, price..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {onAddProperty && isApproved && (
            <Button onClick={onAddProperty} className="sm:ml-3">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          )}
        </div>

        {filteredProperties.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? `No properties found matching "${searchQuery}"` : "No properties yet. Add your first property!"}
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
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {property.listing_status === "SOLD" ? (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                    <Tag className="w-3 h-3 mr-1" /> Sold Out
                  </Badge>
                ) : property.is_approved ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                    <Clock className="w-3 h-3 mr-1" /> Pending
                  </Badge>
                )}
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

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{property.views_count ?? 0}</span>
                  </div>
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
                  {property.listing_status !== "SOLD" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(property.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>

                {/* Sold and Delete buttons - only show if approved and not sold */}
                { property.listing_status !== "SOLD" && property.is_approved === true && (
                  <div className="flex gap-2 pt-2 border-t border-glass-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
                      onClick={() => handleSoldClick(property)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Sold
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"
                      onClick={() => handleDeleteClick(property)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Sold Confirmation Modal */}
      <Dialog open={soldConfirmOpen} onOpenChange={setSoldConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Mark Property as Sold
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this property as sold?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Property: <span className="font-semibold text-foreground">{selectedProperty?.title}</span>
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSoldConfirmOpen(false)} disabled={isProcessing} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleSoldConfirm} 
              disabled={isProcessing}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sold Info Modal */}
      <Dialog open={soldInfoOpen} onOpenChange={setSoldInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              What Happens When You Mark as Sold
            </DialogTitle>
            <DialogDescription>
              Please read and confirm the following:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Wallet className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">10 Points Added to Wallet</p>
                <p className="text-sm text-muted-foreground">You'll receive 10 points in your wallet as a reward for successfully selling your property.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="mt-1">
                <Checkbox
                  id="removed-checkbox"
                  checked={soldCheckboxes.removed}
                  onCheckedChange={(checked) => 
                    setSoldCheckboxes(prev => ({ ...prev, removed: checked === true }))
                  }
                />
              </div>
              <div className="flex-1">
                <label htmlFor="removed-checkbox" className="cursor-pointer">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Removed from Vionex AI Platform</p>
                      <p className="text-sm text-muted-foreground">Your property will be removed from the public listings and will no longer be visible to seekers.</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="mt-1">
                <Checkbox
                  id="cannot-update-checkbox"
                  checked={soldCheckboxes.cannotUpdate}
                  onCheckedChange={(checked) => 
                    setSoldCheckboxes(prev => ({ ...prev, cannotUpdate: checked === true }))
                  }
                />
              </div>
              <div className="flex-1">
                <label htmlFor="cannot-update-checkbox" className="cursor-pointer">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Cannot Update Anymore</p>
                      <p className="text-sm text-muted-foreground">This property will be marked as sold and cannot be edited or updated. It will remain in your property history.</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSoldInfoOpen(false);
                setSoldCheckboxes({
                  removed: false,
                  cannotUpdate: false,
                });
              }} 
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSoldFinalConfirm} 
              disabled={!allSoldCheckboxesChecked || isProcessing}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Sold
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Property
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Property: <span className="font-semibold text-foreground">{selectedProperty?.title}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Info Modal */}
      <Dialog open={deleteInfoOpen} onOpenChange={setDeleteInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              What Happens When You Delete
            </DialogTitle>
            <DialogDescription>
              Please read and confirm the following before deleting:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Property Permanently Deleted</p>
                <p className="text-sm text-muted-foreground">Your property will be permanently removed from the Vionex AI Platform and all associated data will be deleted. This includes images, descriptions, and all property details.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <XCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Removed from Public Listings</p>
                <p className="text-sm text-muted-foreground">The property will no longer be visible to seekers and will be completely removed from search results, featured listings, and all public pages.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Action Cannot Be Undone</p>
                <p className="text-sm text-muted-foreground">This deletion is permanent and irreversible. If you need to list this property again in the future, you'll need to create a completely new listing from scratch.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="mt-1">
                <Checkbox
                  id="delete-confirm-checkbox"
                  checked={deleteCheckbox}
                  onCheckedChange={(checked) => 
                    setDeleteCheckbox(checked === true)
                  }
                />
              </div>
              <div className="flex-1">
                <label htmlFor="delete-confirm-checkbox" className="cursor-pointer">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">I understand the consequences</p>
                      <p className="text-sm text-muted-foreground">I confirm that I want to permanently delete this property and understand that this action cannot be undone.</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteInfoOpen(false);
                setDeleteCheckbox(false);
              }} 
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteFinalConfirm} 
              disabled={!deleteCheckbox || isProcessing}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Property
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
