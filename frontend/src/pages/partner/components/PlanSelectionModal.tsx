import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CreditCard, Clock, FileText, Check, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getSubscriptionPlansApi,
  getWalletApi,
  WalletResponse,
  SubscriptionPlan,
} from "@/services/partner/payments";

interface PlanSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanSelected: (plan: SubscriptionPlan, usePoints?: boolean) => Promise<void>;
  sellerType?: "INDIVIDUAL" | "AGENT" | "COMPANY";
  roleFilter?: string; // For gym owners, filter by "Gym Owner" role
}

export const PlanSelectionModal = ({
  isOpen,
  onOpenChange,
  onPlanSelected,
  sellerType,
  roleFilter,
}: PlanSelectionModalProps) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [walletData, setWalletData] = useState<WalletResponse["data"] | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      loadWallet();
      setUsePoints(false); // Reset checkbox when modal opens
      setIsProcessingPayment(false); // Reset processing state when modal opens
      setProcessingPlanId(null);
    }
  }, [isOpen, sellerType, roleFilter]);

  const loadWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const response = await getWalletApi();
      if ('data' in response && 'status' in response) {
        const responseData = response.data as WalletResponse;
        if (responseData?.success && responseData?.data) {
          setWalletData(responseData.data);
        } else if (responseData?.data) {
          setWalletData(responseData.data);
        }
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Calculate points from balance (1 point = 1 AED)
  const getPoints = () => {
    if (!walletData?.balance) return 0;
    const balance = typeof walletData.balance === "string" 
      ? parseFloat(walletData.balance) 
      : walletData.balance;
    return Math.floor(balance); // 1 point = 1 AED
  };

  const hasPoints = getPoints() > 0;

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const response = await getSubscriptionPlansApi();

      if (response && "data" in response) {
        const responseData = response.data?.data ?? response.data;
        let plansArray: SubscriptionPlan[] = [];

        if (Array.isArray(responseData)) {
          plansArray = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          plansArray = responseData.data;
        }

        // Filter plans by role (either sellerType or roleFilter) and active status
        const filteredPlans = plansArray.filter((plan) => {
          const isActive = plan.is_active === true;
          if (roleFilter) {
            // Use roleFilter if provided (for gym owners)
            // Filter by role matching roleFilter
            return plan.role?.toUpperCase() === roleFilter.toUpperCase() && isActive;
          } else if (sellerType) {
            // Use sellerType if provided (for property owners)
            // Filter by role === "owner" AND seller_type matching user's sellerType
            const roleMatches = plan.role?.toUpperCase() === "OWNER";
            const sellerTypeMatches = plan.seller_type?.toUpperCase() === sellerType.toUpperCase();
            return roleMatches && sellerTypeMatches && isActive;
          }
          // If neither provided, show all active plans
          return isActive;
        });

        setPlans(filteredPlans);
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

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (isProcessingPayment) return; // Prevent multiple clicks
    
    setSelectedPlanId(plan.id);
    setIsProcessingPayment(true);
    setProcessingPlanId(plan.id);
    
    try {
      await onPlanSelected(plan, usePoints);
      // onPlanSelected will handle the redirect via window.location.href
      // Keep the loading state active until redirect happens
    } catch (error) {
      setIsProcessingPayment(false);
      setProcessingPlanId(null);
    }
  };

  const formatPrice = (price: string | number, currency?: string) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "-";
    return `${numPrice.toFixed(2)} ${currency || "AED"}`;
  };

  const getDisplayPrice = (plan: SubscriptionPlan) => {
    if (plan.is_offer && plan.offer_price !== undefined) {
      return formatPrice(plan.offer_price, plan.currency);
    }
    return formatPrice(plan.price, plan.currency);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Prevent closing modal when processing payment
        if (!open && isProcessingPayment) {
          return;
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="bg-card border-glass-border max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Select Subscription Plan
          </DialogTitle>
          <DialogDescription>
            Choose a subscription plan to continue.
          </DialogDescription>
        </DialogHeader>

        {/* Points Checkbox - Only show if user has points */}
        {hasPoints && (
          <div className="flex items-center space-x-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <Checkbox
              id="usePoints"
              checked={usePoints}
              onCheckedChange={(checked) => setUsePoints(checked as boolean)}
            />
            <Label 
              htmlFor="usePoints" 
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Wallet className="h-4 w-4 text-primary" />
              Use {getPoints().toLocaleString()} points for this purchase
              <span className="text-xs text-muted-foreground">
                (1 point = 1 {walletData?.currency || "AED"})
              </span>
            </Label>
          </div>
        )}

        {isProcessingPayment ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Initializing Payment Gateway...
            </h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we prepare your payment session.
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">
              Loading plans...
            </p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No subscription plans available for your account type.
            </p>
          </div>
        ) : isProcessingPayment ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Initializing Payment Gateway...
            </h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we prepare your payment session.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-card border rounded-xl p-4 transition-all ${
                  isProcessingPayment
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:border-primary/50"
                } ${
                  selectedPlanId === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-glass-border"
                }`}
                onClick={() => !isProcessingPayment && handleSelectPlan(plan)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-lg">
                      {plan.name}
                    </h3>
                    {selectedPlanId === plan.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {plan.is_offer && plan.offer_price !== undefined ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(plan.price, plan.currency)}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {getDisplayPrice(plan)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {getDisplayPrice(plan)}
                      </span>
                    )}
                    {plan.is_offer && plan.offer_price !== undefined && plan.offer_percentage && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {plan.offer_percentage}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    5% VAT inclusive
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {plan.is_duration_unlimited
                          ? "Unlimited duration"
                          : plan.duration_days
                          ? `${plan.duration_days} days`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>
                        {plan.max_listings === null || plan.max_listings === undefined
                          ? "Unlimited listings"
                          : plan.is_unlimited
                          ? "Unlimited listings"
                          : `Max ${plan.max_listings} listings`}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={selectedPlanId === plan.id ? "neon" : "outline"}
                    className="w-full mt-4"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment && processingPlanId === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : selectedPlanId === plan.id ? (
                      "Selected"
                    ) : (
                      "Select Plan"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

