import { LogOut, User, Home, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import logovideo from "@/assets/cmp_20251216144251_576-vmake-vmake (1).mp4";
import { PartnerProfileModal } from "../../partner/components/PartnerProfileModal";
import { NotificationDropdown } from "../../partner/components/NotificationDropdown";
import SettingsModal from "@/components/SettingsModal";

interface FitnessHeaderProps {
  onLogout: () => void;
}

export const FitnessHeader = ({ onLogout }: FitnessHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:glass border-b border-glass-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 rounded-lg overflow-hidden animate-gradient bg-transparent">
            <video
              src={logovideo}
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
        <div className="flex items-center gap-2">
          {/* Desktop Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex">
            <NotificationDropdown />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {

              sessionStorage.setItem("allowHomeNavigation", "true");
              navigate("/");
            }}
            className="hidden md:flex hover:bg-blue-50 dark:hover:bg-muted"
            title="Go to Home"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProfileModalOpen(true)}
            className="hidden md:flex hover:bg-blue-50 dark:hover:bg-muted"
            title="View Profile"
          >
            <Avatar className="h-8 w-8 border-2 border-primary/30">
              {user?.profile_picture ? (
                <AvatarImage src={user.profile_picture} alt={user.full_name || "Profile"} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout} 
            className="hidden md:flex hover:bg-blue-50 dark:hover:bg-muted"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>

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
        <div className="md:hidden py-4 border-t border-glass-border animate-slide-up relative z-[9999]">
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMenuOpen(false);
              }}
              className="justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <div className="md:hidden w-full">
              <NotificationDropdown showText={true} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {

                sessionStorage.setItem("allowHomeNavigation", "true");
                navigate("/");
                setIsMenuOpen(false);
              }}
              className="justify-start"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
            {user && (
              <div className="flex items-center gap-3 pt-2 pb-2 border-t border-glass-border">
                <Avatar 
                  className="h-10 w-10 cursor-pointer border-2 border-primary/30"
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  {user.profile_picture ? (
                    <AvatarImage src={user.profile_picture} alt={user.full_name || "Profile"} />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{user.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onLogout();
                setIsMenuOpen(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      <PartnerProfileModal
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
};

