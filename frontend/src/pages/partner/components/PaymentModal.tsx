import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPaymentIntentApi } from "@/services/partner/payments";
import { useToast } from "@/hooks/use-toast";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { AxiosError } from "axios";
import base_url from "@/services/base_url";

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
  planId?: number;
  useWalletBalance?: boolean;
}

// Get Stripe publishable key from environment variable
const getStripePublishableKey = () => {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
};


// Test Card Information Component
const TestCardInfo = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>🧪</span>
          <span>Test Card Information</span>
        </span>
        <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && (
        <div className="mt-3 space-y-3 text-xs">
          <div className="p-2 bg-background rounded border">
            <div className="font-semibold text-foreground mb-1">✅ Success Card:</div>
            <div className="text-muted-foreground">
              <div>Card: <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code></div>
              <div>CVV: Any 3 digits (e.g., 123)</div>
              <div>Expiry: Any future date (e.g., 12/25)</div>
            </div>
          </div>
          <div className="p-2 bg-background rounded border">
            <div className="font-semibold text-foreground mb-1">❌ Decline Card:</div>
            <div className="text-muted-foreground">
              <div>Card: <code className="bg-muted px-1 rounded">4000 0000 0000 0002</code></div>
              <div>CVV: Any 3 digits</div>
              <div>Expiry: Any future date</div>
            </div>
          </div>
          <div className="p-2 bg-background rounded border">
            <div className="font-semibold text-foreground mb-1">🔐 3D Secure Card:</div>
            <div className="text-muted-foreground">
              <div>Card: <code className="bg-muted px-1 rounded">4000 0025 0000 3155</code></div>
              <div>CVV: Any 3 digits</div>
              <div>Expiry: Any future date</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Payment Form Component
const PaymentFormContent = ({
  clientSecret,
  amount,
  onPaymentSuccess,
  onClose,
}: {
  clientSecret: string;
  amount: number;
  onPaymentSuccess: () => void;
  onClose: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Payment form is not ready. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // First, submit the elements to validate the form and collect payment method
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        toast({
          title: "Validation Error",
          description: submitError.message || "Please check your payment details.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Then, confirm the payment with the collected payment method
      const confirmResult = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: {
          return_url:`${base_url}/payment-success`,
        },
      });

      const { error, paymentIntent } = confirmResult;

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "Payment could not be processed.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Check if paymentIntent was returned
      if (!paymentIntent) {
        toast({
          title: "Payment Error",
          description: "Payment confirmation did not return a payment intent. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Handle different payment statuses
      switch (paymentIntent.status) {
        case "succeeded":
          toast({
            title: "Payment Successful",
            description: "Your payment has been processed successfully.",
          });
          onPaymentSuccess();
          onClose();
          break;

        case "processing":
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. Please wait...",
          });
          // Keep processing state, payment will complete via webhook
          setIsProcessing(false);
          break;

        case "requires_payment_method":
          toast({
            title: "Payment Method Required",
            description: "Please enter your payment details and try again. Make sure all fields are filled correctly.",
            variant: "destructive",
          });
          setIsProcessing(false);
          break;

        case "requires_action":
          toast({
            title: "Action Required",
            description: "Additional authentication is required. Please complete the verification.",
            variant: "destructive",
          });
          setIsProcessing(false);
          break;

        case "requires_confirmation":
          toast({
            title: "Confirmation Required",
            description: "Payment requires confirmation. Please try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
          break;

        case "canceled":
          toast({
            title: "Payment Canceled",
            description: "The payment was canceled.",
            variant: "destructive",
          });
          setIsProcessing(false);
          break;

        default:
          toast({
            title: "Payment Status",
            description: `Payment status: ${paymentIntent.status}. Please check your payment details.`,
            variant: "default",
          });
          setIsProcessing(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
        <PaymentElement 
          options={{
            layout: "tabs",
            wallets: {
              applePay: "auto",
              googlePay: "auto",
            },
          }}
        />
      </div>
      
      {/* Test Card Information */}
      <TestCardInfo />

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" variant="neon" className="flex-1" disabled={!stripe || !elements || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay {amount} AED
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export const PaymentModal = ({
  isOpen,
  onOpenChange,
  onPaymentSuccess,
  planId,
  useWalletBalance = false,
}: PaymentModalProps) => {
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletSuccessData, setWalletSuccessData] = useState<{
    pointsRedeemed: number;
    walletDiscount: number;
    currency: string;
    planName?: string;
  } | null>(null);

  // Initialize Stripe
  useEffect(() => {
    const stripePublishableKey = getStripePublishableKey();
    if (stripePublishableKey) {
      setStripePromise(loadStripe(stripePublishableKey));
    } else {
      toast({
        title: "Configuration Error",
        description: "Stripe publishable key is not configured.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create payment intent when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const createIntent = async () => {
      if (!planId) {
        toast({
          title: "Error",
          description: "No plan selected. Please select a plan first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await createPaymentIntentApi({ 
          plan_id: planId,
          use_wallet_balance: useWalletBalance,
          auto_renew: false, // Default to false as per requirement
        });

        // Handle different response structures
        let responseData: any = null;
        let responseMeta: any = null;
        
        if (response && "data" in response) {
          responseMeta = response.data;
          if (response.data?.data) {
            responseData = response.data.data;
          } else if (response.data) {
            responseData = response.data;
          }
        }

        const pointsRedeemed = Number(
          responseData?.points_redeemed ?? responseMeta?.data?.points_redeemed ?? 0
        );
        const walletDiscount = Number(
          responseData?.wallet_discount ?? responseMeta?.data?.wallet_discount ?? 0
        );
        const isWalletSuccess =
          responseMeta?.success === true &&
          responseData?.type === "subscription" &&
          (pointsRedeemed > 0 || walletDiscount > 0 || responseData?.amount === 0 || responseMeta?.data?.amount === 0) &&
          !responseData?.checkout_url &&
          !responseData?.client_secret;

        console.log("[PaymentModal] payment response", {
          success: responseMeta?.success,
          type: responseData?.type,
          useWalletBalance,
          pointsRedeemed,
          walletDiscount,
          hasCheckoutUrl: !!responseData?.checkout_url,
          hasClientSecret: !!responseData?.client_secret,
          isWalletSuccess,
        });

        if (isWalletSuccess) {
          setWalletSuccessData({
            pointsRedeemed,
            walletDiscount,
            currency: responseData?.currency || "AED",
            planName: responseData?.plan?.name,
          });
          onPaymentSuccess();
          return;
        }

        // If backend returns a subscription success without a payment session, show wallet success modal
        if (responseMeta?.success === true && responseData?.type === "subscription") {
          setWalletSuccessData({
            pointsRedeemed,
            walletDiscount,
            currency: responseData?.currency || "AED",
            planName: responseData?.plan?.name,
          });
          onPaymentSuccess();
          return;
        }

        // Check if checkout_url exists (new Stripe Checkout flow)
        if (responseData?.checkout_url) {
          // Redirect to Stripe Checkout
          window.location.href = responseData.checkout_url;
          return;
        }

        // Legacy flow: use client_secret for embedded form
        if (responseData?.client_secret && stripePromise) {
          setClientSecret(responseData.client_secret);
          setAmount(responseData.amount || 0);
        } else {
          const errorMessage = responseData?.message || "Failed to create payment session";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          onOpenChange(false);
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to create payment session";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    createIntent();
  }, [isOpen, planId, useWalletBalance, stripePromise, toast, onOpenChange]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setAmount(null);
      setIsLoading(false);
      setWalletSuccessData(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {walletSuccessData ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Subscription Successful
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Required
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {walletSuccessData
              ? "Your subscription has been activated using wallet points."
              : "You need to complete a payment before creating properties."}
          </DialogDescription>
        </DialogHeader>

        {walletSuccessData ? (
          <div className="py-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                Subscription Activated
              </h3>
              <p className="text-sm text-muted-foreground">
                Points redeemed successfully. You can add property now.
              </p>
              {walletSuccessData.planName && (
                <p className="text-sm text-muted-foreground">
                  Plan: <span className="font-medium text-foreground">{walletSuccessData.planName}</span>
                </p>
              )}
            </div>
            <div className="grid gap-2 rounded-lg border border-glass-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Points Redeemed</span>
                <span className="font-semibold text-foreground">
                  {walletSuccessData.pointsRedeemed.toFixed(2)} {walletSuccessData.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Wallet Discount</span>
                <span className="font-semibold text-foreground">
                  {walletSuccessData.walletDiscount.toFixed(2)} {walletSuccessData.currency}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="neon"
              className="w-full"
              onClick={() => {
                setWalletSuccessData(null);
                onOpenChange(false);
              }}
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {amount && (
              <div className="glass rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Amount:</span>
                  <span className="font-display text-xl font-bold text-primary">
                    {amount} AED
                  </span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Creating payment session...</p>
              </div>
            ) : clientSecret && stripePromise && amount ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "hsl(var(--primary))",
                      colorBackground: "hsl(var(--background))",
                      colorText: "hsl(var(--foreground))",
                      colorDanger: "hsl(var(--destructive))",
                      fontFamily: "system-ui, sans-serif",
                      spacingUnit: "4px",
                      borderRadius: "8px",
                    },
                  },
                  locale: "en",
                }}
              >
                <style>{`
                  /* Hide Stripe badge */
                  .StripeElement + div[style*="position: fixed"],
                  div[style*="position: fixed"][style*="bottom"],
                  div[style*="position: fixed"][style*="right"],
                  a[href*="stripe.com"][style*="position: fixed"],
                  iframe[src*="stripe.com"][style*="position: fixed"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                  }
                `}</style>
                <PaymentFormContent
                  clientSecret={clientSecret}
                  amount={amount}
                  onPaymentSuccess={onPaymentSuccess}
                  onClose={() => onOpenChange(false)}
                />
              </Elements>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Failed to initialize payment. Please try again.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

