import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createOfferApi,
  deleteOfferApi,
  getOffersApi,
  updateOfferApi,
  type OfferItem,
  type OfferPayload,
} from "@/services/admin/offers";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type OfferFormState = {
  role: string;
  price_per_listing: string;
  validity_months: string;
  cashback: string;
};

const emptyForm: OfferFormState = {
  role: "owner",
  price_per_listing: "",
  validity_months: "",
  cashback: "",
};

export const SearchTailTab = () => {
  const { toast } = useToast();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);
  const [formData, setFormData] = useState<OfferFormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<OfferFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OfferItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchOffers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getOffersApi();
      if ("data" in response && response.data?.data) {
        setOffers(response.data.data);
      } else {
        setOffers([]);
        setError("No offers available.");
      }
    } catch (err: any) {
      setOffers([]);
      setError("Failed to load offers.");
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load offers.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [toast]);

  const openCreate = () => {
    setIsEditing(false);
    setEditingOffer(null);
    setFormData({ ...emptyForm });
    setInitialForm(null);
    setIsModalOpen(true);
  };

  const openEdit = (offer: OfferItem) => {
    const payload: OfferFormState = {
      role: offer.role || "owner",
      price_per_listing: offer.price_per_listing || "",
      validity_months: offer.validity_months ? String(offer.validity_months) : "",
      cashback: offer.cashback || "",
    };
    setIsEditing(true);
    setEditingOffer(offer);
    setFormData(payload);
    setInitialForm(payload);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (
      !formData.role ||
      !formData.price_per_listing ||
      !formData.cashback ||
      !formData.validity_months
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    const priceValue = Number(formData.price_per_listing);
    const monthsValue = Number(formData.validity_months);
    const cashbackValue = Number(formData.cashback);

    if (
      !Number.isInteger(priceValue) ||
      !Number.isInteger(monthsValue) ||
      !Number.isInteger(cashbackValue)
    ) {
      toast({
        title: "Invalid values",
        description: "All fields must be integers.",
        variant: "destructive",
      });
      return;
    }

    const payload: OfferPayload = {
      role: formData.role,
      price_per_listing: priceValue,
      validity_months: monthsValue,
      cashback: cashbackValue,
    };

    setIsSaving(true);
    try {
      if (!isEditing) {
        await createOfferApi(payload);
        toast({ title: "Offer created" });
      } else if (editingOffer?.id) {
        const fields: Array<keyof OfferPayload> = [
          "role",
          "price_per_listing",
          "validity_months",
          "cashback",
        ];
        const changedFields = fields.filter((key) => {
          if (key === "validity_months") {
            return String(payload.validity_months) !== String(initialForm?.validity_months);
          }
          return String(payload[key]) !== String(initialForm?.[key]);
        });
        if (changedFields.length === 0) {
          setIsModalOpen(false);
          setIsSaving(false);
          return;
        }
        const method = changedFields.length === fields.length ? "PUT" : "PATCH";
        const updatePayload = changedFields.reduce((acc, key) => {
          acc[key] = payload[key];
          return acc;
        }, {} as Partial<OfferPayload>);
        await updateOfferApi(editingOffer.id, updatePayload, method);
        toast({ title: "Offer updated" });
      }
      setIsModalOpen(false);
      await fetchOffers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save offer.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteOfferApi(deleteTarget.id);
      toast({ title: "Offer deleted" });
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      await fetchOffers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete offer.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading offers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-glass-border bg-card p-6 text-center text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Search Tail</h3>
          <p className="text-xs text-muted-foreground">Offers returned from /offers/.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      <div className="rounded-xl border border-glass-border bg-card overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Price/Listing</th>
                <th className="px-4 py-3">Validity Months</th>
                <th className="px-4 py-3">Cashback</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer, index) => (
                <tr key={offer.id ?? index} className="border-t border-glass-border">
                  <td className="px-4 py-3">{offer.id ?? "-"}</td>
                  <td className="px-4 py-3">{offer.role || "-"}</td>
                  <td className="px-4 py-3">
                    {offer.price_per_listing !== undefined
                      ? String(Math.trunc(Number(offer.price_per_listing)))
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{offer.validity_months ?? "-"}</td>
                  <td className="px-4 py-3">
                    {offer.cashback !== undefined
                      ? String(Math.trunc(Number(offer.cashback)))
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(offer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setDeleteTarget(offer);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No offers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Offer" : "Add Offer"}</DialogTitle>
            <DialogDescription>Fill all required fields.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="gym_owner">Gym Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Price per listing</label>
              <Input
                type="number"
                step={1}
                value={formData.price_per_listing}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price_per_listing: e.target.value }))
                }
                placeholder="150"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Validity months</label>
              <Input
                type="number"
                step={1}
                value={formData.validity_months}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, validity_months: e.target.value }))
                }
                placeholder="2"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Cashback</label>
              <Input
                type="number"
                step={1}
                value={formData.cashback}
                onChange={(e) => setFormData((prev) => ({ ...prev, cashback: e.target.value }))}
                placeholder="15"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Delete Offer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this offer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

