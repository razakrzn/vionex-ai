import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyCheckoutSessionApi } from "@/services/partner/payments";
import Seo from "@/components/Seo";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    const verifyAndRedirect = async () => {
      if (!sessionId) {
        toast({
          title: "Error",
          description: "Invalid payment session. Please try again.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        // Verify checkout session with backend
        const response = await verifyCheckoutSessionApi(sessionId);
        
        if (response && "data" in response) {
          const responseData = response.data;
          
          if (responseData?.success) {
            setIsVerified(true);
            // Show success toast
            toast({
              title: "Payment Successful",
              description: "Your subscription has been activated successfully!",
            });

            // Navigate to appropriate dashboard based on user role
            const redirectTo = () => {
              if (!user) {
                navigate("/");
                return;
              }

              const userRole = user.role?.toLowerCase();
              
              if (userRole === "owner") {
                navigate("/partner/dashboard");
              } else if (userRole === "gym_owner") {
                navigate("/fitness/dashboard");
              } else {
                navigate("/");
              }
            };

            // Small delay to show success message before redirect
            setTimeout(() => {
              redirectTo();
            }, 1500);
          } else {
            throw new Error(responseData?.message || "Payment verification failed");
          }
        } else {
          throw new Error("Failed to verify payment session");
        }
      } catch (error: any) {
        console.error("Error verifying checkout session:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to verify payment. Please contact support.";
        toast({
          title: "Verification Error",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Redirect to home or dashboard on error
        setTimeout(() => {
          if (user) {
            const userRole = user.role?.toLowerCase();
            if (userRole === "owner") {
              navigate("/partner/dashboard");
            } else if (userRole === "gym_owner") {
              navigate("/fitness/dashboard");
            } else {
              navigate("/");
            }
          } else {
            navigate("/");
          }
        }, 2000);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAndRedirect();
  }, [navigate, user, toast, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Seo
        title="Payment Success"
        description="Payment confirmation for your Vionex AI subscription."
        noIndex
      />
      <div className="text-center space-y-4">
        {isVerifying ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Verifying Payment...</h2>
            <p className="text-muted-foreground">Please wait while we verify your payment.</p>
          </>
        ) : isVerified ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
            <p className="text-muted-foreground">Your subscription has been activated.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting to dashboard...</span>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
            <p className="text-muted-foreground">Please contact support if you have completed the payment.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting...</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;

