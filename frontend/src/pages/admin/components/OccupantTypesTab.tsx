import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { getOccupantTypesApi, createOccupantTypeApi, updateOccupantTypeApi, type OccupantType } from "@/services/admin/myspace";

export const OccupantTypesTab = () => {
  const { toast } = useToast();
  const [occupantTypes, setOccupantTypes] = useState<OccupantType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOccupantType, setSelectedOccupantType] = useState<OccupantType | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load occupant types on component mount
  useEffect(() => {
    loadOccupantTypes();
  }, []);

  const loadOccupantTypes = async () => {
    setIsLoading(true);
    try {
      const res: any = await getOccupantTypesApi();

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        setOccupantTypes(responseData.data);
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load occupant types",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading occupant types:", err);
      toast({
        title: "Error",
        description: "Failed to load occupant types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredOccupantTypes = (): OccupantType[] => {
    let filtered = occupantTypes;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (occupantType) =>
          occupantType.name.toLowerCase().includes(query) ||
          occupantType.description?.toLowerCase().includes(query) ||
          occupantType.slug?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredOccupantTypes = getFilteredOccupantTypes();

  const handleAdd = () => {
    setFormData({ name: "", description: "" });
    setSelectedOccupantType(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (occupantType: OccupantType) => {
    setSelectedOccupantType(occupantType);
    setFormData({
      name: occupantType.name,
      description: occupantType.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Occupant type name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      const res: any = await createOccupantTypeApi(payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Add new item to state directly without reloading
        setOccupantTypes((prev) => [...prev, responseData.data]);
        setIsAddModalOpen(false);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Occupant type added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to add occupant type",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating occupant type:", err);
      toast({
        title: "Error",
        description: "Failed to add occupant type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOccupantType) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Occupant type name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      const res: any = await updateOccupantTypeApi(selectedOccupantType.id, payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Update specific item in state directly without reloading
        setOccupantTypes((prev) =>
          prev.map((item) =>
            item.id === selectedOccupantType.id ? responseData.data : item
          )
        );
        setIsEditModalOpen(false);
        setSelectedOccupantType(null);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Occupant type updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update occupant type",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating occupant type:", err);
      toast({
        title: "Error",
        description: "Failed to update occupant type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: occupantTypes.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Occupant Types</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage occupant types for real estate properties
          </p>
        </div>
        <Button onClick={handleAdd} variant="neon" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Occupant Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Occupant Types</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search occupant types..."
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
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOccupantTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No occupant types found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOccupantTypes.map((occupantType, index) => (
                  <TableRow key={occupantType.id} className="border-glass-border">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{occupantType.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {occupantType.slug || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {occupantType.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(occupantType)}
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

      {/* Add Occupant Type Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Occupant Type</DialogTitle>
            <DialogDescription>
              Create a new occupant type for real estate properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="occupantTypeName">Name *</Label>
              <Input
                id="occupantTypeName"
                placeholder="Enter occupant type name (e.g., Bachelor)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupantTypeDescription">Description</Label>
              <Textarea
                id="occupantTypeDescription"
                placeholder="Enter occupant type description (e.g., Suitable for single male tenants)"
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
                "Add Occupant Type"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Occupant Type Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Occupant Type</DialogTitle>
            <DialogDescription>
              Update occupant type information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOccupantTypeName">Name *</Label>
              <Input
                id="editOccupantTypeName"
                placeholder="Enter occupant type name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOccupantTypeDescription">Description</Label>
              <Textarea
                id="editOccupantTypeDescription"
                placeholder="Enter occupant type description"
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
                setSelectedOccupantType(null);
                setFormData({ name: "", description: "" });
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

