import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { requestOTPApi, verifyOTPApi } from "@/services/authrequest";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { getCurrentUserMeApi } from "@/services/admin/users";
import Seo from "@/components/Seo";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { updateUser } = useAuthStore();
  
  const [email, setEmail] = useState<string>(location.state?.email || "");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const handleRequestOTP = async (emailToUse?: string) => {
    const emailToSend = emailToUse || email;
    if (!emailToSend) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    setIsRequestingOTP(true);
    try {
      const response = await requestOTPApi(emailToSend);
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        if (responseData?.success) {
          toast({
            title: "OTP Sent",
            description: `Verification code sent to ${emailToSend}`,
          });
          setCanResend(false);
          setResendCooldown(60);
          if (emailToUse) {
            setEmail(emailToUse);
            setShowChangeEmail(false);
            setNewEmail("");
          }
        } else {
          toast({
            title: "Error",
            description: responseData?.message || "Failed to send OTP",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error requesting OTP:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyOTPApi(email, otpCode);

      if ('data' in response && 'status' in response) {
        const responseData = response.data as any;

        if (responseData?.success === true) {
          toast({
            title: "Email Verified",
            description: "Your email has been successfully verified!",
          });
          
          // Fetch fresh user data to ensure we have the latest verification status
          try {
            const userResponse = await getCurrentUserMeApi();
            if (userResponse && 'data' in userResponse && 'status' in userResponse) {
              const userResponseData = userResponse.data as any;
              const fetchedUserData = userResponseData?.data || userResponseData;
              if (fetchedUserData && typeof fetchedUserData === 'object' && 'id' in fetchedUserData) {
                updateUser(fetchedUserData as any);
              }
            }
          } catch (error) {
            console.error("Error fetching updated user data:", error);
            // Fallback to user from verification response
            if (responseData?.data?.user) {
              updateUser(responseData.data.user as any);
            }
          }
          
          // Navigate based on redirectTo if present, otherwise use role-based navigation
          const redirectTo = location.state?.redirectTo;
          if (redirectTo) {
            navigate(redirectTo);
          } else {
            const userRole = responseData?.data?.user?.role?.toLowerCase();
            if (userRole === "gym_owner") {
              navigate("/fitness/dashboard");
            } else if (userRole === "owner") {
              navigate("/partner/dashboard");
            } else {
              navigate("/");
            }
          }
        } else {
          // Handle invalid or expired OTP - success: false

          const errorMessage = responseData?.errors?.code || responseData?.message || "Invalid OTP. Please try again.";
          toast({
            title: "Invalid OTP",
            description: errorMessage,
            variant: "destructive",
          });
          // Clear OTP fields
          setOtp(Array(6).fill(""));
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 100);
        }
      } else if ('message' in response) {
        // Handle AxiosError case
        const errorResponse = response as any;

        const errorData = errorResponse?.response?.data || errorResponse?.data || {};
        const errorMessage = errorData?.errors?.code || errorData?.message || "Invalid OTP. Please try again.";
        toast({
          title: "Invalid OTP",
          description: errorMessage,
          variant: "destructive",
        });
        // Clear OTP fields
        setOtp(Array(6).fill(""));
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      const errorData = error?.response?.data || {};
      const errorMessage = errorData?.errors?.code || errorData?.message || "Invalid OTP. Please try again.";
      toast({
        title: "Invalid OTP",
        description: errorMessage,
        variant: "destructive",
      });
      // Clear OTP fields
      setOtp(Array(6).fill(""));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    const { user } = useAuthStore.getState();
    const userRole = user?.role?.toLowerCase();
    
    if (userRole === "gym_owner") {
      navigate("/fitness/dashboard");
    } else if (userRole === "owner") {
      navigate("/partner/dashboard");
    } else {
      navigate("/");
    }
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    await handleRequestOTP(newEmail);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col mt-16">
      <Seo
        title="Verify Email"
        description="Verify your email address to continue using Vionex AI."
        noIndex
      />
      <Header />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 neon-border">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-6 -ml-2 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Verify Your Email
              </h1>
              <p className="text-muted-foreground">
                We've sent a 6-digit verification code to
              </p>
              <p className="font-semibold text-foreground mt-1">{email}</p>
            </div>

            {showChangeEmail ? (
              <form onSubmit={handleChangeEmailSubmit} className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="newEmail">Enter New Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                    className="mt-2"
                    disabled={isRequestingOTP}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="neon"
                    className="flex-1"
                    disabled={isRequestingOTP}
                  >
                    {isRequestingOTP ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowChangeEmail(false);
                      setNewEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="mb-6">
                  <Label className="mb-4 block text-center">Enter Verification Code</Label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="w-12 h-14 text-center text-2xl font-bold"
                        disabled={isVerifying}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="neon"
                    className="w-full"
                    onClick={handleVerify}
                    disabled={isVerifying || otp.join("").length !== 6}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleRequestOTP()}
                    disabled={!canResend || isRequestingOTP}
                  >
                    {isRequestingOTP ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend OTP"}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleSkip}
                  >
                    Verify Later
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VerifyEmail;

