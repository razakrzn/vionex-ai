import { useState } from "react";
import { Shield, UserCheck, User as UserIcon, Mail, Phone, Building2, Calendar, MoreVertical, FileText, CheckCircle2, XCircle, Clock, Wallet, Loader2, RefreshCw, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { activateUserApi, deleteUserApi, suspendUserApi } from "@/services/admin/users";
import { adjustWalletApi, getUserWalletApi, UserWalletResponse } from "@/services/admin/wallets";
import { assignSubscriptionApi, cancelSubscriptionApi, getSubscriptionPlansByRoleApi, type SubscriptionPlan } from "@/services/admin/subscriptions";
import type { User, UserStatus, UserRole } from "../types";

interface UserCardProps {
  user: User;
  onDeleted?: (userId: string) => void;
}

export const UserCard = ({ user, onDeleted }: UserCardProps) => {
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [walletData, setWalletData] = useState<UserWalletResponse["data"] | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    amount: "",
    adjustment_type: "credit",
    description: "",
  });
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isSuspended, setIsSuspended] = useState(Boolean(user.is_suspended));
  const [isSubscribed, setIsSubscribed] = useState(Boolean(user.is_subscribed));
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="w-6 h-6 text-primary" />;
      case "buyer":
        return <UserIcon className="w-6 h-6 text-primary" />;
      case "seller":
        return <UserCheck className="w-6 h-6 text-primary" />;
      default:
        return <UserIcon className="w-6 h-6 text-primary" />;
    }
  };

  const getRoleBadge = (role: UserRole, sellerType?: "INDIVIDUAL" | "AGENT" | "COMPANY", roleDisplay?: string, isGymOwner?: boolean) => {
    // For gym owners, show "Fitness" badge (or role_display if provided)
    if (isGymOwner) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
          {roleDisplay || "Fitness"}
        </Badge>
      );
    }
    
    // For sellers, show seller_type instead of role
    if (role === "seller" && sellerType) {
      const sellerTypeColors = {
        INDIVIDUAL: "bg-violet-500/10 text-violet-500 border-violet-500/30",
        AGENT: "bg-blue-500/10 text-blue-500 border-blue-500/30",
        COMPANY: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      };
      const sellerTypeNames = {
        INDIVIDUAL: "Individual",
        AGENT: "Agent",
        COMPANY: "Company",
      };
      return (
        <Badge variant="outline" className={sellerTypeColors[sellerType]}>
          {sellerTypeNames[sellerType]}
        </Badge>
      );
    }

    // For non-sellers or sellers without seller_type, show role
    const colors = {
      admin: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      buyer: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      seller: "bg-violet-500/10 text-violet-500 border-violet-500/30",
    };
    const displayNames = {
      admin: "Admin",
      buyer: "Buyer",
      seller: "Seller",
    };
    return (
      <Badge variant="outline" className={colors[role]}>
        {displayNames[role]}
      </Badge>
    );
  };

  const getStatusBadge = (status: UserStatus, verificationStatus?: "pending" | "approved" | "rejected") => {
    // For gym owners, show verification status if available
    if (verificationStatus) {
      switch (verificationStatus) {
        case "approved":
          return (
            <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Approved
            </Badge>
          );
        case "pending":
          return (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          );
        case "rejected":
          return (
            <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10">
              <XCircle className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
          );
      }
    }
    
    // Default status badges
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-500/50 bg-gray-500/10">
            Inactive
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">
            Suspended
          </Badge>
        );
    }
  };

  const handleStatusChange = (newStatus: UserStatus) => {
    // TODO: Implement API call to update user status

  };

  const handleSuspend = async () => {
    const reason = suspendReason.trim();
    if (!reason) {
      toast({
        title: "Reason required",
        description: "Please enter a reason for suspension.",
        variant: "destructive",
      });
      return;
    }

    setIsSuspending(true);
    try {
      const response = await suspendUserApi(user.id, reason);
      if ("data" in response && "status" in response) {
        toast({
          title: "User suspended",
          description: response.data?.message || "The user has been suspended.",
        });
        setIsSuspended(true);
        setIsSuspendModalOpen(false);
        setSuspendReason("");
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to suspend user.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSuspending(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const response = await activateUserApi(user.id);
      if ("data" in response && "status" in response) {
        toast({
          title: "User activated",
          description: response.data?.message || "The user has been activated.",
        });
        setIsSuspended(false);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to activate user.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    if (!canManageSubscription) return;
    setIsLoadingPlans(true);
    try {
      const role = user.raw_role === "gym_owner" ? "gym_owner" : "owner";
      const sellerType = role === "owner" ? user.seller_type || "INDIVIDUAL" : undefined;
      const response = await getSubscriptionPlansByRoleApi(role, sellerType || undefined);
      if ("data" in response && response.data?.data) {
        // Filter out inactive plans (is_active === false)
        const activePlans = response.data.data.filter((plan: SubscriptionPlan) => plan.is_active !== false);
        setSubscriptionPlans(activePlans);
      } else {
        setSubscriptionPlans([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load subscription plans.",
        variant: "destructive",
      });
      setSubscriptionPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleAssignSubscription = async () => {
    if (!selectedPlanId) {
      toast({
        title: "Select a plan",
        description: "Please select a subscription plan.",
        variant: "destructive",
      });
      return;
    }
    setIsUpdatingSubscription(true);
    try {
      const response = await assignSubscriptionApi({
        user_id: Number(user.id),
        plan_id: Number(selectedPlanId),
      });
      if ("data" in response) {
        toast({
          title: "Subscription added",
          description: response.data?.message || "Subscription assigned successfully.",
        });
        const isActive = response.data?.data?.is_active;
        setIsSubscribed(isActive === undefined ? true : Boolean(isActive));
        setIsSubscriptionModalOpen(false);
        setSelectedPlanId("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to assign subscription.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsUpdatingSubscription(true);
    try {
      const response = await cancelSubscriptionApi({
        user_id: Number(user.id),
      });
      if ("data" in response) {
        toast({
          title: "Subscription removed",
          description: response.data?.message || "Subscription cancelled successfully.",
        });
        const isActive = response.data?.data?.is_active;
        setIsSubscribed(isActive === undefined ? false : Boolean(isActive));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to remove subscription.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await deleteUserApi(user.id);
      if ("data" in response) {
        toast({
          title: "User deleted",
          description: response.data?.message || "User deleted successfully.",
        });
        setIsDeleteModalOpen(false);
        onDeleted?.(String(user.id));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  const canManageWallet = user.role === "seller" && !user.isGymOwner;
  const canManageSubscription = user.raw_role === "owner" || user.raw_role === "gym_owner";

  const formatCurrency = (amount: number | string, currency: string = "AED") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (Number.isNaN(numAmount)) return `${currency} 0.00`;
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-AE", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const fetchWallet = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const response = await getUserWalletApi(Number(user.id));
      if ("data" in response && "status" in response) {
        const responseData = response.data as UserWalletResponse;
        if (responseData?.data) {
          setWalletData(responseData.data);
        } else {
          setWalletError("No wallet data available.");
        }
      } else {
        setWalletError("Failed to fetch wallet information.");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to load wallet information.";
      setWalletError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setWalletLoading(false);
    }
  };

  const handleOpenWallet = () => {
    setIsWalletModalOpen(true);
    fetchWallet();
  };

  const handleAdjustWallet = async () => {
    const amount = adjustForm.amount.trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsAdjusting(true);
    try {
      const response = await adjustWalletApi({
        user_id: Number(user.id),
        amount,
        adjustment_type: adjustForm.adjustment_type as "credit" | "debit",
        description: adjustForm.description.trim(),
      });

      if ("data" in response && "status" in response) {
        toast({
          title: "Success",
          description: "Wallet updated successfully.",
        });
        setIsAdjustModalOpen(false);
        setAdjustForm({ amount: "", adjustment_type: "credit", description: "" });
        fetchWallet();
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to update wallet.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="bg-card border border-glass-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-muted/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {getRoleIcon(user.role)}
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">{user.name}</h3>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isSuspended ? (
                <DropdownMenuItem onClick={handleActivate} disabled={isActivating}>
                  {isActivating ? "Activating..." : "Activate"}
              </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setIsSuspendModalOpen(true)}>
                Suspend
              </DropdownMenuItem>
              )}
              {canManageSubscription && (
                <DropdownMenuItem
                  onClick={() => {
                    if (isSubscribed) {
                      handleCancelSubscription();
                    } else {
                      setIsSubscriptionModalOpen(true);
                      loadSubscriptionPlans();
                    }
                  }}
                  disabled={isUpdatingSubscription}
                >
                  {isSubscribed ? "Remove Subscription" : "Add Subscription"}
                </DropdownMenuItem>
              )}
              {canManageWallet && (
                <DropdownMenuItem onClick={handleOpenWallet}>
                  Wallet
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-destructive">
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {getRoleBadge(user.role, user.seller_type, user.role_display, user.isGymOwner)}
            {getStatusBadge(user.status, user.verification_status)}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground line-clamp-1">{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{user.phone}</span>
        </div>
        {user.company && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.company}</span>
          </div>
        )}
        {user.license_number && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">License: {user.license_number}</span>
          </div>
        )}
        {isSubscribed && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-500">Subscribed</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-glass-border bg-muted/10">
        <div className="text-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Joined</span>
          </div>
          <div className="text-foreground font-medium">{user.joinedDate}</div>
        </div>
        {user.listingCount > 0 && (
          <div className="mt-3 pt-3 border-t border-glass-border">
            <div className="text-sm text-muted-foreground">
              Listings: <span className="font-semibold text-foreground">{user.listingCount}</span>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDelete}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        itemName={user.name}
      />

      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Provide a reason for suspending {user.name}. This is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason</label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSuspendModalOpen(false)}
              disabled={isSuspending}
            >
              Cancel
            </Button>
            <Button onClick={handleSuspend} disabled={isSuspending}>
              {isSuspending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Assign Subscription</DialogTitle>
            <DialogDescription>
              Select a subscription plan for {user.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : subscriptionPlans.length ? (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name} — {plan.price} {plan.currency || "AED"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">No plans found for this user.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscriptionModalOpen(false)} disabled={isUpdatingSubscription}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubscription} disabled={isUpdatingSubscription || !selectedPlanId}>
              {isUpdatingSubscription ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Wallet Details
            </DialogTitle>
            <DialogDescription>
              Wallet balance and transactions for {user.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-glass-border bg-muted/30 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(walletData?.balance || 0, walletData?.currency || "AED")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Transactions: {walletData?.transaction_count ?? 0}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchWallet} disabled={walletLoading}>
                  <RefreshCw className={`h-4 w-4 ${walletLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" onClick={() => setIsAdjustModalOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Point
                </Button>
              </div>
            </div>

            {walletLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!walletLoading && walletError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {walletError}
              </div>
            )}

            {!walletLoading && !walletError && (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {walletData?.transactions && walletData.transactions.length > 0 ? (
                  walletData.transactions.map((transaction) => {
                    const rawType = (transaction.transaction_type || "").toLowerCase();
                    const isCredit = rawType.includes("credit");
                    const amountValue = typeof transaction.amount === "string"
                      ? parseFloat(transaction.amount)
                      : transaction.amount;
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-glass-border bg-muted/20 p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {transaction.description || (isCredit ? "Credit" : "Debit")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                          {(transaction.balance_before !== null || transaction.balance_after !== null) && (
                            <p className="text-xs text-muted-foreground">
                              Balance:{" "}
                              {formatCurrency(transaction.balance_before ?? 0, walletData?.currency || "AED")} →{" "}
                              {formatCurrency(transaction.balance_after ?? 0, walletData?.currency || "AED")}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isCredit ? "text-green-500" : "text-red-500"}`}>
                            {isCredit ? "+" : "-"}
                            {Number.isNaN(amountValue) ? 0 : amountValue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-glass-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent className="bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle>Add Wallet Points</DialogTitle>
            <DialogDescription>
              Credit or debit points for {user.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 40.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Adjustment Type</label>
              <Select
                value={adjustForm.adjustment_type}
                onValueChange={(value) =>
                  setAdjustForm((prev) => ({ ...prev, adjustment_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={adjustForm.description}
                onChange={(e) => setAdjustForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Reason for adjustment"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)} disabled={isAdjusting}>
              Cancel
            </Button>
            <Button onClick={handleAdjustWallet} disabled={isAdjusting}>
              {isAdjusting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

