import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { listingsStore, Listing, ListingStatus } from "@/stores/listingsStore";
import { sellersStore } from "@/stores/sellersStore";
import { useAuthStore } from "@/stores/authStore";
import { useAdminStore } from "@/stores/adminStore";
import { LayoutDashboard, Clock, CheckCircle2, XCircle, FileText, Users, UserCheck, UserCog, Tag, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "./admin/components/AdminHeader.tsx";
import { AdminSidebar } from "./admin/components/AdminSidebar.tsx";
import { MobileTabBar } from "./admin/components/MobileTabBar.tsx";
import { OverviewTab } from "./admin/components/OverviewTab.tsx";
import { ListingsTab } from "./admin/components/ListingsTab.tsx";
import { SellersTab } from "./admin/components/SellersTab.tsx";
import { UsersTab } from "./admin/components/UsersTab.tsx";
import { ReviewSellersTab } from "./admin/components/ReviewSellersTab.tsx";
import { ReviewModal } from "./admin/components/ReviewModal.tsx";
import { CategoriesTab } from "./admin/components/CategoriesTab.tsx";
import { CountriesTab } from "./admin/components/CountriesTab.tsx";
import { AssetTypesTab } from "./admin/components/AssetTypesTab.tsx";
import { PropertyTypesTab } from "./admin/components/PropertyTypesTab.tsx";
import { PurposeTab } from "./admin/components/PurposeTab.tsx";
import { FurnishingStatusTab } from "./admin/components/FurnishingStatusTab.tsx";
import { CompletionStatusTab } from "./admin/components/CompletionStatusTab.tsx";
import { AmenitiesTab } from "./admin/components/AmenitiesTab.tsx";
import { OccupantTypesTab } from "./admin/components/OccupantTypesTab.tsx";
import { PropertiesTab } from "./admin/components/PropertiesTab.tsx";
import { AdsTab } from "./admin/components/AdsTab.tsx";
import { SubscriptionPlansTab } from "./admin/components/SubscriptionPlansTab.tsx";
import { GymTypesTab } from "./admin/components/GymTypesTab.tsx";
import { FacilitiesTab } from "./admin/components/FacilitiesTab.tsx";
import { AdminGymsTab } from "./admin/components/AdminGymsTab";
import { LeadsTab } from "./admin/components/LeadsTab";
import { VisitorLogsTab } from "./admin/components/VisitorLogsTab";
import { SearchTailTab } from "./admin/components/SearchTailTab";
import { StorageMetricsTab } from "./admin/components/StorageMetricsTab";
import { TabType, TabItem } from "./admin/types.tsx";
import { getAdminModulesApi, Module, buildModuleHierarchy } from "@/services/admin/modules";
import { getDashboardStatsApi, type DashboardStats } from "@/services/admin/dashboard";
import { getIconFromString } from "./admin/utils/iconMapper";
import Seo from "@/components/Seo";
import { getUserRolesOptionsApi } from "@/services/admin/subscriptions";
import { clearAllStoresAndSignOut } from "@/utils/authUtils";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user, tokens, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [modulesLoadError, setModulesLoadError] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoadingDashboardCharts, setIsLoadingDashboardCharts] = useState(true);

  const { adminAuth } = useAdminStore();

  // Check admin auth - use Zustand stores only
  useEffect(() => {
    // Check if user is authenticated in Zustand
    if (!isAuthenticated || !user || !tokens) {
      // Also check admin store
      if (!adminAuth || !adminAuth.isAuthenticated) {
        navigate("/login");
        return;
      }
    }
  }, [navigate, isAuthenticated, user, tokens, adminAuth]);

  // Subscribe to listing changes
  useEffect(() => {
    const updateListings = () => {
      setListings(listingsStore.getListings());
    };
    updateListings();
    return listingsStore.subscribe(updateListings);
  }, []);

  const { clearAdminAuth } = useAdminStore();

  const handleLogout = () => {
    // Clear Zustand stores (persist middleware will handle storage clearing)
    logout();
    clearAdminAuth();
    
    toast({ title: "Logged out successfully" });
    // Navigate to home page
    navigate("/");
  };

  const openReviewModal = (listing: Listing) => {
    setSelectedListing(listing);
    setIsReviewModalOpen(true);
  };

  const [sellers, setSellers] = useState(() => {
    sellersStore.initializeFromListings();
    return sellersStore.getSellers();
  });

  useEffect(() => {
    sellersStore.initializeFromListings();
    const updateSellers = () => {
      setSellers(sellersStore.getSellers());
    };
    updateSellers();
    const unsubscribe = sellersStore.subscribe(updateSellers);
    return () => unsubscribe();
  }, []);

  // Fetch modules from API
  const fetchModules = async () => {
    setIsLoadingModules(true);
    setModulesLoadError(false);
    try {
      const response = await getAdminModulesApi();
      
      if ('data' in response && 'status' in response) {
        // Check for 403 error with permission denied message
        // Only sign out if it's specifically a permission denied error
        if (response.status === 403 || response.data?.status_code === 403) {
          const errorMessage = (response.data as any)?.detail || (response.data as any)?.message || "";
          // Only sign out if the message specifically says "You do not have permission to perform this action"
          if (errorMessage.includes("You do not have permission to perform this action")) {

            toast({
              title: "Access Denied",
              description: "You do not have permission to access this resource.",
              variant: "destructive",
            });
            clearAllStoresAndSignOut();
            return;
          } else {
            // Other 403 errors - just log and continue (don't sign out)
            console.warn("403 error from modules API (not permission denied):", errorMessage);
          }
        }
        
        // It's an AxiosResponse
        if (response.data?.success && Array.isArray(response.data?.data)) {
          const modules = response.data.data;
          
          // Process modules (already hierarchical, just ensure proper sorting)
          const fetchedModules = buildModuleHierarchy(modules);
          
          if (fetchedModules.length > 0) {
            setModules(fetchedModules);
            setModulesLoadError(false);
            
            // Set initial tab to dashboard if available and current tab is overview
            const dashboardModule = fetchedModules.find(m => m.id === "dashboard");
            if (dashboardModule) {
              setActiveTab((prevTab) => prevTab === "overview" ? "dashboard" : prevTab);
            }
          } else {
            setModules([]);
            setModulesLoadError(true);
          }
        } else {
          setModules([]);
          setModulesLoadError(true);
        }
      } else if ('message' in response) {
        // It's an AxiosError - check for 403
        const error = response as any;
        if (error?.response?.status === 403 || error?.response?.data?.status_code === 403) {
          const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || "";
          // Only sign out if the message specifically says "You do not have permission to perform this action"
          if (errorMessage.includes("You do not have permission to perform this action")) {

            toast({
              title: "Access Denied",
              description: "You do not have permission to access this resource.",
              variant: "destructive",
            });
            clearAllStoresAndSignOut();
            return;
          } else {
            // Other 403 errors - just log and continue (don't sign out)
            console.warn("403 error from modules API (not permission denied):", errorMessage);
          }
        }
        setModules([]);
        setModulesLoadError(true);
      }
    } catch (error: any) {
      // Check for 403 in catch block
      if (error?.response?.status === 403 || error?.response?.data?.status_code === 403) {
        const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || "";
        // Only sign out if the message specifically says "You do not have permission to perform this action"
        if (errorMessage.includes("You do not have permission to perform this action")) {

          toast({
            title: "Access Denied",
            description: "You do not have permission to access this resource.",
            variant: "destructive",
          });
          clearAllStoresAndSignOut();
          return;
        } else {
          // Other 403 errors - just log and continue (don't sign out)
          console.warn("403 error from modules API (not permission denied):", errorMessage);
        }
      }
      setModules([]);
      setModulesLoadError(true);
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Load modules on component mount
  useEffect(() => {
    fetchModules();
  }, []);

  // Load dashboard analytics data
  useEffect(() => {
    const fetchDashboardAnalytics = async () => {
      setIsLoadingDashboardCharts(true);
      try {
        const response = await getDashboardStatsApi();
        if ("data" in response && response.data?.data) {
          setDashboardStats(response.data.data);
        } else {
          setDashboardStats(null);
        }
      } catch (error) {
        setDashboardStats(null);
      } finally {
        setIsLoadingDashboardCharts(false);
      }
    };

    fetchDashboardAnalytics();
  }, []);

  // Call /users/roles/options/ API when subscription tab is clicked
  useEffect(() => {
    if (activeTab === "subscription_plans" || activeTab === "subscription-plans") {
      const callRolesOptionsApi = async () => {
        try {
          await getUserRolesOptionsApi();
        } catch (error) {
          console.error("Error calling user roles options API:", error);
        }
      };
      callRolesOptionsApi();
    }
  }, [activeTab]);

  const userSeries = (() => {
    const users = dashboardStats?.users;
    if (!users) return [];
    return [
      { date: "Daily Active", total: users.daily_active_users ?? 0 },
      { date: "Monthly Active", total: users.monthly_active_users ?? 0 },
      { date: "Total Visits", total: users.total_visits ?? 0 },
      { date: "Registered", total: users.total_registered ?? 0 },
    ];
  })();

  const subscribedOwnerSeries = (() => {
    const users = dashboardStats?.users;
    if (!users) return [];
    return [
      { role: "Owners", value: users.owners ?? 0, color: "hsl(var(--primary))" },
      { role: "Gym Owners", value: users.gym_owners ?? 0, color: "hsl(var(--primary) / 0.4)" },
    ];
  })();

  const propertySeries = (() => {
    const properties = dashboardStats?.real_estate?.properties;
    if (!properties) return [];
    return [
      { date: "Total", total: properties.total ?? 0 },
      { date: "Active", total: properties.active ?? 0 },
      { date: "Rent", total: properties.for_rent ?? 0 },
      { date: "Sale", total: properties.for_sale ?? 0 },
      { date: "Off Plan", total: properties.off_plan ?? 0 },
    ];
  })();

  const leadsSeries = (() => {
    const payments = dashboardStats?.payments;
    if (!payments) return [];
    return [
      { date: "Total", leads: payments.total_payments ?? 0 },
      { date: "Pending", leads: payments.pending_payments ?? 0 },
      { date: "Completed", leads: payments.completed_payments ?? 0 },
      { date: "Failed", leads: payments.failed_payments ?? 0 },
    ];
  })();

  const sellerReviewStats = {
    pending: sellers.filter((s) => (s.approvalStatus || "pending") === "pending").length,
  };

  // Map API modules to tabs including children
  const mapModulesToTabs = (modules: Module[]): TabItem[] => {
    return modules.map((module) => {
      const icon = getIconFromString(module.icon);
      
      // Add count for specific modules if needed
      let count: number | undefined;
      if (module.id === "users") {
        // You can add logic to fetch user count if needed
      }
      
      // Map children to sub-tabs (exclude emirates and cities from locations)
      const children: TabItem[] | undefined = module.children
        ?.filter((child) => {
          // Remove emirates and cities sub-tabs from locations module
          if (module.id === "locations") {
            return child.id !== "emirates" && child.id !== "cities";
          }
          return true;
        })
        .map((child) => {
          // Map pending_verification to reviewSellers count
          // let childCount: number | undefined;
          // if (child.id === "pending_verification" || child.id === "pending_varification") {
          //   childCount = sellerReviewStats.pending;
          // }

          return {
            id: child.id,
            label: child.label,
            icon: icon, // Use parent icon for children, or you can create a mapping
            // count: childCount,
            path: child.path,
          };
        });
      
      // Override labels for modules
      let moduleLabel = module.label;
      if (module.id === "users") {
        moduleLabel = "Users";
      } else if (module.id === "locations") {
        moduleLabel = "Locations";
      }
      
      return {
        id: module.id,
        label: moduleLabel,
        icon: icon,
        count: count,
        children: children,
        path: module.path,
      };
    });
  };

  // Map API modules to tabs
  const tabs: TabItem[] = modules.length > 0 ? mapModulesToTabs(modules) : [];

  // Show error page if modules failed to load
  if (!isLoadingModules && modulesLoadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Pages not loaded</h1>
          <p className="text-muted-foreground">Unable to load admin modules. Please try again.</p>
          <Button onClick={fetchModules} variant="neon" className="mt-4">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Don't render dashboard if no modules loaded
  if (!isLoadingModules && modules.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Pages not loaded</h1>
          <p className="text-muted-foreground">No modules available. Please refresh.</p>
          <Button onClick={fetchModules} variant="neon" className="mt-4">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Admin Dashboard"
        description="Administrative tools and analytics for Vionex AI."
        noIndex
      />
      <AdminHeader onLogout={handleLogout} />
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
      
      <main className="pt-32 lg:pt-20 lg:pl-64 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {isLoadingModules ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading modules...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "overview" || activeTab === "dashboard" ? (
            <OverviewTab
              userSeries={userSeries}
              subscribedOwnerSeries={subscribedOwnerSeries}
              propertySeries={propertySeries}
              leadsSeries={leadsSeries}
              isLoadingCharts={isLoadingDashboardCharts}
              setActiveTab={setActiveTab}
            />
          ) : activeTab === "sellers" ? (
            <SellersTab />
              ) : activeTab === "users" || activeTab === "all_users" || activeTab === "owners" || activeTab === "gym_owners" || activeTab === "seekers" ? (
                <UsersTab activeTab={activeTab} />
              ) : activeTab === "reviewSellers" || activeTab === "pending_verification" || activeTab === "pending_varification" ? (
            <ReviewSellersTab />
              ) : activeTab === "categories" ? (
                <CategoriesTab />
              ) : activeTab === "countries" ? (
                <CountriesTab />
              ) : activeTab === "asset_types" || activeTab === "asset-types" ? (
                <AssetTypesTab />
              ) : activeTab === "property_types" || activeTab === "property-types" ? (
                <PropertyTypesTab />
              ) : activeTab === "purposes" || activeTab === "purpose" ? (
                <PurposeTab />
              ) : activeTab === "furnishing_statuses" || activeTab === "furnishing-statuses" || activeTab === "furnishing_status" || activeTab === "furnishing-status" ? (
                <FurnishingStatusTab />
              ) : activeTab === "completion_statuses" || activeTab === "completion-statuses" || activeTab === "completion_status" || activeTab === "completion-status" ? (
                <CompletionStatusTab />
              ) : activeTab === "amenities" || activeTab === "amenity" ? (
                <AmenitiesTab />
              ) : activeTab === "occupant_types" || activeTab === "occupant-types" || activeTab === "occupant_type" || activeTab === "occupant-type" ? (
                <OccupantTypesTab />
              ) : activeTab === "properties" || activeTab === "property" ? (
                <PropertiesTab />
              ) : activeTab === "ads" || activeTab === "ad" || activeTab === "all_ads" ? (
                <AdsTab />
              ) : activeTab === "subscription_plans" || activeTab === "subscription-plans" ? (
                <SubscriptionPlansTab />
              ) : activeTab === "gyms" || activeTab === "gym" ? (
                <AdminGymsTab />
              ) : activeTab === "gyms_types" || activeTab === "gym-types" ? (
                <GymTypesTab />
              ) : activeTab === "facilities" || activeTab === "facility" ? (
                <FacilitiesTab />
              ) : activeTab === "leads" ? (
                <LeadsTab />
              ) : activeTab === "visitor" ? (
                <VisitorLogsTab />
              ) : activeTab === "search_tail" ? (
                <SearchTailTab />
              ) : activeTab === "storagemetrics" ? (
                <StorageMetricsTab />
              ) : activeTab === "pending" || activeTab === "approved" || activeTab === "rejected" || activeTab === "all" ? (
            <ListingsTab
              activeTab={activeTab}
              listings={listings}
              searchQuery={searchQuery}
              categoryFilter={categoryFilter}
              onSearchChange={setSearchQuery}
              onCategoryFilterChange={setCategoryFilter}
              onReview={openReviewModal}
            />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Module "{activeTab}" is not yet implemented.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This module will be available soon.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <ReviewModal
        listing={selectedListing}
        isOpen={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
      />
    </div>
  );
};

export default AdminDashboard;
