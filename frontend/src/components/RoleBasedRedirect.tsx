import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Component that checks user role on page load and redirects to appropriate dashboard
 * - seeker → home page (/)
 * - admin → /admin/dashboard
 * - owner → /partner/dashboard
 */
export const RoleBasedRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const [hasHydrated, setHasHydrated] = useState(false);

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

        }, 100);
      } catch (error) {
        console.error("[RoleBasedRedirect] Error checking localStorage:", error);
        setHasHydrated(true); // Continue anyway
      }
    };
    
    checkHydration();
  }, []);

  useEffect(() => {
    // Don't run redirect logic until hydration is complete
    if (!hasHydrated) {

      return;
    }






    // Only check on initial page load (when on home page or root)
    const isHomePage = location.pathname === "/" || location.pathname === "";
    
    // Skip if already on a dashboard or login page
    const isOnDashboard = location.pathname.includes("/dashboard") || 
                         location.pathname.includes("/admin") ||
                         location.pathname.includes("/Signup") ||
                         location.pathname.includes("/partner") ||
                         location.pathname.includes("/fitness");


    // Check if user explicitly wants to navigate to home
    const allowHomeNavigation = sessionStorage.getItem("allowHomeNavigation") === "true";

    if (!isHomePage || isOnDashboard) {
      // Clear the flag if we're not on home page
      if (allowHomeNavigation) {
        sessionStorage.removeItem("allowHomeNavigation");
      }
      return;
    }

    // If user explicitly navigated to home, allow them to stay
    if (allowHomeNavigation) {
      return;
    }

    // Check Zustand store for user role
    let userRole: string | null = null;
    
    if (user && user.role) {
      userRole = user.role.toLowerCase();
    }

    // Check if we have tokens from Zustand store
    const hasTokens = isAuthenticated && user !== null;



      // Only redirect if we have a role and tokens
      if (userRole && hasTokens) {

        let destination = "";
        switch (userRole) {
          case "admin":
            destination = "/admin/dashboard";

            navigate(destination, { replace: true });
            break;
          case "gym_owner":
            destination = "/fitness/dashboard";

            navigate(destination, { replace: true });
            break;
          case "owner":
            destination = "/partner/dashboard";

            navigate(destination, { replace: true });
            break;
          case "seeker":
            // Seeker stays on home page, no redirect needed

            break;
          default:
            console.warn("[RoleBasedRedirect] Unknown role, no redirect:", userRole);
            break;
        }
      } else {



        if (!userRole && !hasTokens) {

        }
      }
  }, [location.pathname, user, isAuthenticated, navigate, hasHydrated]);

  return null; // This component doesn't render anything
};

