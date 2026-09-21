import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePartnerStore } from "@/stores/partnerStore";
import { PropertyForm } from "./partner/components/PropertyForm";
import { getMyPropertiesApi, type PartnerProperty } from "@/services/partner/myspace";
import { getPaymentStatusApi, createPaymentIntentApi } from "@/services/partner/payments";
import { useToast } from "@/hooks/use-toast";
import { PartnerHeader } from "./partner/components/PartnerHeader";
import { PartnerSidebar } from "./partner/components/PartnerSidebar";
import { PartnerMobileTabBar } from "./partner/components/PartnerMobileTabBar";
import { PartnerOverviewTab } from "./partner/components/PartnerOverviewTab";
import { PartnerPropertiesTab } from "./partner/components/PartnerPropertiesTab";
import { PartnerRejectedTab } from "./partner/components/PartnerRejectedTab";
import { PartnerWalletTab } from "./partner/components/PartnerWalletTab";
import { PaymentModal } from "./partner/components/PaymentModal";
import { PlanSelectionModal } from "./partner/components/PlanSelectionModal";
import { SubscriptionPlan } from "@/services/partner/payments";
import { getRejectedPropertiesApi } from "@/services/partner/myspace";
import { getCurrentUserMeApi } from "@/services/admin/users";
import { getUnreadCountApi, getNotificationsApi } from "@/services/admin/notifications";
import Seo from "@/components/Seo";

type PartnerTabType = "overview" | "properties" | "rejected" | "sold" | "add-property" | "wallet";

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, user, updateUser, isAuthenticated, tokens } = useAuthStore();
  const { partnerId, clearPartnerInfo } = usePartnerStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<PartnerTabType>("overview");
  const [hasHydrated, setHasHydrated] = useState(false);
  
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
        console.error("[PartnerDashboard] Error checking localStorage:", error);
        setHasHydrated(true); // Continue anyway
      }
    };
    
    checkHydration();
  }, []);

  // Fetch user profile and notifications on dashboard load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Call /users/me/ to get latest user status
        const userResponse = await getCurrentUserMeApi();
        if (userResponse && "data" in userResponse) {
          const responseData = userResponse.data;
          const extractedData = responseData?.data || responseData;
          const fetchedUser = Array.isArray(extractedData) ? extractedData[0] : extractedData;
          
          if (fetchedUser) {
            updateUser(fetchedUser as any);
          }
        }

        // Call notifications unread count and list
        await Promise.all([
          getUnreadCountApi(),
          getNotificationsApi()
        ]);
      } catch (error) {
        console.error("[PartnerDashboard] Error fetching initial data:", error);
      }
    };

    if (isAuthenticated && hasHydrated) {
      fetchInitialData();
    }
  }, [isAuthenticated, hasHydrated, updateUser]);
  
  // Check if user is approved
  const isApproved = user?.verification_status?.toUpperCase() === "APPROVED";
  const [myProperties, setMyProperties] = useState<PartnerProperty[]>([]);
  const [rejectedProperties, setRejectedProperties] = useState<PartnerProperty[]>([]);
  const [soldProperties, setSoldProperties] = useState<PartnerProperty[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isLoadingRejected, setIsLoadingRejected] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPlanSelectionModal, setShowPlanSelectionModal] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const handleLogout = () => {
    logout();
    clearPartnerInfo();
    navigate("/");
  };


  const handlePaymentSuccess = async () => {
    // After successful payment, verify status before allowing property creation
    setIsCheckingPayment(true);
    
    try {
      // Wait a moment for backend to process the payment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check payment status again
      const response = await getPaymentStatusApi();

      if (response && "data" in response) {
        // Extract the nested data property from PaymentStatusResponse
        const responseData = (response.data as any)?.data || response.data;

        if (responseData && typeof responseData === "object" && "can_create_property" in responseData) {
          if (responseData.can_create_property === true) {
            // Payment verified, allow property creation
            setEditingId(null);
            setActiveTab("add-property");
          } else {
            // Payment not yet processed, show message
            toast({
              title: "Payment Processing",
              description: "Payment is being processed. Please wait a moment and try again.",
              variant: "default",
            });
          }
        } else {
          // If structure is unexpected, allow property creation (graceful degradation)
          setEditingId(null);
          setActiveTab("add-property");
        }
      } else {
        // If API call fails, allow property creation (graceful degradation)
        toast({
          title: "Warning",
          description: "Could not verify payment status. Proceeding to property form.",
          variant: "default",
        });
        setEditingId(null);
        setActiveTab("add-property");
      }
    } catch (error) {
      // If API call fails, allow property creation (graceful degradation)
      toast({
        title: "Warning",
        description: "Could not verify payment status. Proceeding to property form.",
        variant: "default",
      });
      setEditingId(null);
      setActiveTab("add-property");
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

  // Fetch my properties from API
  useEffect(() => {
    const loadMyProperties = async () => {
      setIsLoadingProperties(true);
      try {
        const response = await getMyPropertiesApi();

        if ("data" in response && "status" in response) {
          const responseData = response.data?.data ?? response.data;

          let propertiesArray: PartnerProperty[] = [];

          if (Array.isArray(responseData)) {
            propertiesArray = responseData;
          } else if (responseData?.success && Array.isArray(responseData?.data)) {
            propertiesArray = responseData.data;
          }

          setMyProperties(propertiesArray);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load your properties. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProperties(false);
      }
    };

    // Load properties when on overview, properties, or sold tab
    if (activeTab === "overview" || activeTab === "properties" || activeTab === "sold") {
      loadMyProperties();
    }
  }, [activeTab, toast]);

  // Fetch rejected properties from API
  useEffect(() => {
    const loadRejectedProperties = async () => {
      setIsLoadingRejected(true);
      try {
        const response = await getRejectedPropertiesApi();

        if ("data" in response && "status" in response) {
          const responseData = response.data?.data ?? response.data;

          let propertiesArray: PartnerProperty[] = [];

          if (Array.isArray(responseData)) {
            propertiesArray = responseData;
          } else if (responseData?.success && Array.isArray(responseData?.data)) {
            propertiesArray = responseData.data;
          }

          setRejectedProperties(propertiesArray);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load rejected properties. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingRejected(false);
      }
    };

    // Load rejected properties when on rejected tab
    if (activeTab === "rejected") {
      loadRejectedProperties();
    }
  }, [activeTab, toast]);

  // Function to load rejected properties (can be called manually from event listener)
  const loadRejectedPropertiesManual = async () => {
    setIsLoadingRejected(true);
    try {
      const response = await getRejectedPropertiesApi();

      if ("data" in response && "status" in response) {
        const responseData = response.data?.data ?? response.data;
        let propertiesArray: PartnerProperty[] = [];

        if (Array.isArray(responseData)) {
          propertiesArray = responseData;
        } else if (responseData?.success && Array.isArray(responseData?.data)) {
          propertiesArray = responseData.data;
        }

        setRejectedProperties(propertiesArray);
      }
    } catch (error) {
    } finally {
      setIsLoadingRejected(false);
    }
  };

  // Listen for property notification events to auto-refresh rejected properties
  useEffect(() => {
    const handlePropertyNotification = () => {
      loadRejectedPropertiesManual();
      // Also refresh my properties to update counts
      const loadMyProperties = async () => {
        setIsLoadingProperties(true);
        try {
          const response = await getMyPropertiesApi();
          if ("data" in response && "status" in response) {
            const responseData = response.data?.data ?? response.data;
            let propertiesArray: PartnerProperty[] = [];
            if (Array.isArray(responseData)) {
              propertiesArray = responseData;
            } else if (responseData?.success && Array.isArray(responseData?.data)) {
              propertiesArray = responseData.data;
            }
            setMyProperties(propertiesArray);
          }
        } catch (error) {
        } finally {
          setIsLoadingProperties(false);
        }
      };
      loadMyProperties();
    };

    window.addEventListener("propertyNotificationReceived", handlePropertyNotification);
    return () => {
      window.removeEventListener("propertyNotificationReceived", handlePropertyNotification);
    };
  }, []);

  // Fetch sold properties from API
  useEffect(() => {
    const loadSoldProperties = async () => {
      if (activeTab === "sold") {
        setIsLoadingProperties(true);
        try {
          const response = await getMyPropertiesApi("sold");

          if ("data" in response && "status" in response) {
            const responseData = response.data;

            let propertiesArray: PartnerProperty[] = [];

            // Handle different response structures
            if (responseData?.success && Array.isArray(responseData?.data)) {
              // Structure: { success: true, data: [...] }
              propertiesArray = responseData.data;
            } else if (Array.isArray(responseData?.data)) {
              // Structure: { data: [...] }
              propertiesArray = responseData.data;
            } else if (Array.isArray(responseData)) {
              // Direct array
              propertiesArray = responseData;
            }

            setSoldProperties(propertiesArray);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load sold properties. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingProperties(false);
        }
      }
    };

    loadSoldProperties();
  }, [activeTab, toast]);

  const stats = {
    total: myProperties.length,
    pending: myProperties.filter((p) => !p.is_approved).length,
    approved: myProperties.filter((p) => p.is_approved).length,
    rejected: rejectedProperties.length,
    sold: soldProperties.length,
  };

  const handleAddProperty = async () => {
    // Check payment status before opening form
    setIsCheckingPayment(true);
    try {
      const response = await getPaymentStatusApi();

      if (response && "data" in response) {
        // Extract the nested data property from PaymentStatusResponse
        const responseData = (response.data as any)?.data || response.data;

        if (responseData && typeof responseData === "object") {
          // Check if user has active subscription but reached listing limit
          if (
            responseData.type === "subscription" &&
            responseData.subscription &&
            responseData.subscription.is_active === true &&
            responseData.subscription.can_create_listing === false
          ) {
            // User has active subscription but reached limit
            const usageInfo = responseData.subscription.usage_info;
            const message = usageInfo && usageInfo.remaining === 0
              ? `You have used all ${usageInfo.max_listings} listings from your subscription. Please wait for your properties to be approved before creating more listings. You can subscribe again after your properties are processed.`
              : responseData.message || "You have reached your listing limit. Please wait for your properties to be approved before creating more listings.";
            
            toast({
              title: "Properties Pending",
              description: message,
              variant: "default",
            });
            setIsCheckingPayment(false);
            return;
          }

          // Check can_create_property or can_create_listing
          const canCreate = responseData.can_create_property === true || 
                          (responseData.subscription && responseData.subscription.can_create_listing === true);

          if (canCreate) {
            // Allow property creation
            setEditingId(null);
            setActiveTab("add-property");
          } else {
            // Show plan selection modal
            setShowPlanSelectionModal(true);
          }
        } else {
          // If structure is unexpected, allow property creation
          setEditingId(null);
          setActiveTab("add-property");
        }
      } else {
        // If API call fails, allow property creation (graceful degradation)
        setEditingId(null);
        setActiveTab("add-property");
      }
    } catch (error) {
      // If API call fails, allow property creation (graceful degradation)
      toast({
        title: "Warning",
        description: "Could not verify payment status. Proceeding to property form.",
        variant: "default",
      });
      setEditingId(null);
      setActiveTab("add-property");
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

      if (isWalletSuccess) {
        toast({
          title: "Subscription Activated",
          description: "Points redeemed successfully. You can add property now.",
        });
        setShowPlanSelectionModal(false);
        await handlePaymentSuccess();
        return;
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

  const getSellerType = (): "INDIVIDUAL" | "AGENT" | "COMPANY" => {
    const sellerType = user?.seller_type?.toUpperCase();
    if (sellerType === "AGENT") return "AGENT";
    if (sellerType === "COMPANY") return "COMPANY";
    return "INDIVIDUAL"; // Default to INDIVIDUAL
  };

  const handleEditProperty = (propertyId: number) => {
    setEditingId(propertyId);
    setActiveTab("add-property");
  };

  const handleFormSuccess = () => {
    setShowSuccessModal(true);
    // Navigate to my properties tab after a short delay
    setTimeout(() => {
      setActiveTab("properties");
      setShowSuccessModal(false);
    }, 2000);
  };

  const handleFormCancel = () => {
    setEditingId(null);
    setActiveTab("properties");
  };

  // Handle tab change with payment check for "add-property" tab
  const handleTabChange = async (tab: PartnerTabType) => {
    if (tab === "add-property") {
      // Check if user is approved
      if (!isApproved) {
        toast({
          title: "Access Restricted",
          description: "You need to be approved before you can add properties. Please wait for admin approval.",
          variant: "destructive",
        });
        return;
      }
      // Use the same payment check as the overview button
      await handleAddProperty();
    } else {
      setActiveTab(tab);
    }
  };

  // Success Modal
  if (showSuccessModal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-pulse" />
            <div className="relative w-full h-full bg-gradient-neon rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-foreground">
              {editingId ? "Updated" : "Submitted"} for <span className="text-primary neon-text">Review!</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your property has been {editingId ? "updated" : "submitted"} and is pending admin review.
              You'll be notified once it's approved and goes live.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Form Tab
  if (activeTab === "add-property") {
    return (
      <div className="min-h-screen bg-white dark:bg-background">
        <PartnerHeader onLogout={handleLogout} />
        <main className="pt-6 pb-12 px-4 bg-white dark:bg-background">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleFormCancel}
              className="mb-6"
            >
              {/* <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard */}
            </Button>
            <PropertyForm
              propertyId={editingId || undefined}
              onCancel={handleFormCancel}
              onSuccess={handleFormSuccess}
            />
          </div>
        </main>
      </div>
    );
  }

  // Main Dashboard with Tabs
  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <Seo
        title="Partner Dashboard"
        description="Manage listings, subscriptions, and account settings for your Vionex AI partner profile."
        noIndex
      />
      <PartnerHeader onLogout={handleLogout} />
      <PartnerSidebar activeTab={activeTab} onTabChange={handleTabChange} stats={stats} />
      <PartnerMobileTabBar activeTab={activeTab} onTabChange={handleTabChange} stats={stats} />

      <main className="pt-24 lg:pt-20 lg:pl-64 pb-20 lg:pb-12 bg-white dark:bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          {activeTab === "overview" ? (
            <PartnerOverviewTab
              stats={stats}
              properties={myProperties}
              onAddProperty={handleAddProperty}
              onViewProperties={() => setActiveTab("properties")}
              onViewPending={() => {
                setActiveTab("properties");
                // You can add filtering logic here if needed
              }}
              onViewApproved={() => {
                setActiveTab("properties");
                // You can add filtering logic here if needed
              }}
              onEditProperty={handleEditProperty}
              isApproved={isApproved}
            />
          ) : activeTab === "properties" ? (
            <PartnerPropertiesTab
              properties={myProperties}
              isLoading={isLoadingProperties}
              onEdit={handleEditProperty}
              onAddProperty={handleAddProperty}
              isApproved={isApproved}
              onPropertyUpdate={() => {
                // Refresh properties list
                const loadMyProperties = async () => {
                  setIsLoadingProperties(true);
                  try {
                    const response = await getMyPropertiesApi();
                    if ("data" in response && "status" in response) {
                      const responseData = response.data?.data ?? response.data;
                      let propertiesArray: PartnerProperty[] = [];
                      if (Array.isArray(responseData)) {
                        propertiesArray = responseData;
                      } else if (responseData?.success && Array.isArray(responseData?.data)) {
                        propertiesArray = responseData.data;
                      }
                      setMyProperties(propertiesArray);
                    }
                  } catch (error) {
                  } finally {
                    setIsLoadingProperties(false);
                  }
                };
                loadMyProperties();
              }}
            />
          ) : activeTab === "sold" ? (
            <PartnerPropertiesTab
              properties={soldProperties}
              isLoading={isLoadingProperties}
              onEdit={handleEditProperty}
              onAddProperty={handleAddProperty}
              isApproved={isApproved}
              onPropertyUpdate={() => {
                // Refresh sold properties list
                const loadSoldProperties = async () => {
                  setIsLoadingProperties(true);
                  try {
                    const response = await getMyPropertiesApi("sold");
                    if ("data" in response && "status" in response) {
                      const responseData = response.data;
                      let propertiesArray: PartnerProperty[] = [];
                      if (responseData?.success && Array.isArray(responseData?.data)) {
                        propertiesArray = responseData.data;
                      } else if (Array.isArray(responseData?.data)) {
                        propertiesArray = responseData.data;
                      } else if (Array.isArray(responseData)) {
                        propertiesArray = responseData;
                      }
                      setSoldProperties(propertiesArray);
                    }
                  } catch (error) {
                  } finally {
                    setIsLoadingProperties(false);
                  }
                };
                loadSoldProperties();
              }}
            />
          ) : activeTab === "rejected" ? (
            <PartnerRejectedTab
              properties={rejectedProperties}
              isLoading={isLoadingRejected}
              onEdit={handleEditProperty}
            />
          ) : activeTab === "wallet" ? (
            <PartnerWalletTab />
          ) : null}
        </div>
      </main>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanSelectionModal}
        onOpenChange={setShowPlanSelectionModal}
        onPlanSelected={handlePlanSelected}
        sellerType={getSellerType()}
      />

    </div>
  );
};

export default PartnerDashboard;
