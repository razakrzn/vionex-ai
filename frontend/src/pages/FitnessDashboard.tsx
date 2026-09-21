import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserMeApi } from "@/services/admin/users";
import { getUnreadCountApi, getNotificationsApi } from "@/services/admin/notifications";
import { FitnessHeader } from "./fitness/components/FitnessHeader";
import { FitnessSidebar } from "./fitness/components/FitnessSidebar";
import { FitnessMobileTabBar } from "./fitness/components/FitnessMobileTabBar";
import { FitnessOverviewTab } from "./fitness/components/FitnessOverviewTab";
import { AddGymModal } from "./fitness/components/AddGymModal";
import { GymsTab } from "./fitness/components/GymsTab";
import { getGymsApi } from "@/services/admin/fitness";
import { getPaymentStatusApi, createPaymentIntentApi } from "@/services/partner/payments";
import { PlanSelectionModal } from "./partner/components/PlanSelectionModal";
import { SubscriptionPlan } from "@/services/partner/payments";
import Seo from "@/components/Seo";

type FitnessTabType = "overview" | "gyms";

const FitnessDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, user, updateUser, isAuthenticated, tokens } = useAuthStore();
  const { toast } = useToast();
  
  // Debug log on mount
  useEffect(() => {








  }, []);

  // Check if Zustand store has been hydrated from localStorage
  useEffect(() => {
    // Check localStorage directly to see if auth data exists
    const checkHydration = () => {
      try {
        const stored = localStorage.getItem("auth-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          const hasAuthData = parsed?.state?.user && parsed?.state?.tokens;


        }
        // Give Zustand a moment to hydrate
        setTimeout(() => {
          setHasHydrated(true);

        }, 150);
      } catch (error) {
        console.error("[FitnessDashboard] Error checking localStorage:", error);
        setHasHydrated(true); // Continue anyway
      }
    };
    
    checkHydration();
  }, []);

  const [activeTab, setActiveTab] = useState<FitnessTabType>("overview");
  
  // Derive isApproved directly from user in store to make it reactive
  const isApproved = user?.verification_status?.toUpperCase() === "APPROVED";
  
  // Debug log for approval status
  useEffect(() => {
    if (user) {
      console.log("[FitnessDashboard] User verification status:", user.verification_status, "isApproved:", isApproved);
    }
  }, [user?.verification_status, isApproved]);

  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAddGymModalOpen, setIsAddGymModalOpen] = useState(false);
  const [showPlanSelectionModal, setShowPlanSelectionModal] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  
  // Stats (will be populated from API)
  const [stats, setStats] = useState({
    totalGyms: 0,
    approvedGyms: 0,
    pendingGyms: 0,
    rejectedGyms: 0,
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleTabChange = (tab: FitnessTabType) => {
    setActiveTab(tab);
  };

  const handleAddGym = async () => {
    // Check payment status before opening form
    setIsCheckingPayment(true);
    try {
      const response = await getPaymentStatusApi();

      if (response && "data" in response) {
        // Extract the nested data property from PaymentStatusResponse
        const responseData = (response.data as any)?.data || response.data;

        if (responseData && typeof responseData === "object") {
          // Check can_add_gym - this is the specific field for gym creation
          const canAddGym = responseData.can_add_gym === true;

          if (canAddGym) {
            // Allow gym creation
            setIsAddGymModalOpen(true);
          } else {
            // Show plan selection modal
            setShowPlanSelectionModal(true);
          }
        } else {
          // If structure is unexpected, allow gym creation
          setIsAddGymModalOpen(true);
        }
      } else {
        // If API call fails, allow gym creation (graceful degradation)
        setIsAddGymModalOpen(true);
      }
    } catch (error) {
      // If API call fails, allow gym creation (graceful degradation)
      toast({
        title: "Warning",
        description: "Could not verify payment status. Proceeding to gym form.",
        variant: "default",
      });
      setIsAddGymModalOpen(true);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handlePlanSelected = async (plan: SubscriptionPlan, usePoints?: boolean) => {
    // Don't close modal yet - let it show loading state
    setIsCheckingPayment(true);
    
    try {
      const response = await createPaymentIntentApi({ 
        plan_id: plan.id,
        use_wallet_balance: usePoints || false,
        auto_renew: false,
      });

      // Handle different response structures
      let responseData: any = null;
      
      if (response && "data" in response) {
        if (response.data?.data) {
          responseData = response.data.data;
        } else if (response.data) {
          responseData = response.data;
        }
      }

      // Check if checkout_url exists (Stripe Checkout flow)
      if (responseData?.checkout_url) {
        // Small delay to ensure loading state is visible
        await new Promise(resolve => setTimeout(resolve, 300));
        // Redirect to Stripe Checkout
        window.location.href = responseData.checkout_url;
        return;
      }

      // If no checkout_url, show error and close modal
      toast({
        title: "Error",
        description: responseData?.message || "Failed to create payment session. Please try again.",
        variant: "destructive",
      });
      setShowPlanSelectionModal(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create payment session. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setShowPlanSelectionModal(false);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // After successful payment, verify status before allowing gym creation
    setIsCheckingPayment(true);
    
    try {
      // Wait a moment for backend to process the payment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check payment status again
      const response = await getPaymentStatusApi();

      if (response && "data" in response) {
        // Extract the nested data property from PaymentStatusResponse
        const responseData = (response.data as any)?.data || response.data;

        if (responseData && typeof responseData === "object" && "can_add_gym" in responseData) {
          if (responseData.can_add_gym === true) {
            // Payment verified, allow gym creation
            setIsAddGymModalOpen(true);
          } else {
            // Payment not yet processed, show message
            toast({
              title: "Payment Processing",
              description: "Payment is being processed. Please wait a moment and try again.",
              variant: "default",
            });
          }
        } else {
          // If structure is unexpected, allow gym creation (graceful degradation)
          setIsAddGymModalOpen(true);
        }
      } else {
        // If API call fails, allow gym creation (graceful degradation)
        toast({
          title: "Warning",
          description: "Could not verify payment status. Proceeding to gym form.",
          variant: "default",
        });
        setIsAddGymModalOpen(true);
      }
    } catch (error) {
      // If API call fails, allow gym creation (graceful degradation)
      toast({
        title: "Warning",
        description: "Could not verify payment status. Proceeding to gym form.",
        variant: "default",
      });
      setIsAddGymModalOpen(true);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Check for payment success from Stripe Checkout redirect
  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const sessionId = searchParams.get("session_id");
    
    if (paymentSuccess === "true" || sessionId) {
      // Remove query params
      setSearchParams({});
      
      // Show success message
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated successfully!",
      });
      
      // Refresh payment status
      handlePaymentSuccess();
    }
  }, [searchParams, setSearchParams, toast]);

  // Fetch user data from /users/me/ to get latest verification_status
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async () => {
      if (!isAuthenticated || !hasHydrated) return;
      
      setIsLoadingUser(true);
      try {
        const response = await getCurrentUserMeApi();
        if (!isMounted) return;
        
        if (response && 'data' in response && 'status' in response) {
          const responseData = response.data;
          const extractedData = responseData?.data || responseData;
          const fetchedUserData = Array.isArray(extractedData) ? extractedData[0] : extractedData;

          if (fetchedUserData) {
            // Keep store updated, but approval is derived from store directly
            updateUser(fetchedUserData as any);
          }
        }

        // Call notifications unread count and list
        await Promise.all([
          getUnreadCountApi(),
          getNotificationsApi()
        ]);
      } catch (error) {
        if (!isMounted) return;
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, hasHydrated, updateUser]);

  // Approval status is derived from API response only.

  // Fetch gyms to calculate real stats
  useEffect(() => {
    const fetchGymsStats = async () => {
      try {
        const response = await getGymsApi();
        if ('data' in response && 'status' in response) {
          const responseData = response.data;
          if (responseData?.success && Array.isArray(responseData?.data)) {
            const gyms = responseData.data;
            setStats({
              totalGyms: gyms.length,
              approvedGyms: gyms.filter((g: any) => g.is_approved === true).length,
              pendingGyms: gyms.filter((g: any) => g.is_approved === false && (g.rejection_note === null || g.rejection_note === undefined)).length,
              rejectedGyms: gyms.filter((g: any) => g.is_approved === false && g.rejection_note !== null && g.rejection_note !== undefined).length,
            });
          }
        }
      } catch (error) {
      }
    };

    if (user && user.role === "gym_owner") {
      fetchGymsStats();
    }
  }, [user]);

  // Redirect if not gym_owner - but only after user data is loaded AND store is hydrated
  useEffect(() => {
    // Don't run redirect logic until hydration is complete
    if (!hasHydrated) {

      return;
    }




    // Don't redirect if still loading user data
    if (isLoadingUser) {

      return;
    }
    
    // Only check if user data is available
    if (user) {
      if (user.role !== "gym_owner") {
        console.warn("[FitnessDashboard] Access Denied - User role is not gym_owner");
        console.warn("[FitnessDashboard] User role:", user.role);
        console.warn("[FitnessDashboard] Redirecting to home page");
        toast({
          title: "Access Denied",
          description: "This dashboard is only for gym owners.",
          variant: "destructive",
        });
        navigate("/");
      } else {

      }
    } else if (!isLoadingUser) {
      // Check localStorage one more time before redirecting
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.user) {

            return; // Wait for next render when store is hydrated
          }
        } catch (e) {
          // Continue with redirect
        }
      }
      // If user is null and not loading, redirect to home (not authenticated)
      console.warn("[FitnessDashboard] User is null and not loading - redirecting to home");
      console.warn("[FitnessDashboard] Reason: User not authenticated");
      navigate("/");
    }
  }, [user, isLoadingUser, navigate, toast, hasHydrated]);

  // Loading state - wait for hydration before showing loading
  if (!hasHydrated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Main Dashboard with Tabs
  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <Seo
        title="Fitness Dashboard"
        description="Manage gyms, subscriptions, and performance insights in your Vionex AI fitness dashboard."
        noIndex
      />
      <FitnessHeader onLogout={handleLogout} />
      <FitnessSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        stats={stats} 
        isApproved={isApproved}
        onAddGym={handleAddGym}
      />
      <FitnessMobileTabBar activeTab={activeTab} onTabChange={handleTabChange} stats={stats} />

      <main className="pt-24 lg:pt-20 lg:pl-64 pb-12 bg-white dark:bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          {activeTab === "overview" ? (
            <FitnessOverviewTab 
              stats={stats} 
              isApproved={isApproved}
              onAddGym={handleAddGym}
            />
          ) : activeTab === "gyms" ? (
            <GymsTab
              isApproved={isApproved}
              onAddGym={handleAddGym}
              onGymAdded={() => {
                // Refresh gyms list will be handled by GymsTab's useEffect
                // Also refresh stats
                const fetchGymsStats = async () => {
                  try {
                    const response = await getGymsApi();
                    if ('data' in response && 'status' in response) {
                      const responseData = response.data;
                      if (responseData?.success && Array.isArray(responseData?.data)) {
                        const gyms = responseData.data;
                        setStats({
                          totalGyms: gyms.length,
                          approvedGyms: gyms.filter((g: any) => g.is_approved === true).length,
                          pendingGyms: gyms.filter((g: any) => g.is_approved === false && (g.rejection_note === null || g.rejection_note === undefined)).length,
                          rejectedGyms: gyms.filter((g: any) => g.is_approved === false && g.rejection_note !== null && g.rejection_note !== undefined).length,
                        });
                      }
                    }
                  } catch (error) {
                  }
                };
                fetchGymsStats();
              }}
            />
          ) : null}
        </div>
      </main>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanSelectionModal}
        onOpenChange={setShowPlanSelectionModal}
        onPlanSelected={handlePlanSelected}
        roleFilter="gym_owner"
      />


      {/* Add Gym Modal */}
      <AddGymModal
        isOpen={isAddGymModalOpen}
        onOpenChange={(open) => {
          setIsAddGymModalOpen(open);
        }}
        onSuccess={() => {
          // Refresh gyms list
          if (activeTab === "gyms") {
            // Trigger refresh by updating a key or calling refresh
            window.dispatchEvent(new Event("gymAdded"));
          }
          // Refresh stats from API
          const fetchGymsStats = async () => {
            try {
              const response = await getGymsApi();
              if ('data' in response && 'status' in response) {
                const responseData = response.data;
                if (responseData?.success && Array.isArray(responseData?.data)) {
                  const gyms = responseData.data;
                  setStats({
                    totalGyms: gyms.length,
                    approvedGyms: gyms.filter((g: any) => g.is_approved === true).length,
                    pendingGyms: gyms.filter((g: any) => g.is_approved === false && (g.rejection_note === null || g.rejection_note === undefined)).length,
                    rejectedGyms: gyms.filter((g: any) => g.is_approved === false && g.rejection_note !== null && g.rejection_note !== undefined).length,
                  });
                }
              }
            } catch (error) {
            }
          };
          fetchGymsStats();
        }}
      />
    </div>
  );
};

export default FitnessDashboard;

