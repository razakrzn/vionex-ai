import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { truncateFilename } from "@/utils/fileUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Edit, Save, X, Building2, AlertCircle, Camera, Upload, Copy, Share2 } from "lucide-react";
import { getCurrentUserMeApi, updateUserApi } from "@/services/admin/users";

interface UserProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileModal = ({ isOpen, onOpenChange }: UserProfileModalProps) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    address: "",
    about_me: "",
  });
  const [originalFormData, setOriginalFormData] = useState<typeof formData | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState("");

  // Fetch user data when modal opens (only when modal opens, not when user changes)
  useEffect(() => {
    if (isOpen && user) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen to prevent infinite loop

  // Refetch user data when email verification status changes in the store
  useEffect(() => {
    if (isOpen && user && user.is_email_verified === true && userData?.is_email_verified === false) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.is_email_verified, isOpen]);

  const fetchUserData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {

      const response = await getCurrentUserMeApi();
      
      if (response && "data" in response && "status" in response) {
        const responseData = response.data as any;
        const fetchedUserData = Array.isArray(responseData?.data)
          ? responseData.data[0]
          : responseData?.data || responseData?.user || responseData;


        if (fetchedUserData && typeof fetchedUserData === 'object' && 'id' in fetchedUserData) {
          setUserData(fetchedUserData);
          
          // Update Zustand store with latest data
          updateUser(fetchedUserData as any);
          
          // Initialize form data
          const initialData = {
            full_name: fetchedUserData.full_name || "",
            email: fetchedUserData.email || "",
            mobile_number: fetchedUserData.mobile_number || "",
            address: fetchedUserData.address || "",
            about_me: fetchedUserData.about_me || "",
          };
          setFormData(initialData);
          setOriginalFormData(initialData);
          
          if (fetchedUserData.profile_picture) {
            setProfilePreview(fetchedUserData.profile_picture);
          }
        }
      }
    } catch (error: any) {
      console.error("=== [UserProfileModal] Error fetching user data ===");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "mobile_number") {
      // extract digits only and enforce max 9 digits, strip leading country code if pasted
      let digits = value.replace(/\D/g, "");
      if (digits.startsWith("971")) digits = digits.slice(3);
      digits = digits.slice(0, 9);
      const formattedValue = `+971 ${digits}`;
      
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));

      // validate phone: must have exactly 9 digits and cannot start with 0
      if (digits.length !== 9) {
        setPhoneError("Enter a valid phone number with 9 digits");
      } else if (digits.startsWith("0")) {
        setPhoneError("Incorrect format");
      } else {
        setPhoneError("");
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!userData?.id || !originalFormData) return;
    
    // Validate phone number before saving
    if (phoneError) {
      toast({
        title: "Validation Error",
        description: "Please fix the phone number error before saving.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const fd = new FormData();
      
      // Only add form fields that have changed
      Object.entries(formData).forEach(([key, value]) => {
        const originalValue = originalFormData[key as keyof typeof originalFormData] || "";
        const currentValue = value || "";
        
        // Only include if value has changed
        if (currentValue !== originalValue) {
          fd.append(key, currentValue);
        }
      });

      // Add profile photo only if changed
      if (profilePhoto) {
        const truncatedName = truncateFilename(profilePhoto.name);
        fd.append("profile_picture", profilePhoto, truncatedName);
      }

      // Check if there are any changes
      let hasChanges = false;
      for (const [key, value] of Object.entries(formData)) {
        const originalValue = originalFormData[key as keyof typeof originalFormData] || "";
        const currentValue = value || "";
        if (currentValue !== originalValue) {
          hasChanges = true;
          break;
        }
      }
      
      // If no changes in form fields and no file changes, show message and return
      if (!hasChanges && !profilePhoto) {
        toast({
          title: "No Changes",
          description: "No changes were made to save.",
          variant: "default",
        });
        setIsSaving(false);
        return;
      }

      const response = await updateUserApi(userData.id, fd, "PATCH");

      if (response && "data" in response) {
        const responseData = response.data as any;
        const updatedUser = responseData?.data || responseData;
        
        if (updatedUser && typeof updatedUser === 'object' && 'id' in updatedUser) {
          // Update Zustand store
          updateUser(updatedUser as any);
          
          // Update local state
          setUserData(updatedUser);
          const newFormData = {
            full_name: updatedUser.full_name || "",
            email: updatedUser.email || "",
            mobile_number: updatedUser.mobile_number || "",
            address: updatedUser.address || "",
            about_me: updatedUser.about_me || "",
          };
          setFormData(newFormData);
          setOriginalFormData(newFormData);
          
          if (updatedUser.profile_picture) {
            setProfilePreview(updatedUser.profile_picture);
          }
          
          setProfilePhoto(null);
          setIsEditing(false);
          
          toast({
            title: "Success",
            description: "Profile updated successfully.",
          });
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original
    if (originalFormData) {
      setFormData(originalFormData);
    }
    if (userData?.profile_picture) {
      setProfilePreview(userData.profile_picture);
    } else {
      setProfilePreview(null);
    }
    setProfilePhoto(null);
    setIsEditing(false);
  };

  const handlePartnerWithUs = () => {
    onOpenChange(false);
    navigate("/Signup");
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "?";
    return parts[0][0].toUpperCase();
  };

  const referralCode = userData?.referral_code || user?.referral_code;
  const isSeeker = userData?.role?.toLowerCase() === "seeker";

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralCode);
      } else {
        const input = document.createElement("input");
        input.value = referralCode;
        input.style.position = "fixed";
        input.style.opacity = "0";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.focus();
        input.setSelectionRange(0, input.value.length);
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      toast({ title: "Copied", description: "Referral code copied to clipboard." });
    } catch (error) {
      console.error("Failed to copy referral code:", error);
      window.prompt("Copy this referral code:", referralCode);
      toast({ title: "Copy manually", description: "Clipboard blocked. Use the prompt to copy." });
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}/Signup?referral_code=${referralCode}`;
    try {
      if (!navigator.share) {
        toast({
          title: "Sharing not supported",
          description: "Your device does not support sharing.",
          variant: "destructive",
        });
        return;
      }
      await navigator.share({
        title: "Join me on Vionex AI",
        text: "Use my referral code to sign up.",
        url: shareUrl,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Failed to share referral link:", error);
      toast({ title: "Error", description: "Failed to open share options.", variant: "destructive" });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mt-16 pb-16">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit your profile information" : "View your profile information"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading profile data...</div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Email Verification Warning */}
            {userData?.is_email_verified === false && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">Email Not Verified</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Please verify your email address to access all features.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/verify-email", { state: { email: userData?.email || user?.email, redirectTo: "/" } });
                    }}
                  >
                    Verify Email Now
                  </Button>
                </div>
              </div>
            )}

            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-primary/30 shadow-lg">
                {profilePreview ? (
                  <AvatarImage src={profilePreview} alt={userData?.full_name || "User"} />
                ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                  {getInitials(userData?.full_name || user?.full_name)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                  <>
                    <Label 
                      htmlFor="profile-photo" 
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <div className="flex flex-col items-center gap-1 text-white">
                        <Camera className="w-6 h-6" />
                        <span className="text-xs font-medium">Click to Upload</span>
                      </div>
                  </Label>
                  <Input
                    id="profile-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  </>
                )}
              </div>
              {isEditing && (
                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="profile-photo" className="cursor-pointer">
                    <Button variant="outline" size="sm" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      {profilePhoto ? "Change Photo" : "Upload Photo"}
                    </Button>
                  </Label>
                  {profilePhoto && (
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Selected: {profilePhoto.name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Recommended: 400x400px, JPG/PNG, Max 5MB
                  </p>
                </div>
              )}
            </div>

            {/* Referral Code */}
            {!isSeeker && referralCode && (
              <div className="bg-card border border-glass-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <Label className="text-sm font-medium">Referral Code</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyReferral}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="neon" size="sm" onClick={handleShareReferral}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/30 border border-glass-border rounded-lg">
                  <span className="font-mono text-sm text-foreground">{referralCode}</span>
                  <span className="text-xs text-muted-foreground">Use this code when signing up</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Refer to get 10 points when they add their first property.
                </p>
              </div>
            )}

            {/* User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {userData?.full_name || "Not provided"}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {userData?.email || "Not provided"}
                  </div>
                )}
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Mobile Number
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="mobile_number"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      placeholder="+971 5XX XXX XXX"
                      className={phoneError ? "border-destructive" : ""}
                    />
                    {phoneError && (
                      <p className="text-sm text-destructive mt-1">{phoneError}</p>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {userData?.mobile_number || "Not provided"}
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </Label>
                {isEditing ? (
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your address"
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {userData?.address || "Not provided"}
                  </div>
                )}
              </div>
            </div>

            {/* About Me */}
            {userData?.about_me !== undefined && (
              <div className="space-y-2">
                <Label htmlFor="about_me">About Me</Label>
                {isEditing ? (
                  <textarea
                    id="about_me"
                    name="about_me"
                    value={formData.about_me}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself"
                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md min-h-[100px]">
                    {userData?.about_me || "Not provided"}
                  </div>
                )}
              </div>
            )}

            {/* Role Display */}
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="px-3 py-2 bg-muted rounded-md">
                {userData?.role_display || userData?.role || "Not provided"}
              </div>
            </div>

            {/* Verification Status */}
            {userData?.verification_status && (
              <div className="space-y-2">
                <Label>Verification Status</Label>
                <div className="px-3 py-2 bg-muted rounded-md">
                  {userData.verification_status}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              {isSeeker && !isEditing && (
                <Button
                  variant="neon"
                  onClick={handlePartnerWithUs}
                  className="flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Sign Up
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      variant="neon"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

