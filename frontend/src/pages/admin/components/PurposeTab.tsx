import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Target, Loader2 } from "lucide-react";
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
import { getPurposesApi, createPurposeApi, updatePurposeApi, type Purpose } from "@/services/admin/myspace";

export const PurposeTab = () => {
  const { toast } = useToast();
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState<Purpose | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load purposes on component mount
  useEffect(() => {
    loadPurposes();
  }, []);

  const loadPurposes = async () => {
    setIsLoading(true);
    try {
      const res: any = await getPurposesApi();

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        setPurposes(responseData.data);
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load purposes",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading purposes:", err);
      toast({
        title: "Error",
        description: "Failed to load purposes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredPurposes = (): Purpose[] => {
    let filtered = purposes;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (purpose) =>
          purpose.name.toLowerCase().includes(query) ||
          purpose.description?.toLowerCase().includes(query) ||
          purpose.slug?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredPurposes = getFilteredPurposes();

  const handleAdd = () => {
    setFormData({ name: "", description: "" });
    setSelectedPurpose(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (purpose: Purpose) => {
    setSelectedPurpose(purpose);
    setFormData({
      name: purpose.name,
      description: purpose.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Purpose name is required",
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

      const res: any = await createPurposeApi(payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Add new item to state directly without reloading
        setPurposes((prev) => [...prev, responseData.data]);
        setIsAddModalOpen(false);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Purpose added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to add purpose",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating purpose:", err);
      toast({
        title: "Error",
        description: "Failed to add purpose. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPurpose) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Purpose name is required",
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

      const res: any = await updatePurposeApi(selectedPurpose.id, payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Update specific item in state directly without reloading
        setPurposes((prev) =>
          prev.map((item) =>
            item.id === selectedPurpose.id ? responseData.data : item
          )
        );
        setIsEditModalOpen(false);
        setSelectedPurpose(null);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Purpose updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update purpose",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating purpose:", err);
      toast({
        title: "Error",
        description: "Failed to update purpose. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: purposes.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Purposes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage real estate purposes
          </p>
        </div>
        <Button onClick={handleAdd} variant="neon" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Purpose
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Purposes</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Target className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purposes..."
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
              {filteredPurposes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No purposes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurposes.map((purpose, index) => (
                  <TableRow key={purpose.id} className="border-glass-border">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{purpose.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {purpose.slug}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {purpose.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(purpose)}
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

      {/* Add Purpose Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Purpose</DialogTitle>
            <DialogDescription>
              Create a new purpose for real estate properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="purposeName">Name *</Label>
              <Input
                id="purposeName"
                placeholder="Enter purpose name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purposeDescription">Description</Label>
              <Textarea
                id="purposeDescription"
                placeholder="Enter purpose description"
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
                "Add Purpose"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Purpose Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Purpose</DialogTitle>
            <DialogDescription>
              Update purpose information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPurposeName">Name *</Label>
              <Input
                id="editPurposeName"
                placeholder="Enter purpose name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPurposeDescription">Description</Label>
              <Textarea
                id="editPurposeDescription"
                placeholder="Enter purpose description"
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
                setSelectedPurpose(null);
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

