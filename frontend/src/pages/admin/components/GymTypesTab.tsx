import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Dumbbell, Loader2 } from "lucide-react";
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
import { getGymTypesApi, createGymTypeApi, updateGymTypeApi, type GymType } from "@/services/admin/fitness";

export const GymTypesTab = () => {
  const { toast } = useToast();
  const [gymTypes, setGymTypes] = useState<GymType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGymType, setSelectedGymType] = useState<GymType | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load gym types on component mount
  useEffect(() => {
    loadGymTypes();
  }, []);

  const loadGymTypes = async () => {
    setIsLoading(true);
    try {
      const res: any = await getGymTypesApi();

      const responseData = res?.data ?? res;
      
      if (responseData?.success && responseData?.data) {
        setGymTypes(responseData.data);
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load gym types",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading gym types:", err);
      toast({
        title: "Error",
        description: "Failed to load gym types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredGymTypes = (): GymType[] => {
    let filtered = gymTypes;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          type.description?.toLowerCase().includes(query) ||
          type.slug?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredGymTypes = getFilteredGymTypes();

  const handleAdd = () => {
    setFormData({ name: "", description: "" });
    setSelectedGymType(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (gymType: GymType) => {
    setSelectedGymType(gymType);
    setFormData({
      name: gymType.name,
      description: gymType.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Gym type name is required",
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

      const res: any = await createGymTypeApi(payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Add new item to state directly without reloading
        setGymTypes((prev) => [...prev, responseData.data]);
        setIsAddModalOpen(false);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Gym type added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to add gym type",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating gym type:", err);
      toast({
        title: "Error",
        description: "Failed to add gym type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedGymType) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Gym type name is required",
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

      const res: any = await updateGymTypeApi(selectedGymType.id, payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Update specific item in state directly without reloading
        setGymTypes((prev) =>
          prev.map((item) =>
            item.id === selectedGymType.id ? responseData.data : item
          )
        );
        setIsEditModalOpen(false);
        setSelectedGymType(null);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Gym type updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update gym type",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating gym type:", err);
      toast({
        title: "Error",
        description: "Failed to update gym type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: gymTypes.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gym Types</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage gym types for fitness centers
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
              <p className="text-sm text-muted-foreground">Total Gym Types</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Dumbbell className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gym types..."
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
              {filteredGymTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No gym types found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGymTypes.map((gymType, index) => (
                  <TableRow key={gymType.id} className="border-glass-border">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{gymType.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {gymType.slug || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {gymType.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(gymType)}
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

      {/* Add Gym Type Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Gym Type</DialogTitle>
            <DialogDescription>
              Create a new gym type for fitness centers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gymTypeName">Name *</Label>
              <Input
                id="gymTypeName"
                placeholder="Enter gym type name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymTypeDescription">Description</Label>
              <Textarea
                id="gymTypeDescription"
                placeholder="Enter gym type description"
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

      {/* Edit Gym Type Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Gym Type</DialogTitle>
            <DialogDescription>
              Update gym type information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editGymTypeName">Name *</Label>
              <Input
                id="editGymTypeName"
                placeholder="Enter gym type name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGymTypeDescription">Description</Label>
              <Textarea
                id="editGymTypeDescription"
                placeholder="Enter gym type description"
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
                setSelectedGymType(null);
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

