import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PropertyMarketSnapshot from "@/components/PropertyMarketSnapshot";
import FeaturedListings from "@/components/FeaturedListings";
import ServicesSection from "@/components/ServicesSection";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import AdSidebar from "@/components/AdSidebar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import requestmodel from "@/services/requestmodel";
import base_url from "@/services/base_url";
import { printAllZustandStores } from "@/utils/printZustandStores";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  
  const isGymOwner = user?.role?.toLowerCase() === "gym_owner";

  useEffect(() => {
    // Print Zustand stores on app load
    printAllZustandStores();
    
    const loadAds = async () => {
      try {
        const url = `${base_url}/ads/`;
        // Call without headers (empty object)
        const response = await requestmodel("GET", url, undefined, {});
      } catch (error) {
        // Error handling
      }
    };

    loadAds();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Home"
        description="Vionex AI (VionexAI, vionex-ai.com) - Discover and list properties, vehicles, and fitness centers in UAE with AI-powered smart recommendations and powerful search. Your trusted marketplace in the Middle East."
        keywords="vionex, vionex ai, vionexai, vionex-ai.com, property marketplace, UAE properties, fitness marketplace"
      />
      {/* Header spans full width */}
      <Header />

      {/* Go to Dashboard Button for Gym Owners */}
      {isGymOwner && (
        <div className="w-full px-4 py-3 bg-primary/10 border-b border-primary/20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.full_name || "Gym Owner"}!
            </p>
            <Button
              variant="neon"
              size="sm"
              onClick={() => navigate("/fitness/dashboard")}
              className="flex items-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Mobile & Tablet: Ads at top */}
      <div className="lg:hidden">
        <AdSidebar />
      </div>

      <div className="flex">
        {/* Main Content - 70% on desktop, full width on mobile/tablet */}
        <div className="w-full lg:w-[70%] min-h-screen">
          <main>
           <HeroSection onCategorySelect={(index) => setActiveIndex(index)} />
            {/* <PropertyMarketSnapshot /> */}
            <FeaturedListings activeIndex={activeIndex} />
            <ServicesSection />
          </main>
          <Footer />
        </div>

        {/* Desktop: Fixed Ad Sidebar - 40% */}
        <div className="hidden lg:block">
          <AdSidebar />
        </div>
      </div>
    </div>
  );
};

export default Index;
