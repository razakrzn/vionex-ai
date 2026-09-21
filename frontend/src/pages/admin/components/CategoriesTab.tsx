import { useState } from "react";
import { Search, Filter, Plus, Edit2, Trash2, Tag } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "../types";

// Mock data - replace with actual API calls
const initialCategories: Category[] = [
  { id: "1", name: "My Space", isMain: true },
  { id: "2", name: "My Drive", isMain: true },
  { id: "3", name: "My Needs", isMain: true },
  { id: "4", name: "Single Space", isMain: false },
  { id: "5", name: "Family Space", isMain: false },
  { id: "6", name: "Camp Space", isMain: false },
];

export const CategoriesTab = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState("");
  const [mainCategoryFilter, setMainCategoryFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", isMain: false });

  const getFilteredCategories = (): Category[] => {
    let filtered = categories;

    // Filter by main category
    if (mainCategoryFilter === "main") {
      filtered = filtered.filter((c) => c.isMain);
    } else if (mainCategoryFilter === "sub") {
      filtered = filtered.filter((c) => !c.isMain);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredCategories = getFilteredCategories();

  const handleAdd = () => {
    setFormData({ name: "", isMain: false });
    setIsAddModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, isMain: category.isMain });
    setIsEditModalOpen(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleSaveAdd = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    const newCategory: Category = {
      id: String(Date.now()),
      name: formData.name.trim(),
      isMain: formData.isMain,
      createdAt: new Date().toISOString(),
    };

    setCategories([...categories, newCategory]);
    setIsAddModalOpen(false);
    setFormData({ name: "", isMain: false });
    toast({
      title: "Success",
      description: "Category added successfully",
    });
  };

  const handleSaveEdit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) return;

    setCategories(
      categories.map((c) =>
        c.id === selectedCategory.id
          ? {
              ...c,
              name: formData.name.trim(),
              isMain: formData.isMain,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    setIsEditModalOpen(false);
    setSelectedCategory(null);
    setFormData({ name: "", isMain: false });
    toast({
      title: "Success",
      description: "Category updated successfully",
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedCategory) return;

    setCategories(categories.filter((c) => c.id !== selectedCategory.id));
    setIsDeleteModalOpen(false);
    setSelectedCategory(null);
    toast({
      title: "Success",
      description: "Category deleted successfully",
    });
  };

  const stats = {
    total: categories.length,
    main: categories.filter((c) => c.isMain).length,
    sub: categories.filter((c) => !c.isMain).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Category Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage categories and subcategories
          </p>
        </div>
        <Button onClick={handleAdd} variant="neon" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Categories</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Tag className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Main Categories</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.main}</p>
            </div>
            <Tag className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sub Categories</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.sub}</p>
            </div>
            <Tag className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
        <Select value={mainCategoryFilter} onValueChange={setMainCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-glass-border">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="main">Main Categories</SelectItem>
            <SelectItem value="sub">Sub Categories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-glass-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-glass-border">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Category Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category, index) => (
                <TableRow key={category.id} className="border-glass-border">
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        category.isMain
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {category.isMain ? "Main" : "Sub"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Category Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category or subcategory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                placeholder="Enter category name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isMain"
                checked={formData.isMain}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isMain: checked as boolean })
                }
              />
              <Label
                htmlFor="isMain"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Main Category
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="neon" onClick={handleSaveAdd}>
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Category Name *</Label>
              <Input
                id="editCategoryName"
                placeholder="Enter category name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted/30 border-glass-border"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editIsMain"
                checked={formData.isMain}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isMain: checked as boolean })
                }
              />
              <Label
                htmlFor="editIsMain"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Main Category
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="neon" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        itemName={selectedCategory?.name}
      />
    </div>
  );
};

