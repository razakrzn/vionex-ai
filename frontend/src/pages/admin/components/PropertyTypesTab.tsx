import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Home, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getPropertyTypesApi,
  createPropertyTypeApi,
  updatePropertyTypeApi,
  getAssetTypesApi,
  type PropertyType,
  type AssetType,
} from "@/services/admin/myspace";

export const PropertyTypesTab = () => {
  const { toast } = useToast();
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssetTypes, setIsLoadingAssetTypes] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyType | null>(null);
  const [formData, setFormData] = useState({ name: "", asset_type_id: "", description: "", occupant_count: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load property types and asset types on component mount
  useEffect(() => {
    loadPropertyTypes();
    loadAssetTypes();
  }, []);

  const loadPropertyTypes = async () => {
    setIsLoading(true);
    try {
      const res: any = await getPropertyTypesApi();

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        setPropertyTypes(responseData.data);
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load property types",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading property types:", err);
      toast({
        title: "Error",
        description: "Failed to load property types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssetTypes = async () => {
    setIsLoadingAssetTypes(true);
    try {
      const res: any = await getAssetTypesApi();

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        setAssetTypes(responseData.data);
      }
    } catch (err) {
      console.error("Error loading asset types:", err);
    } finally {
      setIsLoadingAssetTypes(false);
    }
  };

  const getFilteredPropertyTypes = (): PropertyType[] => {
    let filtered = propertyTypes;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          type.description?.toLowerCase().includes(query) ||
          type.slug?.toLowerCase().includes(query) ||
          type.asset_type?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredPropertyTypes = getFilteredPropertyTypes();

  const handleAdd = () => {
    setFormData({ name: "", asset_type_id: "", description: "", occupant_count: "" });
    setSelectedPropertyType(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (propertyType: PropertyType) => {
    setSelectedPropertyType(propertyType);
    setFormData({
      name: propertyType.name,
      asset_type_id: String(propertyType.asset_type.id),
      description: propertyType.description || "",
      occupant_count: propertyType.occupant_count?.toString() || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Property type name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.asset_type_id) {
      toast({
        title: "Error",
        description: "Please select an asset type",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        asset_type_id: Number(formData.asset_type_id),
        description: formData.description.trim(),
        occupant_count: formData.occupant_count ? Number(formData.occupant_count) : null,
      };

      const res: any = await createPropertyTypeApi(payload);

      const responseData = res?.data ?? res;

      if (responseData?.success) {
        // Reload data from API to get the actual response
        await loadPropertyTypes();
        setIsAddModalOpen(false);
        setFormData({ name: "", asset_type_id: "", description: "", occupant_count: "" });
        toast({
          title: "Success",
          description: "Property type added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to add property type",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating property type:", err);
      toast({
        title: "Error",
        description: "Failed to add property type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPropertyType) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Property type name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.asset_type_id) {
      toast({
        title: "Error",
        description: "Please select an asset type",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        asset_type_id: Number(formData.asset_type_id),
        description: formData.description.trim(),
        occupant_count: formData.occupant_count ? Number(formData.occupant_count) : null,
      };

      const res: any = await updatePropertyTypeApi(selectedPropertyType.id, payload);

      const responseData = res?.data ?? res;

      if (responseData?.success) {
        // Reload data from API to get the actual response
        await loadPropertyTypes();
        setIsEditModalOpen(false);
        setSelectedPropertyType(null);
        setFormData({ name: "", asset_type_id: "", description: "", occupant_count: "" });
        toast({
          title: "Success",
          description: "Property type updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update property type",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating property type:", err);
      toast({
        title: "Error",
        description: "Failed to update property type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: propertyTypes.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Property Types</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage real estate property types
          </p>
        </div>
        <Button onClick={handleAdd} variant="neon" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Property Types</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Home className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search property types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-card border border-glass-border rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card border border-glass-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-glass-border">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Asset Type</TableHead>
                <TableHead>Occupant Count</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropertyTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No property types found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPropertyTypes.map((propertyType, index) => (
                  <TableRow key={propertyType.id} className="border-glass-border">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{propertyType.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {propertyType.slug}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {propertyType.asset_type?.name || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {propertyType.occupant_count !== null && propertyType.occupant_count !== undefined 
                          ? propertyType.occupant_count 
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {propertyType.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(propertyType)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Property Type Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Property Type</DialogTitle>
            <DialogDescription>
              Create a new property type for real estate properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="propertyTypeName">Name *</Label>
              <Input
                id="propertyTypeName"
                placeholder="Enter property type name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetTypeSelect">Asset Type *</Label>
              <Select
                value={formData.asset_type_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, asset_type_id: value })
                }
                disabled={isSubmitting || isLoadingAssetTypes}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((assetType) => (
                    <SelectItem key={assetType.id} value={String(assetType.id)}>
                      {assetType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyTypeOccupantCount">Number of Occupant (as per the law)</Label>
              <Input
                id="propertyTypeOccupantCount"
                type="number"
                min="0"
                placeholder="Enter number of occupants as per the law"
                value={formData.occupant_count}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers
                  if (value === "" || /^\d+$/.test(value)) {
                    setFormData({ ...formData, occupant_count: value });
                  }
                }}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyTypeDescription">Description</Label>
              <Textarea
                id="propertyTypeDescription"
                placeholder="Enter property type description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-muted/30 border-glass-border min-h-[100px]"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="neon" onClick={handleSaveAdd} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Add Type"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Property Type Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Property Type</DialogTitle>
            <DialogDescription>
              Update property type information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPropertyTypeName">Name *</Label>
              <Input
                id="editPropertyTypeName"
                placeholder="Enter property type name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAssetTypeSelect">Asset Type *</Label>
              <Select
                value={formData.asset_type_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, asset_type_id: value })
                }
                disabled={isSubmitting || isLoadingAssetTypes}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((assetType) => (
                    <SelectItem key={assetType.id} value={String(assetType.id)}>
                      {assetType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPropertyTypeOccupantCount">Number of Occupant (as per the law)</Label>
              <Input
                id="editPropertyTypeOccupantCount"
                type="number"
                min="0"
                placeholder="Enter number of occupants as per the law"
                value={formData.occupant_count}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers
                  if (value === "" || /^\d+$/.test(value)) {
                    setFormData({ ...formData, occupant_count: value });
                  }
                }}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPropertyTypeDescription">Description</Label>
              <Textarea
                id="editPropertyTypeDescription"
                placeholder="Enter property type description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-muted/30 border-glass-border min-h-[100px]"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedPropertyType(null);
                setFormData({ name: "", asset_type_id: "", description: "", occupant_count: "" });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="neon" onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

