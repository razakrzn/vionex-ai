import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { passwordResetConfirmApi } from "@/services/authrequest";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "Password reset link is invalid or expired.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [token, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword.trim()) {
      setError("Password is required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setIsResetting(true);
    try {
      const response = await passwordResetConfirmApi(token, newPassword, confirmPassword);
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        if (responseData?.success) {
          toast({
            title: "Password Reset Successful",
            description: "Your password has been reset successfully. You can now login with your new password.",
          });
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } else {
          const errorMessage = 
            responseData?.errors?.new_password?.[0] ||
            responseData?.errors?.new_password_confirm?.[0] ||
            responseData?.errors?.token?.[0] ||
            responseData?.message ||
            "Failed to reset password. Please try again.";
          setError(errorMessage);
        }
      } else if ('message' in response) {
        const errorResponse = response as any;
        const errorData = errorResponse?.response?.data || errorResponse?.data || {};
        const errorMessage = 
          errorData?.errors?.new_password?.[0] ||
          errorData?.errors?.new_password_confirm?.[0] ||
          errorData?.errors?.token?.[0] ||
          errorData?.message ||
          "Failed to reset password. Please try again.";
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error("Password reset confirm error:", error);
      const errorData = error?.response?.data || {};
      const errorMessage = 
        errorData?.errors?.new_password?.[0] ||
        errorData?.errors?.new_password_confirm?.[0] ||
        errorData?.errors?.token?.[0] ||
        errorData?.message ||
        "Failed to reset password. Please try again.";
      setError(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  const handleFieldChange = () => {
    if (error) setError("");
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col mt-16">
      <Seo
        title="Reset Password"
        description="Set a new password for your Vionex AI account."
        noIndex
      />
      <Header />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 neon-border">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Reset Your Password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      handleFieldChange();
                    }}
                    onFocus={handleFieldChange}
                    placeholder="Enter new password"
                    className="pl-10 pr-10 bg-muted/30 border-glass-border"
                    required
                    disabled={isResetting}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isResetting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      handleFieldChange();
                    }}
                    onFocus={handleFieldChange}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 bg-muted/30 border-glass-border"
                    required
                    disabled={isResetting}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isResetting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="neon"
                className="w-full"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/")}
                disabled={isResetting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResetPassword;
