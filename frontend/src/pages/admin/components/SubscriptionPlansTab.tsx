import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Plus, CreditCard, Clock, Edit, FileText, DollarSign } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  getSubscriptionPlansApi,
  createSubscriptionPlanApi,
  updateSubscriptionPlanApi,
  getUserRolesOptionsApi,
  SubscriptionPlan,
  RoleOption,
} from "@/services/admin/subscriptions";

interface FieldErrors {
  name?: string;
  role?: string;
  seller_type?: string;
  price?: string;
  duration_days?: string;
  max_listings?: string;
  currency?: string;
  description?: string;
  offer_percentage?: string;
  is_duration_unlimited?: string;
}

export const SubscriptionPlansTab = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [isLoadingRoleOptions, setIsLoadingRoleOptions] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "", // Gym Owner or owner
    seller_type: "", // INDIVIDUAL, AGENT, COMPANY (only for owner)
    price: "",
    duration_days: "",
    max_listings: "",
    currency: "AED",
    description: "",
    is_offer: false,
    offer_percentage: "",
    is_active: true,
    is_duration_unlimited: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const response = await getSubscriptionPlansApi();

      if (response && "data" in response) {
        const responseData = response.data?.data ?? response.data;
        if (Array.isArray(responseData)) {
          setPlans(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setPlans(responseData.data);
        } else {
          setPlans([]);
        }
      } else {
        setPlans([]);
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans. Please try again.",
        variant: "destructive",
      });
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlans = useMemo(() => {
    let result = plans;

    if (roleFilter !== "all") {
      const normalizedFilter = roleFilter.toUpperCase();
      const isSellerTypeFilter = ["INDIVIDUAL", "AGENT", "COMPANY"].includes(normalizedFilter);
      result = result.filter((plan) => {
        if (isSellerTypeFilter) {
          return (plan.seller_type || "").toUpperCase() === normalizedFilter;
        }
        return plan.role?.toUpperCase() === normalizedFilter;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (plan) =>
          plan.name.toLowerCase().includes(q) ||
          plan.role.toLowerCase().includes(q)
      );
    }

    return result;
  }, [plans, roleFilter, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      seller_type: "",
      price: "",
      duration_days: "",
      max_listings: "",
      currency: "AED",
      description: "",
      is_offer: false,
      offer_percentage: "",
      is_active: true,
      is_duration_unlimited: false,
    });
    setFieldErrors({});
    setEditingPlanId(null);
  };

  const roleBadgeClasses: Record<string, string> = {
    owner: "bg-primary/10 text-primary border-primary/20",
    gym_owner: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    seeker: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  const sellerTypeBadgeClasses: Record<string, string> = {
    INDIVIDUAL: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    AGENT: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    COMPANY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  const normalizeBadge = (value?: string) => value?.trim().toUpperCase() || "";

  const loadRoleOptions = async () => {
    setIsLoadingRoleOptions(true);
    try {
      const response = await getUserRolesOptionsApi();
      if (response && "data" in response) {
        const responseData = response.data?.data ?? response.data;
        if (Array.isArray(responseData)) {
          setRoleOptions(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setRoleOptions(responseData.data);
        } else {
          setRoleOptions([]);
        }
      } else {
        setRoleOptions([]);
      }
    } catch (error) {
      console.error("Error loading role options:", error);
      setRoleOptions([]);
    } finally {
      setIsLoadingRoleOptions(false);
    }
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
    loadRoleOptions();
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setFormData({
      name: plan.name || "",
      role: plan.role || "",
      seller_type: (plan as any).seller_type || "",
      price: String(plan.price || ""),
      duration_days: String(plan.duration_days || ""),
      max_listings: plan.max_listings ? String(plan.max_listings) : "",
      currency: plan.currency || "AED",
      description: plan.description || "",
      is_offer: plan.is_offer || false,
      offer_percentage: plan.offer_percentage ? String(plan.offer_percentage) : "",
      is_active: plan.is_active ?? true,
      is_duration_unlimited: plan.is_duration_unlimited || false,
    });
    setEditingPlanId(plan.id);
    setFieldErrors({});
    setIsAddModalOpen(true);
    loadRoleOptions();
  };

  const handleSubmitPlan = async () => {
    setIsSubmitting(true);
    setFieldErrors({});

    // Client-side validation for all required fields
    const errors: FieldErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.role) {
      errors.role = "Role is required";
    }

    if (formData.role === "owner" && !formData.seller_type) {
      errors.seller_type = "Seller type is required for owner role";
    }

    if (!formData.price || formData.price.trim() === "" || Number(formData.price) <= 0) {
      errors.price = "Price is required and must be greater than 0";
    }

    if (!formData.is_duration_unlimited && (!formData.duration_days || formData.duration_days.trim() === "" || Number(formData.duration_days) <= 0)) {
      errors.duration_days = "Duration is required and must be greater than 0";
    }

    if (!formData.max_listings || formData.max_listings.trim() === "" || Number(formData.max_listings) <= 0) {
      errors.max_listings = "Max listings is required and must be greater than 0";
    }

    if (!formData.currency || formData.currency.trim() === "") {
      errors.currency = "Currency is required";
    }

    if (!formData.description || formData.description.trim() === "") {
      errors.description = "Description is required";
    }

    if (formData.is_offer) {
      if (!formData.offer_percentage || formData.offer_percentage.trim() === "" || Number(formData.offer_percentage) <= 0) {
        errors.offer_percentage = "Offer percentage is required and must be greater than 0";
      }
    }

    // If there are validation errors, set them and stop submission
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        role: formData.role, // Gym Owner or owner
        price: formData.price, // Keep as string for backend
        currency: formData.currency.trim(),
        description: formData.description.trim(),
        is_offer: formData.is_offer,
        is_active: formData.is_active,
      };

      // Priority: if unlimited duration is enabled, only send is_duration_unlimited
      // Otherwise, send duration_days
      if (formData.is_duration_unlimited) {
        payload.is_duration_unlimited = true;
      } else {
        payload.duration_days = Number(formData.duration_days);
      }

      // Add seller_type only if owner is selected
      if (formData.role === "owner" && formData.seller_type) {
        payload.seller_type = formData.seller_type.toUpperCase(); // INDIVIDUAL, AGENT, COMPANY
      }

      // Add max_listings (now required)
      payload.max_listings = Number(formData.max_listings);

      if (formData.is_offer && formData.offer_percentage.trim()) {
        payload.offer_percentage = formData.offer_percentage.trim();
      }

      let response;
      if (editingPlanId) {
        // Update existing plan
        response = await updateSubscriptionPlanApi(editingPlanId, payload);
      } else {
        // Create new plan
        response = await createSubscriptionPlanApi(payload);
      }

      if (response && "data" in response) {
        if (response.status && response.status >= 200 && response.status < 300) {
          toast({
            title: editingPlanId ? "Plan Updated" : "Plan Created",
            description: editingPlanId
              ? "Subscription plan has been updated successfully."
              : "Subscription plan has been created successfully.",
          });
          setIsAddModalOpen(false);
          resetForm();
          await loadPlans();
        } else if (response.status === 400) {
          const data: any = response.data;
          const errors: FieldErrors = {};

          if (data.name && Array.isArray(data.name)) {
            errors.name = data.name.join(" ");
          }
          if (data.role && Array.isArray(data.role)) {
            errors.role = data.role.join(" ");
          }
          if (data.seller_type && Array.isArray(data.seller_type)) {
            errors.seller_type = data.seller_type.join(" ");
          }
          if (data.price && Array.isArray(data.price)) {
            errors.price = data.price.join(" ");
          }
          if (data.duration_days && Array.isArray(data.duration_days)) {
            errors.duration_days = data.duration_days.join(" ");
          }
          if (data.max_listings && Array.isArray(data.max_listings)) {
            errors.max_listings = data.max_listings.join(" ");
          }
          if (data.currency && Array.isArray(data.currency)) {
            errors.currency = data.currency.join(" ");
          }
          if (data.description && Array.isArray(data.description)) {
            errors.description = data.description.join(" ");
          }
          if (data.offer_percentage && Array.isArray(data.offer_percentage)) {
            errors.offer_percentage = data.offer_percentage.join(" ");
          }
          if (data.is_duration_unlimited && Array.isArray(data.is_duration_unlimited)) {
            errors.is_duration_unlimited = data.is_duration_unlimited.join(" ");
          }

          setFieldErrors(errors);

          toast({
            title: "Validation Error",
            description: "Please correct the highlighted fields.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create subscription plan.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      const data = error?.response?.data;
      if (data) {
        const errors: FieldErrors = {};

        if (data.name && Array.isArray(data.name)) {
          errors.name = data.name.join(" ");
        }
        if (data.role && Array.isArray(data.role)) {
          errors.role = data.role.join(" ");
        }
        if (data.seller_type && Array.isArray(data.seller_type)) {
          errors.seller_type = data.seller_type.join(" ");
        }
        if (data.price && Array.isArray(data.price)) {
          errors.price = data.price.join(" ");
        }
        if (data.duration_days && Array.isArray(data.duration_days)) {
          errors.duration_days = data.duration_days.join(" ");
        }
        if (data.max_listings && Array.isArray(data.max_listings)) {
          errors.max_listings = data.max_listings.join(" ");
        }
        if (data.currency && Array.isArray(data.currency)) {
          errors.currency = data.currency.join(" ");
        }
        if (data.description && Array.isArray(data.description)) {
          errors.description = data.description.join(" ");
        }
        if (data.offer_percentage && Array.isArray(data.offer_percentage)) {
          errors.offer_percentage = data.offer_percentage.join(" ");
        }
        if (data.is_duration_unlimited && Array.isArray(data.is_duration_unlimited)) {
          errors.is_duration_unlimited = data.is_duration_unlimited.join(" ");
        }

        setFieldErrors(errors);
      }

      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          (editingPlanId
            ? "Failed to update subscription plan. Please try again."
            : "Failed to create subscription plan. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const value = typeof price === "number" ? price : Number(price);
    if (isNaN(value)) {
      return "-";
    }
    return `${value.toFixed(2)} AED`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Subscription Plans
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscription plans for different roles.
          </p>
        </div>
        <Button variant="neon" onClick={handleOpenAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plan name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-48 bg-muted/30 border-glass-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="AGENT">Agent</SelectItem>
              <SelectItem value="COMPANY">Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-card border border-glass-border rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-card border border-glass-border rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-lg">
                    {plan.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {plan.role && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          roleBadgeClasses[plan.role.toLowerCase()] || "bg-muted/40 text-muted-foreground border-glass-border"
                        }`}
                      >
                        {plan.role}
                      </span>
                    )}
                    {plan.seller_type && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          sellerTypeBadgeClasses[normalizeBadge(plan.seller_type)] ||
                          "bg-muted/40 text-muted-foreground border-glass-border"
                        }`}
                      >
                        {plan.seller_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {plan.is_offer && plan.offer_price !== undefined ? (
                    <>
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(plan.offer_price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(plan.price)}
                    </span>
                  )}
                  {plan.currency && (
                    <span className="text-sm text-muted-foreground">
                      {plan.currency}
                    </span>
                  )}
                  {plan.is_offer && plan.offer_percentage && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {plan.offer_percentage}% OFF
                    </span>
                  )}
                  {plan.is_active === false && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-glass-border">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {plan.is_duration_unlimited 
                        ? "Unlimited duration" 
                        : `${plan.duration_days} days`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>
                      {plan.max_listings === null || plan.max_listings === undefined
                        ? "Unlimited listings"
                        : `Max ${plan.max_listings} listings`}
                    </span>
                  </div>
                  {plan.description && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {plan.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-glass-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPlan(plan)}
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Plan
                </Button>
              </div>
            </div>
          ))}
          {filteredPlans.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No subscription plans found. Try adjusting your search or filters.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (open) {
            loadRoleOptions();
          } else {
            resetForm();
          }
        }}
      >
        <DialogContent className="bg-card border-glass-border max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPlanId ? "Edit Subscription Plan" : "Add New Subscription Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlanId
                ? "Update the subscription plan details."
                : "Create a new subscription plan with role, price, and duration."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="planName">Name *</Label>
              <Input
                id="planName"
                placeholder="Enter plan name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="planRole">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ 
                    ...formData, 
                    role: value,
                    seller_type: "" // Reset seller_type when role changes
                  })
                }
                disabled={isSubmitting || isLoadingRoleOptions}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder={isLoadingRoleOptions ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.id} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.role && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.role}
                </p>
              )}
            </div>
            {formData.role === "owner" && (
              <div className="space-y-2">
                <Label htmlFor="planSellerType">Seller Type *</Label>
                <Select
                  value={formData.seller_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, seller_type: value })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="bg-muted/30 border-glass-border">
                    <SelectValue placeholder="Select seller type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.seller_type && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.seller_type}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="planPrice">Price (AED) *</Label>
              <Input
                id="planPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter price"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
              />
              {fieldErrors.price && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.price}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="planIsOffer">Offer</Label>
                <Switch
                  id="planIsOffer"
                  checked={formData.is_offer}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_offer: checked,
                      offer_percentage: checked ? formData.offer_percentage : "",
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>
              {formData.is_offer && (
                <>
                  <Input
                    id="planOfferPercentage"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter offer percentage"
                    value={formData.offer_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        offer_percentage: e.target.value,
                      })
                    }
                    className="bg-muted/30 border-glass-border"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.offer_percentage && (
                    <p className="text-xs text-destructive mt-1">
                      {fieldErrors.offer_percentage}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="isDurationUnlimited">
                  {formData.is_duration_unlimited ? "Duration" : "Duration (days) *"}
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isDurationUnlimited" className="text-sm font-normal cursor-pointer">
                    Unlimited Duration
                  </Label>
                  <Switch
                    id="isDurationUnlimited"
                    checked={formData.is_duration_unlimited}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_duration_unlimited: checked,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              {!formData.is_duration_unlimited && (
                <>
                  <Input
                    id="planDuration"
                    type="number"
                    min="1"
                    placeholder="Enter duration in days"
                    value={formData.duration_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_days: e.target.value,
                      })
                    }
                    className="bg-muted/30 border-glass-border"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.duration_days && (
                    <p className="text-xs text-destructive mt-1">
                      {fieldErrors.duration_days}
                    </p>
                  )}
                </>
              )}
              {formData.is_duration_unlimited && (
                <p className="text-sm text-muted-foreground">
                  Duration is set to unlimited
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="planMaxListings">Max Listings *</Label>
              <Input
                id="planMaxListings"
                type="number"
                min="1"
                placeholder="Enter maximum number of listings"
                value={formData.max_listings}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_listings: e.target.value,
                  })
                }
                className="bg-muted/30 border-glass-border"
                disabled={isSubmitting}
                required
              />
              {fieldErrors.max_listings && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.max_listings}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="planCurrency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.currency && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.currency}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="planDescription">Description *</Label>
              <Textarea
                id="planDescription"
                placeholder="Enter plan description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-muted/30 border-glass-border min-h-[100px]"
                disabled={isSubmitting}
                required
              />
              {fieldErrors.description && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="planIsActive">Active</Label>
                <Switch
                  id="planIsActive"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_active: checked,
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="neon" onClick={handleSubmitPlan} disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingPlanId
                ? "Update Plan"
                : "Add Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


