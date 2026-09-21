import { useState, useEffect } from "react";
import { Search, Plus, Edit2, CheckCircle, Loader2 } from "lucide-react";
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
  getCompletionStatusesApi,
  createCompletionStatusApi,
  updateCompletionStatusApi,
  type CompletionStatus,
} from "@/services/admin/myspace";

export const CompletionStatusTab = () => {
  const { toast } = useToast();
  const [completionStatuses, setCompletionStatuses] = useState<CompletionStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompletionStatus, setSelectedCompletionStatus] = useState<CompletionStatus | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load completion statuses on component mount
  useEffect(() => {
    loadCompletionStatuses();
  }, []);

  const loadCompletionStatuses = async () => {
    setIsLoading(true);
    try {
      const res: any = await getCompletionStatusesApi();

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        setCompletionStatuses(responseData.data);
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load completion statuses",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error loading completion statuses:", err);
      toast({
        title: "Error",
        description: "Failed to load completion statuses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredCompletionStatuses = (): CompletionStatus[] => {
    let filtered = completionStatuses;

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

  const filteredCompletionStatuses = getFilteredCompletionStatuses();

  const handleAdd = () => {
    setFormData({ name: "", description: "" });
    setSelectedCompletionStatus(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (completionStatus: CompletionStatus) => {
    setSelectedCompletionStatus(completionStatus);
    setFormData({
      name: completionStatus.name,
      description: completionStatus.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Completion status name is required",
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

      const res: any = await createCompletionStatusApi(payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Add new item to state directly without reloading
        setCompletionStatuses((prev) => [...prev, responseData.data]);
        setIsAddModalOpen(false);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Completion status added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to add completion status",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating completion status:", err);
      toast({
        title: "Error",
        description: "Failed to add completion status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedCompletionStatus) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Completion status name is required",
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

      const res: any = await updateCompletionStatusApi(selectedCompletionStatus.id, payload);

      const responseData = res?.data ?? res;

      if (responseData?.success && responseData?.data) {
        // Update specific item in state directly without reloading
        setCompletionStatuses((prev) =>
          prev.map((item) =>
            item.id === selectedCompletionStatus.id ? responseData.data : item
          )
        );
        setIsEditModalOpen(false);
        setSelectedCompletionStatus(null);
        setFormData({ name: "", description: "" });
        toast({
          title: "Success",
          description: "Completion status updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update completion status",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating completion status:", err);
      toast({
        title: "Error",
        description: "Failed to update completion status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: completionStatuses.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Completion Statuses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage real estate completion statuses
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
              <p className="text-sm text-muted-foreground">Total Completion Statuses</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search completion statuses..."
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
              {filteredCompletionStatuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No completion statuses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompletionStatuses.map((status, index) => (
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

      {/* Add Completion Status Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Completion Status</DialogTitle>
            <DialogDescription>
              Create a new completion status for real estate properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="completionStatusName">Name *</Label>
              <Input
                id="completionStatusName"
                placeholder="Enter completion status name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completionStatusDescription">Description</Label>
              <Textarea
                id="completionStatusDescription"
                placeholder="Enter completion status description"
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

      {/* Edit Completion Status Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Completion Status</DialogTitle>
            <DialogDescription>
              Update completion status information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCompletionStatusName">Name *</Label>
              <Input
                id="editCompletionStatusName"
                placeholder="Enter completion status name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCompletionStatusDescription">Description</Label>
              <Textarea
                id="editCompletionStatusDescription"
                placeholder="Enter completion status description"
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
                setSelectedCompletionStatus(null);
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

