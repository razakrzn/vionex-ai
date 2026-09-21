import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Sofa, Loader2 } from "lucide-react";
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
import {
  getFurnishingStatusesApi,
  createFurnishingStatusApi,
  updateFurnishingStatusApi,
  type FurnishingStatus,
} from "@/services/admin/myspace";

export const FurnishingStatusTab = () => {
  const { toast } = useToast();
  const [furnishingStatuses, setFurnishingStatuses] = useState<FurnishingStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFurnishingStatus, setSelectedFurnishingStatus] = useState<FurnishingStatus | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load furnishing statuses on component mount
  useEffect(() => {
    loadFurnishingStatuses();
  }, []);

  const loadFurnishingStatuses = async () => {
    setIsLoading(true);
    try {
      const res: any = await getFurnishingStatusesApi();

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        setFurnishingStatuses(responseData.data);
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load furnishing statuses",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading furnishing statuses:", err);
      toast({
        title: "Error",
        description: "Failed to load furnishing statuses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredFurnishingStatuses = (): FurnishingStatus[] => {
    let filtered = furnishingStatuses;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (status) =>
          status.name.toLowerCase().includes(query) ||
          status.description?.toLowerCase().includes(query) ||
          status.slug?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredFurnishingStatuses = getFilteredFurnishingStatuses();

  const handleAdd = () => {
    setFormData({ name: "", description: "" });
    setSelectedFurnishingStatus(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (furnishingStatus: FurnishingStatus) => {
    setSelectedFurnishingStatus(furnishingStatus);
    setFormData({
      name: furnishingStatus.name,
      description: furnishingStatus.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Furnishing status name is required",
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

      const res: any = await createFurnishingStatusApi(payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Add new item to state directly without reloading
        setFurnishingStatuses((prev) => [...prev, responseData.data]);
        setIsAddModalOpen(false);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Furnishing status added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to add furnishing status",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating furnishing status:", err);
      toast({
        title: "Error",
        description: "Failed to add furnishing status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedFurnishingStatus) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Furnishing status name is required",
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

      const res: any = await updateFurnishingStatusApi(selectedFurnishingStatus.id, payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Update specific item in state directly without reloading
        setFurnishingStatuses((prev) =>
          prev.map((item) =>
            item.id === selectedFurnishingStatus.id ? responseData.data : item
          )
        );
        setIsEditModalOpen(false);
        setSelectedFurnishingStatus(null);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Furnishing status updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update furnishing status",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating furnishing status:", err);
      toast({
        title: "Error",
        description: "Failed to update furnishing status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: furnishingStatuses.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Furnishing Statuses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage real estate furnishing statuses
          </p>
        </div>
        <Button onClick={handleAdd} variant="neon" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Status
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Furnishing Statuses</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Sofa className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search furnishing statuses..."
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
              {filteredFurnishingStatuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No furnishing statuses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFurnishingStatuses.map((status, index) => (
                  <TableRow key={status.id} className="border-glass-border">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {status.slug}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {status.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(status)}
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

      {/* Add Furnishing Status Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Furnishing Status</DialogTitle>
            <DialogDescription>
              Create a new furnishing status for real estate properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="furnishingStatusName">Name *</Label>
              <Input
                id="furnishingStatusName"
                placeholder="Enter furnishing status name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="furnishingStatusDescription">Description</Label>
              <Textarea
                id="furnishingStatusDescription"
                placeholder="Enter furnishing status description"
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
                "Add Status"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Furnishing Status Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Furnishing Status</DialogTitle>
            <DialogDescription>
              Update furnishing status information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFurnishingStatusName">Name *</Label>
              <Input
                id="editFurnishingStatusName"
                placeholder="Enter furnishing status name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFurnishingStatusDescription">Description</Label>
              <Textarea
                id="editFurnishingStatusDescription"
                placeholder="Enter furnishing status description"
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
                setSelectedFurnishingStatus(null);
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

