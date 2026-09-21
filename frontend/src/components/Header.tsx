import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Menu, X, User, Bell, MessageCircle, Settings, LogOut } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { UserProfileModal } from "./UserProfileModal";
import { useAuthStore } from "@/stores/authStore";
import { useEmiratesStore } from "@/stores/emiratesStore";
import { getEmiratesApi } from "@/services/emirates";
import { printAllZustandStores } from "@/utils/printZustandStores";
import { useTheme } from "@/contexts/ThemeContext";
import lightVideo from "@/assets/lightmode.mp4";
import darkVideo from "@/assets/logodark.mp4";


const Header = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const siteNavigationSchema = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: ["My Space", "My Fitness"],
    url: [`${siteUrl}/listings/space`, `${siteUrl}/listings/fitness`],
  };

  // Determine if we should show dark mode video
  const isDarkMode = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const videoSrc = isDarkMode ? darkVideo : lightVideo;
  
  // Get auth state from Zustand store
  const { isAuthenticated, user, tokens, logout } = useAuthStore();
  const { setEmirates } = useEmiratesStore();

  // Log Zustand store data (for debugging)
  useEffect(() => {
    printAllZustandStores();
  }, [isAuthenticated, user, tokens]);

  // Get first letter of full_name for avatar fallback
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "?";
    return parts[0][0].toUpperCase();
  };

  // Listen for auth status changes
  useEffect(() => {
    const handleAuthChange = () => {
      // Auth state is managed by Zustand store
    };

    window.addEventListener("auth-status-changed", handleAuthChange);
    return () => {
      window.removeEventListener("auth-status-changed", handleAuthChange);
    };
  }, [isAuthenticated]);

  // Handle login button click - opens modal
  const handleLoginClick = () => {
    navigate("/login");
  };

  // Handle Sign Up button click - navigates or opens modal based on user role
  const handlePartnerClick = () => {

    if (isAuthenticated && user) {
      const userRole = user.role?.toLowerCase();
      
      if (userRole === "admin") {
        // Navigate to admin dashboard
        navigate("/admin/dashboard");
      } else if (userRole === "owner") {
        // Navigate to dashboard if owner
        navigate("/partner/dashboard");
      } else if (userRole === "gym_owner") {
        // Navigate to fitness dashboard if gym_owner
        navigate("/fitness/dashboard");
      } else if (userRole === "seeker") {
        // Navigate to partner page - form will auto-fill
        navigate("/Signup");
        // Fetch emirates in the background
        (async () => {
          try {
            const response = await getEmiratesApi();
            if ('data' in response && 'status' in response) {
              if (response.data.data && Array.isArray(response.data.data)) {
                setEmirates(response.data.data);
              }
            }
          } catch (error) {
            // Error handling
          }
        })();
      } else {
        // For other roles, navigate to partner page
        navigate("/Signup");
        // Fetch emirates in the background
        (async () => {
          try {
            const response = await getEmiratesApi();
            if ('data' in response && 'status' in response) {
              if (response.data.data && Array.isArray(response.data.data)) {
                setEmirates(response.data.data);
              }
            }
          } catch (error) {
            // Error handling
          }
        })();
      }
    } else {
      // Not authenticated - navigate to partner page
      navigate("/Signup");
      (async () => {
        try {
          const response = await getEmiratesApi();
          if ('data' in response && 'status' in response) {
            if (response.data.data && Array.isArray(response.data.data)) {
              setEmirates(response.data.data);
            }
          }
        } catch (error) {
          // Error handling
        }
      })();
    }
  };

  const handleLogout = () => {
    // Clear Zustand store (persist middleware will handle storage clearing)
    logout();
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("auth-status-changed", { detail: { loggedIn: false } }));
    
    // Navigate to home page
    navigate("/");
  };

  // Handle profile circle click - open profile modal
  const handleProfileClick = () => {
    if (!isAuthenticated || !user) return;
    setIsMenuOpen(false); // Close mobile menu
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }}
        />
      </Helmet>
      <header className="fixed top-0 left-0 right-0 z-[9999] bg-background/100 dark:bg-background/100 backdrop-blur-[40px] dark:backdrop-blur-[60px] border-b border-border dark:border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-transparent flex-shrink-0">
                <video
                  key={videoSrc}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <h1 className="font-display font-bold text-lg text-foreground leading-tight">
                  VIONEX <span className="text-primary neon-text">AI</span>
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="/listings/space" className="text-md text-muted-foreground hover:text-primary transition-colors">My Space</a>
              {/* <a href="/listings/drive" className="text-sm text-muted-foreground hover:text-primary transition-colors">My Drive</a> */}
              {/* <a href="/listings/needs" className="text-sm text-muted-foreground hover:text-primary transition-colors">My Needs</a> */}
              <a href="/listings/fitness" className="text-md text-muted-foreground hover:text-primary transition-colors">My Fitness</a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Chat - to be implemented later */}
              {/* <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => navigate("/chat")}>
                <MessageCircle className="h-5 w-5" />
              </Button> */}
              {/* <Button variant="ghost" size="icon" className="hidden md:flex">
                <Bell className="h-5 w-5" />
              </Button> */}
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
              {isAuthenticated && user && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hidden md:flex">
                        <Avatar 
                          className="h-9 w-9 cursor-pointer border-2 border-primary/30 hover:border-primary transition-colors"
                          onClick={handleProfileClick}
                        >
                          {user.profile_picture ? (
                            <AvatarImage src={user.profile_picture} alt={user.full_name || "User"} />
                          ) : null}
                          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{user.full_name || user.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex"
                  onClick={handleLoginClick}
                >
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
              )}
              {!(isAuthenticated && user?.role?.toLowerCase() === "seeker") && (
                <Button 
                  variant="neon" 
                  size="sm" 
                  type="button"
                  className="hidden md:flex" 
                  onClick={handlePartnerClick}
                >
                  {isAuthenticated && (user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "gym_owner")
                    ? "Go to Dashboard" 
                    : "Sign Up"}
                </Button>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-slide-up relative z-[9999] bg-background/100 dark:bg-background/100 backdrop-blur-[40px] dark:backdrop-blur-[60px]">
              <nav className="flex flex-col gap-3 px-4">
                <a href="/listings/space" className="text-sm text-muted-foreground hover:text-primary transition-colors py-2">My Space</a>
                {/* <a href="/listings/drive" className="text-sm text-muted-foreground hover:text-primary transition-colors py-2">My Drive</a> */}
                {/* <a href="/listings/needs" className="text-sm text-muted-foreground hover:text-primary transition-colors py-2">My Needs</a> */}
                <a href="/listings/fitness" className="text-sm text-muted-foreground hover:text-primary transition-colors py-2">My Fitness</a>
                <div className="flex items-center gap-2 pt-2">
                  {/* Chat - to be implemented later */}
                  {/* <Button variant="ghost" size="sm" onClick={() => { navigate("/chat"); setIsMenuOpen(false); }}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Messages
                  </Button> */}
                  <Button variant="ghost" size="sm" onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
                {isAuthenticated && user && (
                  <div 
                    className="flex items-center gap-3 pt-2 pb-2 border-t border-border cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                    onClick={handleProfileClick}
                  >
                    <Avatar 
                      className="h-10 w-10 cursor-pointer border-2 border-primary/30"
                    >
                      {user.profile_picture ? (
                        <AvatarImage src={user.profile_picture} alt={user.full_name || "User"} />
                      ) : null}
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{user.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-3">
                  {isAuthenticated ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigate("/login");
                        setIsMenuOpen(false);
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  )}
                  {!(isAuthenticated && user?.role?.toLowerCase() === "seeker") && (
                    <Button 
                      variant="neon" 
                      size="sm" 
                      type="button"
                      className="flex-1" 
                      onClick={() => { 
                        setIsMenuOpen(false);
                        handlePartnerClick();
                      }}
                    >
                      {isAuthenticated && (user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "gym_owner")
                        ? "Go to Dashboard" 
                        : "Sign Up"}
                    </Button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <UserProfileModal isOpen={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
    </>
  );
};

export default Header;

