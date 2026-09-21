import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loginUserApi, passwordResetApi } from "@/services/authrequest";
import { useAuthStore } from "@/stores/authStore";
import { useAdminStore } from "@/stores/adminStore";
import { getCurrentUserMeApi } from "@/services/admin/users";
import { handleDeviceRegistration } from "@/utils/deviceUtils";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, updateUser } = useAuthStore();
  const { setAdminAuth } = useAdminStore();
  
  const [activeTab] = useState<"login">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Login form
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (loginError) {
      setLoginError("");
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); // Clear previous error
    setIsLoading(true);

    try {
      const response = await loginUserApi(loginData);
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data as any;
        
        if (responseData?.success) {
          const userData = responseData?.data?.user;
          const tokens = responseData?.data?.tokens;
          
          if (userData && tokens) {





            // Store auth data first

            login(userData, {
              access: tokens.access,
              refresh: tokens.refresh,
            });

            // Register device for notifications
            handleDeviceRegistration();

            // Fetch updated user data (don't block navigation if this fails)

            getCurrentUserMeApi()
              .then((userResponse) => {
                if (userResponse && 'data' in userResponse && 'status' in userResponse) {
                  const userResponseData = userResponse.data as any;
                  const fetchedUserData = userResponseData?.data || userResponseData;
                  if (fetchedUserData && typeof fetchedUserData === 'object' && 'id' in fetchedUserData) {
                    updateUser(fetchedUserData as any);
                  }
                }
              })
              .catch(() => {
                // Don't block navigation if this fails - user is already logged in
              });
            
            toast({
              title: "Login Successful",
              description: "Welcome back!",
            });
            
            // Clear login form
            setLoginData({ email: "", password: "" });
            setLoginError("");

            onClose();
            
            // Wait a bit for Zustand persist to complete before navigating
            // This ensures tokens are saved to localStorage

            setTimeout(() => {
              // Navigate based on role
              const userRole = userData.role?.toLowerCase();


              let destination = "";
              if (userRole === "gym_owner") {
                destination = "/fitness/dashboard";
              } else if (userRole === "owner") {
                destination = "/partner/dashboard";
              } else if (userRole === "admin") {
                // Persist admin auth details for AdminDashboard guard
                setAdminAuth({
                  isAuthenticated: true,
                  adminId: userData.id?.toString(),
                  adminName: userData.full_name || userData.email,
                  adminEmail: userData.email,
                });
                destination = "/admin/dashboard";
              } else {
                return;
              }


              navigate(destination);

            }, 500);
          } else {
            const errorMessage = responseData?.errors?.detail || responseData?.message || "Invalid credentials";
            setLoginError(errorMessage);
          }
        } else {
          // Handle invalid credentials or other errors
          const errorMessage = responseData?.errors?.detail || responseData?.message || "Invalid credentials";
          setLoginError(errorMessage);
        }
      } else if ('message' in response) {
        // Handle AxiosError case
        const errorResponse = response as any;
        const errorData = errorResponse?.response?.data || errorResponse?.data || {};
        const errorMessage = errorData?.errors?.detail || errorData?.message || "Invalid credentials";
        setLoginError(errorMessage);
      }
    } catch (error: any) {
      const errorData = error?.response?.data || {};
      const errorMessage = errorData?.errors?.detail || errorData?.message || "An error occurred. Please try again.";
      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await passwordResetApi(forgotPasswordEmail);
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        if (responseData?.success) {
          toast({
            title: "Password Reset Email Sent",
            description: "Please check your email for password reset instructions.",
          });
          setShowForgotPassword(false);
          setForgotPasswordEmail("");
        } else {
          toast({
            title: "Error",
            description: responseData?.message || "Failed to send password reset email",
            variant: "destructive",
          });
        }
      } else if ('message' in response) {
        const errorResponse = response as any;
        const errorData = errorResponse?.response?.data || errorResponse?.data || {};
        toast({
          title: "Error",
          description: errorData?.message || "Failed to send password reset email",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorData = error?.response?.data || {};
      toast({
        title: "Error",
        description: errorData?.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-glass-border">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-2xl">
            Welcome to <span className="text-primary neon-text">VIONEX AI</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    className="pl-10 bg-muted/30 border-glass-border"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    className="pl-10 pr-10 bg-muted/30 border-glass-border"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {loginError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                variant="neon"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </Button>
                <div className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:text-primary/80 p-0 h-auto font-medium"
                    onClick={() => {
                      onClose();
                      navigate("/Signup");
                    }}
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-xl">
              Forgot Password
            </DialogTitle>
            <DialogDescription className="text-center">
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="pl-10 bg-muted/30 border-glass-border"
                  required
                  disabled={isResettingPassword}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                }}
                disabled={isResettingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="neon"
                className="flex-1"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AuthModal;

