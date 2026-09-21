import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { printAllZustandStores } from "@/utils/printZustandStores";

import Index from "./pages/Index";
import PropertyDetailsPage from "./pages/ItemDetails";
import VehicleDetailsPage from "./pages/VehicleDetails";
import NeedsDetails from "./pages/NeedsDetails";
import GymDetails from "./pages/GymDetails";
import Partner from "./pages/Partner";
import PartnerDashboard from "./pages/PartnerDashboard";
import FitnessDashboard from "./pages/FitnessDashboard";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import ViewAllListings from "./pages/ViewAllListings";
import Chat from "./pages/Chat";
import AgentDetails from "./pages/AgentDetails";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import AboutUs from "./pages/AboutUs";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Pricing from "./pages/Pricing";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentSuccess from "./pages/PaymentSuccess";
import Login from "./pages/Login";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import { ScrollToTop } from "@/components/ScrollToTop";
import NotificationHandler from "@/components/NotificationHandler";

const queryClient = new QueryClient();

const App = () => {
  // Log Zustand stores on every page refresh/load
  useEffect(() => {
    printAllZustandStores();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
        <TooltipProvider>
          <NotificationHandler />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <RoleBasedRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/Signup" element={<Partner />} />
              <Route path="/partner/dashboard" element={<PartnerDashboard />} />
              
              {/* Fitness routes */}
              <Route path="/fitness/dashboard" element={<FitnessDashboard />} />
              
              {/* Email Verification */}
              <Route path="/verify-email" element={<VerifyEmail />} />
              
              {/* Password Reset */}
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Payment Cancel */}
              <Route path="/payment/cancel" element={<PaymentCancel />} />
              
              {/* Payment Success */}
              <Route path="/payment/success" element={<PaymentSuccess />} />
              
              {/* About Us */}
              <Route path="/about-us" element={<AboutUs />} />
              
              {/* Terms and Privacy */}
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              
              {/* Pricing */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Login */}
              <Route path="/login" element={<Login />} />
              
              {/* Admin routes (login via AuthModal; redirect handled by RoleBasedRedirect) */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              {/* View All Listings */}
              <Route path="/listings/:category" element={<ViewAllListings />} />
              <Route path="/properties" element={<ViewAllListings />} />

              {/* Chat */}
              <Route path="/chat" element={<Chat />} />

              {/* Category-specific detail pages */}
              <Route path="/property/:id" element={<PropertyDetailsPage />} />
              <Route path="/vehicle/:id" element={<VehicleDetailsPage />} />
              <Route path="/needs/:id" element={<NeedsDetails />} />
              <Route path="/gym/:id" element={<GymDetails />} />
              
              {/* Agent details page */}
              <Route path="/agent/:id" element={<AgentDetails />} />

              {/* Optional legacy route */}
              <Route path="/item/:id" element={<Index />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
