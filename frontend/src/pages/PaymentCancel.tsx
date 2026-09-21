import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Seo from "@/components/Seo";

const PaymentCancel = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    // Show cancellation toast
    toast({
      title: "Payment Cancelled",
      description: "Your payment was cancelled. You can try again anytime.",
      variant: "default",
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

    // Small delay to show toast before redirect
    const timer = setTimeout(() => {
      redirectTo();
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate, user, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Seo
        title="Payment Cancelled"
        description="Payment was cancelled. You can try again anytime."
        noIndex
      />
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
};

export default PaymentCancel;

