import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Building2, FileText, Save, X, AlertCircle, Camera, Upload, Copy, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { truncateFilename } from "@/utils/fileUtils";
import { getCurrentUserApi, updateUserApi } from "@/services/admin/users";

interface PartnerProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PartnerProfileModal = ({ isOpen, onOpenChange }: PartnerProfileModalProps) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    whatsapp_number: "",
    address: "",
    company_name: "",
    license_number: "",
    emirates_id_number: "",
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [originalFormData, setOriginalFormData] = useState<typeof formData | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  // Fetch latest user data from /users/me/ when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;

    const fetchUser = async () => {
      try {
        const response = await getCurrentUserApi();
        if (response && "data" in response) {
          const responseData = response.data;
          const updatedUser = responseData?.data || responseData?.user || responseData;
          if (updatedUser && isActive) {
            updateUser(updatedUser);
          }
        }
      } catch (error) {
        console.error("Error fetching user data from /users/me/:", error);
      }
    };

    fetchUser();

    return () => {
      isActive = false;
    };
  }, [isOpen, updateUser]);

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      const formatPhoneNumber = (phone: string | null | undefined): string => {
        if (!phone) return "";
        if (phone.startsWith("+971")) return phone;
        const digits = phone.replace(/\D/g, "").slice(-9);
        return digits ? `+971 ${digits}` : "";
      };
      
      const initialData = {
        full_name: user.full_name || "",
        email: user.email || "",
        mobile_number: formatPhoneNumber(user.mobile_number),
        whatsapp_number: formatPhoneNumber(user.whatsapp_number),
        address: user.address || "",
        company_name: user.company_name || "",
        license_number: user.license_number || "",
        emirates_id_number: user.emirates_id_number || "",
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
      setPhoneError(""); // Reset errors when loading data
      setWhatsappError("");
      if (user.profile_picture) {
        setProfilePreview(user.profile_picture);
      }
      if (user.document_uploads) {
        setDocumentPreview(user.document_uploads);
      }
    }
  }, [user, isOpen]);

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
    } else if (name === "whatsapp_number") {
      // extract digits only and enforce max 9 digits, strip leading country code if pasted
      let digits = value.replace(/\D/g, "");
      if (digits.startsWith("971")) digits = digits.slice(3);
      digits = digits.slice(0, 9);
      const formattedValue = `+971 ${digits}`;
      
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));

      // validate WhatsApp number: must have exactly 9 digits and cannot start with 0
      if (digits.length !== 9) {
        setWhatsappError("Enter a valid WhatsApp number with 9 digits");
      } else if (digits.startsWith("0")) {
        setWhatsappError("Incorrect format");
      } else {
        setWhatsappError("");
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

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !originalFormData) return;
    
    // Validate phone numbers before saving
    if (phoneError || whatsappError) {
      toast({
        title: "Validation Error",
        description: "Please fix the phone number errors before saving.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Create FormData for file upload
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

      // Add document only if changed
      if (documentFile) {
        const truncatedName = truncateFilename(documentFile.name);
        fd.append("document_uploads", documentFile, truncatedName);
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
      if (!hasChanges && !profilePhoto && !documentFile) {
        toast({
          title: "No Changes",
          description: "No changes were made to save.",
          variant: "default",
        });
        setIsSaving(false);
        return;
      }

      const response = await updateUserApi(user.id, fd, "PATCH");

      if (response && "data" in response) {
        const responseData = response.data;
        // Handle array response (if API returns array) or single object
        let updatedUser;
        if (Array.isArray(responseData?.data)) {
          updatedUser = responseData.data[0];
        } else {
          updatedUser = responseData?.data || responseData?.user || responseData;
        }
        
        if (updatedUser) {
          updateUser(updatedUser);
          // Update original form data to reflect saved changes
          setOriginalFormData({
            full_name: updatedUser.full_name || "",
            email: updatedUser.email || "",
            mobile_number: updatedUser.mobile_number || "",
            whatsapp_number: updatedUser.whatsapp_number || "",
            address: updatedUser.address || "",
            company_name: updatedUser.company_name || "",
            license_number: updatedUser.license_number || "",
            emirates_id_number: updatedUser.emirates_id_number || "",
          });
          // Reset file states after successful save
          setProfilePhoto(null);
          setDocumentFile(null);
          toast({
            title: "Profile Updated",
            description: "Your profile has been successfully updated.",
          });
          setIsEditing(false);
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: error?.response?.data?.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user && originalFormData) {
      setFormData(originalFormData);
      if (user.profile_picture) {
        setProfilePreview(user.profile_picture);
      } else {
        setProfilePreview(null);
      }
      if (user.document_uploads) {
        setDocumentPreview(user.document_uploads);
      } else {
        setDocumentPreview(null);
      }
      setProfilePhoto(null);
      setDocumentFile(null);
    }
    setIsEditing(false);
  };

  if (!user) return null;

  const referralCode = user?.referral_code;
  const isSeeker = user?.role?.toLowerCase() === "seeker";

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Partner Profile
          </DialogTitle>
          <DialogDescription>
            View and update your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Email Verification Warning */}
          {user?.is_email_verified === false && (
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
                    navigate("/verify-email", { state: { email: user?.email, redirectTo: "/partner/dashboard" } });
                  }}
                >
                  Verify Email Now
                </Button>
              </div>
            </div>
          )}

          {/* Profile Photo & Document Section */}
          <div className="space-y-4 pb-4 border-b border-glass-border">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-primary/30 shadow-lg">
                {profilePreview ? (
                  <AvatarImage src={profilePreview} alt={user.full_name || "Profile"} />
                ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-16 w-16" />}
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
                <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                  <Label htmlFor="profile-photo" className="cursor-pointer w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      {profilePhoto ? "Change Photo" : "Upload Photo"}
                    </Button>
                  </Label>
                  {profilePhoto && (
                    <p className="text-xs text-muted-foreground text-center">
                      Selected: {profilePhoto.name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Recommended: 400x400px, JPG/PNG, Max 5MB
                  </p>
                </div>
              )}
            </div>
            
            {/* Document Upload Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document Uploads</Label>
              {documentPreview && !isEditing ? (
                <div className="flex items-center gap-2">
                  <a
                    href={documentPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    View Current Document
                  </a>
                </div>
              ) : null}
              {isEditing && (
                <div className="space-y-2">
                  {documentPreview && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Current: {documentPreview.includes('http') ? 'Document uploaded' : 'New file selected'}</span>
                    </div>
                  )}
                  <Label htmlFor="document-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>{documentPreview ? 'Replace Document' : 'Upload Document'}</span>
                    </Button>
                  </Label>
                  <Input
                    id="document-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleDocumentChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
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

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+971 5XX XXX XXX"
                  className={phoneError ? "border-destructive" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-destructive mt-1">{phoneError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                <Input
                  id="whatsapp_number"
                  name="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+971 5XX XXX XXX"
                  className={whatsappError ? "border-destructive" : ""}
                />
                {whatsappError && (
                  <p className="text-sm text-destructive mt-1">{whatsappError}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Company/Professional Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Professional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user.seller_type === "COMPANY" || user.company_name) && (
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter company name"
                  />
                </div>
              )}
              {(user.seller_type === "COMPANY" || user.license_number) && (
                <div className="space-y-2">
                  <Label htmlFor="license_number">Trade License Number</Label>
                  <Input
                    id="license_number"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter license number"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="emirates_id_number">Emirates ID Number</Label>
                <Input
                  id="emirates_id_number"
                  name="emirates_id_number"
                  value={formData.emirates_id_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter Emirates ID"
                />
              </div>
            </div>
          </div>

          {/* Status Information (Read-only) */}
          <div className="space-y-4 pt-4 border-t border-glass-border">
            <h3 className="font-semibold text-lg">Account Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Verification Status</Label>
                <p className="text-sm font-medium capitalize">
                  {user.verification_status || "Pending"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Seller Type</Label>
                <p className="text-sm font-medium">
                  {user.seller_type_display || user.seller_type || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Mobile Verified</Label>
                <p className="text-sm font-medium">
                  {user.is_mobile_verified ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <p className="text-sm font-medium capitalize">
                  {user.role_display || user.role || "N/A"}
                </p>
              </div>
              {user.emirate_name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Emirate</Label>
                  <p className="text-sm font-medium">
                    {user.emirate_name}
                  </p>
                </div>
              )}
              {user.country_name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <p className="text-sm font-medium">
                    {user.country_name}
                  </p>
                </div>
              )}
              {user.date_joined && (
                <div>
                  <Label className="text-xs text-muted-foreground">Date Joined</Label>
                  <p className="text-sm font-medium">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </p>
                </div>
              )}
              {user.rejection_note && (
                <div className="md:col-span-3">
                  <Label className="text-xs text-muted-foreground">Rejection Note</Label>
                  <p className="text-sm font-medium text-destructive">
                    {user.rejection_note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="neon">
                <Save className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={handleCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="neon" disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

