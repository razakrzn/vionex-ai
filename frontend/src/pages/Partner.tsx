import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmiratesStore } from "@/stores/emiratesStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { getSavedCountriesApi, getStatesApi, Country, State } from "@/services/admin/locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building2,
  User,
  Upload,
  Mail,
  Phone,
  Lock,
  FileText,
  Tag,
  CheckCircle2,
  Clock,
  MapPin,
  Home,
  Car,
  ShoppingBag,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Calendar,
  Eye,
  EyeOff,
  UserCircle,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import Seo from "@/components/Seo";
import { format } from "date-fns";
import { truncateFilename } from "@/utils/fileUtils";
import { registerUserApi, loginUserApi } from "@/services/authrequest";
import { getCurrentUserMeApi, updateUserApi } from "@/services/admin/users";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

type PartnerType = "individual" | "agent" | "company";
type Category = "space" | "drive" | "needs" | "fitness" | "guest";
type FormStep = "category" | "partnerType" | "basicInfo" | "location" | "profilePhoto" | "typeSpecific" | "documents" | "review";

// PDF compression function - compresses PDF files to target size
// Uses browser CompressionStream API for compression
const compressPDF = async (file: File, maxSizeMB: number = 2): Promise<File> => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // If file is already under the target size, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  // Check if CompressionStream API is available (Chrome 80+, Edge 80+, Safari 16.4+)
  if (typeof CompressionStream === 'undefined') {
    // Fallback: return original file if compression not supported
    console.warn('PDF compression not supported in this browser. File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    return file;
  }

  try {
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use deflate compression (better for binary data like PDFs)
    const compressionStream = new CompressionStream('deflate');
    const writer = compressionStream.writable.getWriter();
    const reader = compressionStream.readable.getReader();
    
    // Write the PDF data to the compression stream
    await writer.write(uint8Array);
    await writer.close();
    
    // Read the compressed data
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine all chunks into a single Uint8Array
    const compressedLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const compressedData = new Uint8Array(compressedLength);
    let offset = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Check if compression actually reduced the size
    // PDFs are often already compressed, so compression might not help much
    if (compressedData.length >= file.size) {
      // Compression didn't help or made it larger, return original
      console.log('PDF compression did not reduce size. Original:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      return file;
    }
    
    // Create a new File with compressed data
    // Note: The server will need to decompress this using InflateStream
    // or you can use a library that handles compressed PDFs
    const compressedFile = new File([compressedData], file.name, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });
    
    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    console.log(`PDF compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`);
    
    // If compressed file is still too large, return it anyway
    // (it's better than the original)
    return compressedFile;
  } catch (error) {
    console.error('Error compressing PDF:', error);
    // On error, return original file
    return file;
  }
};

// Image compression function - optimized for WebP with JPEG fallback
const compressImage = (file: File, maxSizeMB: number = 0.8, maxDimension: number = 1600): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Resize if too large
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to get under maxSizeMB
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        let quality = 0.85;
        let attempts = 0;
        const maxAttempts = 8;
        const minQuality = 0.6;
        
        // WebP with JPEG fallback
        const tryCompress = (useWebP: boolean = true) => {
          attempts++;
          const mimeType = useWebP ? "image/webp" : "image/jpeg";
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback to JPEG if WebP fails
                if (useWebP) {
                  tryCompress(false);
                  return;
                }
                reject(new Error("Failed to compress image"));
                return;
              }
              
              // Accept if under size limit or if we've tried enough times
              if (blob.size <= maxSizeBytes || quality <= minQuality || attempts >= maxAttempts) {
                const extension = useWebP ? ".webp" : ".jpg";
                const truncatedName = truncateFilename(file.name.replace(/\.[^/.]+$/, extension));
                const compressedFile = new File([blob], truncatedName, {
                  type: mimeType,
                  lastModified: Date.now(),
                });

                resolve(compressedFile);
              } else {
                quality = Math.max(minQuality, quality - 0.05);
                tryCompress(useWebP);
              }
            },
            mimeType,
            quality
          );
        };
        
        tryCompress();
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
};

import { handleDeviceRegistration } from "@/utils/deviceUtils";

const Partner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, updateUser, user, isAuthenticated, tokens } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>("category");
  const [partnerType, setPartnerType] = useState<PartnerType>("individual");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isUpdatingExistingUser, setIsUpdatingExistingUser] = useState(false);

  // Scroll to top when step changes or component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [currentStep, partnerType]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [fileError, setFileError] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [isDifferentWhatsApp, setIsDifferentWhatsApp] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string | null>(null);

  // Guest signup form state
  const [guestSignupData, setGuestSignupData] = useState({
    full_name: "",
    email: "",
    password: "",
    password_confirm: "",
    mobile_number: "",
    whatsapp_number: "",
  });
  const [noWhatsApp, setNoWhatsApp] = useState(false);
  const [guestTermsAccepted, setGuestTermsAccepted] = useState(false);
  const [guestPrivacyAccepted, setGuestPrivacyAccepted] = useState(false);
  const [showGuestPassword, setShowGuestPassword] = useState(false);
  const [showGuestConfirmPassword, setShowGuestConfirmPassword] = useState(false);
  const [guestSignupError, setGuestSignupError] = useState("");
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const [formData, setFormData] = useState({
    // Common fields
    email: "",
    password: "",
    confirmPassword: "",
    phone: "+971 ",
    whatsapp_number: "+971 ",
    country: "", // Will store country ID as string
    state: "", // Will store state name as string
    emirate: "", // Will store emirate ID as string (legacy, kept for backward compatibility)
    address: "",
    website: "",
    emiratesExpiry: "",
    referral_code: "",
    
    // Agent fields
    fullName: "",
    emiratesId: "",
    reraNumber: "",
    
    // Company fields
    companyName: "",
    tradeLicenseNumber: "",
    
    // Fitness/Gym Owner fields
    city: "",
    aboutMe: "",
    licenseNumber: "", // For fitness gym owner license
    
  });

  // Prefill referral code from URL (?referral_code=XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("referral_code");
    if (code) {
      setReferralCodeFromUrl(code);
      setIsReferralLocked(true);
      setFormData((prev) => ({ ...prev, referral_code: code }));
    }
  }, []);

  // Get emirates from Zustand store
  const { emirates } = useEmiratesStore();
  
  // Countries and states
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const response = await getSavedCountriesApi();
        if ('data' in response && 'status' in response) {
          if (response.data?.success && response.data?.data) {
            setCountries(response.data.data);
            // If only one country, auto-select it
            if (response.data.data.length === 1 && response.data.data[0].id) {
              handleSelectChange("country", response.data.data[0].id.toString());
            }
          }
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setIsLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    if (formData.country) {
      const selectedCountry = countries.find((c) => c.id?.toString() === formData.country);
      if (selectedCountry?.code) {
        setIsLoadingStates(true);
        setStates([]);
        setFormData((prev) => ({ ...prev, state: "" })); // Reset state when country changes
        
        getStatesApi(selectedCountry.code)
          .then((response) => {
            if ('data' in response && 'status' in response) {
              if (response.data?.success && response.data?.data) {
                setStates(response.data.data);
              }
            }
          })
          .catch((error) => {
            console.error("Error fetching states:", error);
          })
          .finally(() => {
            setIsLoadingStates(false);
          });
      }
    } else {
      setStates([]);
    }
  }, [formData.country, countries]);

  // Auto-fill form if user is logged in and is a seeker
  useEffect(() => {
    if (isAuthenticated && user && user.role?.toLowerCase() === "seeker") {










      setIsUpdatingExistingUser(true);
      setSelectedCategory("space"); // Default to My Space for existing users
      setCurrentStep("partnerType"); // Skip category selection for existing users
      
      // Format phone number properly
      const formatPhoneNumber = (phone: string | null | undefined): string => {
        if (!phone) return "+971 ";
        // If already in +971 format, return as is
        if (phone.startsWith("+971")) return phone;
        // Extract digits only
        let digits = phone.replace(/\D/g, "");
        // Remove leading 971 if present
        if (digits.startsWith("971")) digits = digits.slice(3);
        // Limit to 9 digits
        digits = digits.slice(0, 9);
        // Format as +971 XXXXXXXX
        return `+971 ${digits}`;
      };
      
      const formattedPhone = formatPhoneNumber(user.mobile_number);
      
      // Auto-fill form data
      const autoFilledData = {
        email: user.email || "",
        password: "", // Don't pre-fill password
        confirmPassword: "", // Don't pre-fill password
        phone: formattedPhone,
        whatsapp_number: formattedPhone,
        country: user.country?.toString() || "",
        state: user.state || "",
        emirate: user.emirate?.toString() || "",
        address: user.address || "",
        website: user.website || "",
        emiratesExpiry: "",
        referral_code: referralCodeFromUrl || "",
        fullName: user.full_name || "",
        emiratesId: user.emirates_id_number || "",
        reraNumber: "",
        companyName: user.company_name || "",
        tradeLicenseNumber: user.license_number || "",
        city: "",
        aboutMe: "",
        licenseNumber: "",
      };
      
      setFormData(autoFilledData);
      
      // Clear all validation errors
      setEmailError("");
      setPhoneError("");
      setWhatsappError("");
      setPasswordError("");
      setConfirmError("");
      setFileError("");
      
      // Validate auto-filled data
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const phoneRe = /^\+971\s[1-9]\d{8}$/;
      
      // Validate email
      if (autoFilledData.email && !emailRe.test(autoFilledData.email)) {
        setEmailError("Enter a valid email address");
      }
      
      // Validate phone
      if (autoFilledData.phone && !phoneRe.test(autoFilledData.phone)) {
        setPhoneError("Enter a valid phone number with 9 digits");
      }
      
      // Validate WhatsApp (same as phone initially)
      if (autoFilledData.whatsapp_number && !phoneRe.test(autoFilledData.whatsapp_number)) {
        setWhatsappError("Enter a valid WhatsApp number with 9 digits");
      }
      
      // Set profile preview if exists
      if (user.profile_picture) {
        setProfilePreview(user.profile_picture);
      }
      
      // Set partner type based on seller_type
      if (user.seller_type) {
        const sellerType = user.seller_type.toUpperCase();
        if (sellerType === "COMPANY") setPartnerType("company");
        else if (sellerType === "AGENT") setPartnerType("agent");
        else setPartnerType("individual");
      }
    }
  }, [isAuthenticated, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "phone") {
        // extract digits only and enforce max 9 digits, strip leading country code if pasted
        let digits = value.replace(/\D/g, "");
        if (digits.startsWith("971")) digits = digits.slice(3);
        digits = digits.slice(0, 9);
        const next = { ...prev, phone: `+971 ${digits}` };

        // If WhatsApp is not different, update WhatsApp number too
        if (!isDifferentWhatsApp) {
          next.whatsapp_number = next.phone;
        }

        // validate phone: must have exactly 9 digits and cannot start with 0
        if (digits.length !== 9) {
          setPhoneError("Enter a valid phone number with 9 digits");
        } else if (digits.startsWith("0")) {
          setPhoneError("Incorrect format");
        } else {
          setPhoneError("");
        }

        return next;
      }

      if (name === "whatsapp_number") {
        // extract digits only and enforce max 9 digits, strip leading country code if pasted
        let digits = value.replace(/\D/g, "");
        if (digits.startsWith("971")) digits = digits.slice(3);
        digits = digits.slice(0, 9);
        const next = { ...prev, whatsapp_number: `+971 ${digits}` };

        // validate WhatsApp number: must have exactly 9 digits and cannot start with 0
        if (digits.length !== 9) {
          setWhatsappError("Enter a valid WhatsApp number with 9 digits");
        } else if (digits.startsWith("0")) {
          setWhatsappError("Incorrect format");
        } else {
          setWhatsappError("");
        }

        return next;
      }

      const next = { ...prev, [name]: value };

      // email validation - require at least 2 characters after the dot
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (name === "email") {
        if (next.email && !emailRe.test(next.email)) setEmailError("Enter a valid email address");
        else setEmailError("");
      }

      // password validations
      if (name === "password") {
        if (next.password && next.password.length < 6) setPasswordError("Password must be at least 6 characters");
        else setPasswordError("");
      }

      // confirm password
      if ((name === "password" || name === "confirmPassword") && next.confirmPassword && next.password !== next.confirmPassword) {
        setConfirmError("Passwords do not match");
      } else if (name === "confirmPassword" || name === "password") {
        setConfirmError("");
      }

      // website URL validation
      if (name === "website") {
        const websiteValue = next.website?.trim() || "";
        if (websiteValue) {
          try {
            // Add protocol if missing
            let urlToValidate = websiteValue;
            if (!urlToValidate.match(/^https?:\/\//i)) {
              urlToValidate = `https://${urlToValidate}`;
            }
            // Validate URL structure
            const url = new URL(urlToValidate);
            // Check if it has a valid hostname (at least one dot for domain)
            if (!url.hostname || url.hostname.length < 3 || !url.hostname.includes('.')) {
              setWebsiteError("Please enter a valid website URL (e.g., https://example.com)");
            } else {
              setWebsiteError("");
            }
          } catch {
            setWebsiteError("Please enter a valid website URL (e.g., https://example.com)");
          }
        } else {
          setWebsiteError("");
        }
      }

      return next;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isWebsiteUrlValid = (rawUrl: string): boolean => {
    const websiteValue = rawUrl?.trim() || "";
    if (!websiteValue) return true; // optional
    try {
      let urlToValidate = websiteValue;
      if (!urlToValidate.match(/^https?:\/\//i)) {
        urlToValidate = `https://${urlToValidate}`;
      }
      const url = new URL(urlToValidate);
      return !!url.hostname && url.hostname.length >= 3 && url.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const shouldShowNextButton = (step: FormStep): boolean => {
    // Only gate Next button visibility on website validity when we are on a step that includes website.
    // Website is optional: show Next if empty or valid; hide Next if invalid.
    if (step !== "location" && !(selectedCategory === "fitness" && step === "typeSpecific")) {
      return true;
    }
    return isWebsiteUrlValid(formData.website);
  };

  // Helper function to format website URL (add https:// if missing)
  const formatWebsiteUrl = (url: string): string => {
    if (!url || !url.trim()) return "";
    let formattedUrl = url.trim();
    if (!formattedUrl.match(/^https?:\/\//i)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    return formattedUrl;
  };

  // Fitness form validation
  const isFitnessFormValid = (): boolean => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^\+971\s[1-9]\d{8}$/;
    
    if (!formData.email || !emailRe.test(formData.email)) return false;
    if (!formData.password || formData.password.length < 6) return false;
    if (formData.password !== formData.confirmPassword) return false;
    if (!formData.phone || !phoneRe.test(formData.phone) || phoneError) return false;
    if (isDifferentWhatsApp && (!formData.whatsapp_number || !phoneRe.test(formData.whatsapp_number) || whatsappError)) return false;
    if (!formData.country || !formData.state || !formData.city) return false;
    if (!formData.fullName || !formData.companyName || !formData.licenseNumber) return false;
    if (!documentFile) return false;
    if (!termsAccepted) return false;
    if (!privacyAccepted) return false;
    // Validate website URL if provided
    if (formData.website && formData.website.trim()) {
      try {
        let urlToValidate = formData.website.trim();
        if (!urlToValidate.match(/^https?:\/\//i)) {
          urlToValidate = `https://${urlToValidate}`;
        }
        new URL(urlToValidate);
      } catch {
        return false;
      }
    }
    
    return true;
  };

  // Fitness form submit handler
  const handleFitnessSignUp = async () => {
    if (!isFitnessFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();

      // Basic fields
      fd.append("email", formData.email);
      fd.append("password", formData.password);
      fd.append("password_confirm", formData.confirmPassword);
      fd.append("role", "gym_owner");
      fd.append("mobile_number", formData.phone);
      fd.append("whatsapp_number", isDifferentWhatsApp ? formData.whatsapp_number : formData.phone);
      
      // Location
      fd.append("country", formData.country); // Country ID
      fd.append("state", formData.state); // State name
      fd.append("city", formData.city);
      
      // Business info
      fd.append("full_name", formData.fullName);
      fd.append("company_name", formData.companyName);
      fd.append("license_number", formData.licenseNumber);
      if (formData.aboutMe) {
        fd.append("about_me", formData.aboutMe);
      }
      if (formData.website && formData.website.trim()) {
        const formattedWebsite = formatWebsiteUrl(formData.website);
        fd.append("website_url", formattedWebsite);
      }
      if (formData.referral_code) {
        fd.append("referral_code", formData.referral_code);
      }
      
      // Files
      if (profilePhoto) {
        const truncatedName = truncateFilename(profilePhoto.name);
        fd.append("profile_picture", profilePhoto, truncatedName);
      }
      if (documentFile) {
        const truncatedName = truncateFilename(documentFile.name);
        fd.append("document_uploads", documentFile, truncatedName);
      }


      for (const [key, value] of fd.entries()) {

      }

      // Send to main auth register endpoint, same as other registrations
      const response = await registerUserApi(fd);


      if ("data" in response && "status" in response) {
        const responseData = response.data as any;

        if (responseData?.success && responseData?.data) {
          const userData = responseData.data?.user;
          const tokens = responseData.data?.tokens;
          
          // Store tokens and user data in auth store
          if (tokens?.access && tokens?.refresh && userData) {
            const { login } = useAuthStore.getState();
            login(userData, {
              access: tokens.access,
              refresh: tokens.refresh,
            });





            // Register device for notifications
            handleDeviceRegistration();

            // Check if email verification is required
            const emailVerificationRequired = responseData.data?.email_verification_required;
            const needsVerification = emailVerificationRequired === true || userData.is_email_verified === false || userData.is_email_verified !== true;

            if (needsVerification) {
              toast({
                title: "Registration Successful",
                description: "Please verify your email to continue.",
              });
              // Navigate to email verification page
              navigate("/verify-email", { state: { email: userData.email } });
              return;
            } else {
              toast({
                title: "Registration Successful",
                description: "Welcome! Redirecting to your fitness dashboard...",
              });
              
              // Delay navigation to allow device registration to complete
              setTimeout(() => {
                navigate("/fitness/dashboard");
              }, 2000);
            }
          } else {
            toast({
              title: "Registration Successful",
              description: "Your gym owner registration has been submitted successfully!",
            });
            setShowSuccessModal(true);
          }
        } else {
          toast({
            title: "Registration Failed",
            description: responseData?.message || "Registration failed. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Fitness registration error:", error);
      toast({
        title: "Registration Failed",
        description: error?.response?.data?.message || "Registration failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    // If updating existing user, use PATCH instead of POST
    if (isUpdatingExistingUser && user?.id) {
      return handleUpdateExistingUser();
    }

    // Basic required fields already validated by isFormValid before enabling submit
    if (!isFormValid()) return;

    const fd = new FormData();

    // Common required keys per backend
    fd.append("email", formData.email);
    fd.append("password", formData.password);
    fd.append("password_confirm", formData.confirmPassword);
    fd.append("role", "owner");
    fd.append("mobile_number", formData.phone);
    
    // Add WhatsApp number: use phone if checkbox is not checked, otherwise use whatsapp_number
    if (isDifferentWhatsApp) {
      fd.append("whatsapp_number", formData.whatsapp_number);
    } else {
      fd.append("whatsapp_number", formData.phone);
    }
    
    if (formData.address) fd.append("address", formData.address);
    if (formData.website && formData.website.trim()) {
      const formattedWebsite = formatWebsiteUrl(formData.website);
      fd.append("website_url", formattedWebsite);
    }
    if (formData.country) fd.append("country", formData.country); // Send country ID
    if (formData.state) fd.append("state", formData.state); // Send state name
    if (formData.emirate) fd.append("emirate", formData.emirate); // Send emirate ID (legacy)
    if (formData.referral_code) fd.append("referral_code", formData.referral_code);

    // seller_type mapping
    const sellerType = partnerType === "company" ? "COMPANY" : partnerType === "individual" ? "INDIVIDUAL" : "AGENT";
    fd.append("seller_type", sellerType);

    // type-specific fields
    if (partnerType === "company") {
      if (formData.companyName) fd.append("company_name", formData.companyName);
      if (formData.tradeLicenseNumber) fd.append("license_number", formData.tradeLicenseNumber);
      // optional files
      if (profilePhoto) {
        const truncatedName = truncateFilename(profilePhoto.name);
        fd.append("profile_picture", profilePhoto, truncatedName);
      }
      if (documentFile) {
        const truncatedName = truncateFilename(documentFile.name);
        fd.append("document_uploads", documentFile, truncatedName);
      }
    }

    if (partnerType === "individual") {
      if (formData.fullName) fd.append("full_name", formData.fullName);
      if (formData.emiratesId) fd.append("emirates_id_number", formData.emiratesId);
      if (formData.emiratesExpiry) fd.append("emirates_id_expiry", formData.emiratesExpiry);
      // optional files
      if (profilePhoto) {
        const truncatedName = truncateFilename(profilePhoto.name);
        fd.append("profile_picture", profilePhoto, truncatedName);
      }
      if (documentFile) {
        const truncatedName = truncateFilename(documentFile.name);
        fd.append("document_uploads", documentFile, truncatedName);
      }
    }

    if (partnerType === "agent") {
      if (formData.fullName) fd.append("full_name", formData.fullName);
      if (formData.emiratesId) fd.append("emirates_id_number", formData.emiratesId);
      if (formData.reraNumber) fd.append("license_number", formData.reraNumber);
      if (formData.companyName) fd.append("company_name", formData.companyName);
      if (profilePhoto) {
        const truncatedName = truncateFilename(profilePhoto.name);
        fd.append("profile_picture", profilePhoto, truncatedName);
      }
      if (documentFile) {
        const truncatedName = truncateFilename(documentFile.name);
        fd.append("document_uploads", documentFile, truncatedName);
      }
    }

    setIsSubmitting(true);
    registerUserApi(fd)
      .then(async (res: any) => {

        setIsSubmitting(false);
        
        // Check if response has success property and it's true
        if (res?.data?.success === true) {
          const userData = res?.data?.data?.user;
          const tokens = res?.data?.data?.tokens;
          
          // If user and tokens are available, login and navigate to dashboard
          if (userData && tokens) {
            login(userData, {
              access: tokens.access,
              refresh: tokens.refresh,
            });

            // Register device for notifications
            handleDeviceRegistration();
            
            // Fetch updated user data from /users/me/ endpoint after successful registration
            try {
              const userResponse = await getCurrentUserMeApi();
              if (userResponse && 'data' in userResponse && 'status' in userResponse) {
                const responseData = userResponse.data;
                const fetchedUserData = responseData?.data || responseData;
                if (fetchedUserData) {
                  // Update Zustand store with latest data from /users/me/
                  updateUser(fetchedUserData as any);

                }
              }
            } catch (error: any) {
              console.error("Error fetching user data from /users/me/ after registration:", error);
              // Don't block navigation if this fails - user is already logged in
            }
            
            // Check if email verification is required
            const emailVerificationRequired = res?.data?.data?.email_verification_required;
            const needsVerification = emailVerificationRequired === true || userData.is_email_verified === false || userData.is_email_verified !== true;





            if (needsVerification) {

              toast({
                title: "Registration Successful",
                description: "Please verify your email to continue.",
              });
              // Navigate to email verification page
              navigate("/verify-email", { state: { email: userData.email } });
              return;
            } else {

            toast({
              title: "Registration Successful",
              description: "Welcome! Redirecting to your dashboard...",
            });
            // Delay navigation to allow device registration to complete
            setTimeout(() => {
              navigate("/partner/dashboard");
            }, 2000);
            }
          } else {
            // If no user/tokens, show success modal
            setShowSuccessModal(true);
          }
        } else {
          // Check for duplicate email error
          const errorDetail = res?.data?.errors?.detail || res?.response?.data?.errors?.detail || "";
          const isDuplicateEmail = errorDetail.includes("already exists") || 
                                   errorDetail.includes("duplicate key") ||
                                   errorDetail.includes("email") && errorDetail.includes("unique");
          
          if (isDuplicateEmail) {
            toast({
              title: "Email Already Used",
              description: "This email address is already registered. Please use a different email or try logging in.",
              variant: "destructive",
            });
          } else {
            const errorMessage = res?.data?.message || res?.response?.data?.message || "Registration failed. Please try again.";
            toast({
              title: "Registration Failed",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      })
      .catch((err) => {
        console.error("Partner register error:", err);
        setIsSubmitting(false);
        
        // Check for duplicate email error in catch block
        const errorDetail = err?.response?.data?.errors?.detail || err?.response?.data?.error?.detail || "";
        const errorMessage = err?.response?.data?.message || err?.message || "";
        const isDuplicateEmail = errorDetail.includes("already exists") || 
                                 errorDetail.includes("duplicate key") ||
                                 errorDetail.includes("email") && errorDetail.includes("unique") ||
                                 errorMessage.includes("email") && errorMessage.includes("already");
        
        if (isDuplicateEmail) {
          toast({
            title: "Email Already Used",
            description: "This email address is already registered. Please use a different email or try logging in.",
            variant: "destructive",
          });
        } else {
          const finalErrorMessage = errorMessage || "Registration failed. Please try again.";
          toast({
            title: "Registration Failed",
            description: finalErrorMessage,
            variant: "destructive",
          });
        }
      });
  };

  // Validation for updating existing user (password not required)
  const isUpdateFormValid = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^\+971\s[1-9]\d{8}$/;
    if (!formData.email || !emailRe.test(formData.email)) return false;
    if (!formData.phone || !phoneRe.test(formData.phone) || phoneError) return false;
    if (isDifferentWhatsApp && (!formData.whatsapp_number || !phoneRe.test(formData.whatsapp_number) || whatsappError)) return false;
    if (!formData.country || !formData.state) return false;

    if (partnerType === "agent") {
      if (!formData.fullName || !formData.emiratesId) return false;
    }

    if (partnerType === "company") {
      if (!formData.companyName || !formData.tradeLicenseNumber) return false;
    }

    if (partnerType === "individual") {
      if (!formData.fullName || !formData.emiratesId) return false;
    }

    return true;
  };
  
  // Get validation error message for update form
  const getUpdateFormValidationMessage = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^\+971\s[1-9]\d{8}$/;
    const missingFields: string[] = [];
    
    if (!formData.email || !emailRe.test(formData.email)) {
      missingFields.push("valid email");
    }
    if (!formData.phone || !phoneRe.test(formData.phone)) {
      missingFields.push("valid phone number");
    }
    if (isDifferentWhatsApp && (!formData.whatsapp_number || !phoneRe.test(formData.whatsapp_number))) {
      missingFields.push("valid WhatsApp number");
    }
    if (!formData.country) {
      missingFields.push("country");
    }
    if (!formData.state) {
      missingFields.push("province");
    }
    
    if (partnerType === "agent") {
      if (!formData.fullName) missingFields.push("full name");
      if (!formData.emiratesId) missingFields.push("Emirates ID");
    }
    
    if (partnerType === "company") {
      if (!formData.companyName) missingFields.push("company name");
      if (!formData.tradeLicenseNumber) missingFields.push("trade license number");
    }
    
    if (partnerType === "individual") {
      if (!formData.fullName) missingFields.push("full name");
      if (!formData.emiratesId) missingFields.push("Emirates ID");
    }
    
    if (missingFields.length > 0) {
      return `Please fill in: ${missingFields.join(", ")}`;
    }
    
    return "";
  };

  // Handle updating existing user (seeker converting to owner)
  const handleUpdateExistingUser = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not found.",
        variant: "destructive",
      });
      return;
    }

    if (!isUpdateFormValid()) {
      const validationMessage = getUpdateFormValidationMessage();
      toast({
        title: "Validation Error",
        description: validationMessage || "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      
      // Change role to owner
      fd.append("role", "owner");
      
      // Update basic fields
      if (formData.fullName) fd.append("full_name", formData.fullName);
      if (formData.phone) fd.append("mobile_number", formData.phone);
      if (formData.whatsapp_number) fd.append("whatsapp_number", formData.whatsapp_number);
      if (formData.address) fd.append("address", formData.address);
      if (formData.website && formData.website.trim()) {
        const formattedWebsite = formatWebsiteUrl(formData.website);
        fd.append("website_url", formattedWebsite);
      }
      if (formData.country) fd.append("country", formData.country); // Send country ID
      if (formData.state) fd.append("state", formData.state); // Send state name
      if (formData.emirate) fd.append("emirate", formData.emirate); // Send emirate ID (legacy)
      if (formData.referral_code) fd.append("referral_code", formData.referral_code);

      // Seller type
      const sellerType = partnerType === "company" ? "COMPANY" : partnerType === "individual" ? "INDIVIDUAL" : "AGENT";
      fd.append("seller_type", sellerType);

      // Type-specific fields
      if (partnerType === "individual") {
        if (formData.emiratesId) fd.append("emirates_id_number", formData.emiratesId);
        if (formData.emiratesExpiry) fd.append("emirates_id_expiry", formData.emiratesExpiry);
      } else if (partnerType === "agent") {
        if (formData.reraNumber) fd.append("license_number", formData.reraNumber);
        if (formData.companyName) fd.append("company_name", formData.companyName);
      } else if (partnerType === "company") {
        if (formData.companyName) fd.append("company_name", formData.companyName);
        if (formData.tradeLicenseNumber) fd.append("license_number", formData.tradeLicenseNumber);
      }

      // Files (only if new files are selected)
      if (profilePhoto) {
        const truncatedName = truncateFilename(profilePhoto.name);
        fd.append("profile_picture", profilePhoto, truncatedName);
      }
      if (documentFile) {
        const truncatedName = truncateFilename(documentFile.name);
        fd.append("document_uploads", documentFile, truncatedName);
      }

      const response = await updateUserApi(user.id, fd, "PATCH");
      
      if (response && 'data' in response && 'status' in response) {
        const responseData = response.data;
        // Handle response structure - could be array or object
        let updatedUser;
        if (Array.isArray(responseData?.data)) {
          updatedUser = responseData.data[0];
        } else if (responseData?.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
          updatedUser = responseData.data;
        } else if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          updatedUser = responseData;
        }
        
        if (updatedUser) {
          // Update Zustand store with new user data (including role change)
          updateUser(updatedUser);
          
          // Also update login state to ensure role is reflected
          if (tokens) {
            login(updatedUser, tokens);
          }
          
          toast({
            title: "Success",
            description: "Your account has been converted to partner. Redirecting to dashboard...",
          });
          
          // Navigate to dashboard
          setTimeout(() => {
            navigate("/partner/dashboard", { replace: true });
          }, 1000);
        } else {
          // If response structure is unexpected, still update with role
          updateUser({ role: "owner" });
          toast({
            title: "Success",
            description: "Your account has been converted to partner. Redirecting to dashboard...",
          });
          setTimeout(() => {
            navigate("/partner/dashboard", { replace: true });
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error("Error updating user to partner:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to convert account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    // Basic required fields for all partner types
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^\+971\s[1-9]\d{8}$/;
    if (!formData.email || !emailRe.test(formData.email)) return false;
    if (!formData.phone || !phoneRe.test(formData.phone) || phoneError) return false;
    // If WhatsApp is different, validate it too
    if (isDifferentWhatsApp && (!formData.whatsapp_number || !phoneRe.test(formData.whatsapp_number) || whatsappError)) return false;
    if (!formData.password || formData.password.length < 6) return false;
    if (!formData.confirmPassword) return false;
    if (!formData.country || !formData.state || !formData.address) return false;
    // document uploads/profile picture are optional per backend examples
    if (formData.password !== formData.confirmPassword) return false;
    // Validate website URL if provided
    if (formData.website && formData.website.trim()) {
      try {
        let urlToValidate = formData.website.trim();
        if (!urlToValidate.match(/^https?:\/\//i)) {
          urlToValidate = `https://${urlToValidate}`;
        }
        new URL(urlToValidate);
      } catch {
        return false;
      }
    }

    if (partnerType === "agent") {
      if (!formData.fullName || !formData.emiratesId || !formData.reraNumber) return false;
    }

    if (partnerType === "company") {
      if (!formData.companyName || !formData.tradeLicenseNumber) return false;
    }

    if (partnerType === "individual") {
      if (!formData.fullName || !formData.emiratesId || !formData.emiratesExpiry) return false;
    }

    if (!termsAccepted) return false;
    if (!privacyAccepted) return false;

    return true;
  };

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isSignInValid = emailRe.test(formData.email) && formData.password.trim().length >= 6;

  // Handle profile photo upload with validation and compression
  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setProfilePhoto(null);
      setFileError("");
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      setFileError("Please select an image file");
      setProfilePhoto(null);
      return;
    }

    setFileError("");
    try {
      // Compress image to max 1MB
      const compressedFile = await compressImage(file, 1);
      setProfilePhoto(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      setFileError("Failed to process image. Please try another file.");
      setProfilePhoto(null);
    }
  };

  // Handle document upload with validation and compression
  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setDocumentFile(null);
      setFileError("");
      return;
    }

    // Check if it's an image or PDF
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    
    if (!isImage && !isPDF) {
      setFileError("Please select an image file or PDF");
      setDocumentFile(null);
      return;
    }

    setFileError("");
    
    // For PDFs, compress to max 2MB
    if (isPDF) {
      try {
        const compressedFile = await compressPDF(file, 2);
        setDocumentFile(compressedFile);
        
        // Show info if file was compressed
        if (compressedFile.size < file.size) {
          const originalSize = (file.size / 1024 / 1024).toFixed(2);
          const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
          console.log(`PDF compressed from ${originalSize}MB to ${compressedSize}MB`);
        }
      } catch (error) {
        console.error("Error compressing PDF:", error);
        setFileError("Failed to compress PDF. Using original file.");
        // Use original file if compression fails
        setDocumentFile(file);
      }
      return;
    }

    // For images, compress to max 1MB
    try {
      const compressedFile = await compressImage(file, 1);
      setDocumentFile(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      setFileError("Failed to process image. Please try another file.");
      setDocumentFile(null);
    }
  };

  useEffect(() => {
    if (!profilePhoto) {
      setProfilePreview(null);
      return;
    }
    const url = URL.createObjectURL(profilePhoto);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);

  // Step navigation functions
  const getNextStep = (current: FormStep): FormStep | null => {
    if (!selectedCategory) return null;
    
    if (selectedCategory === "space") {
      const stepOrder: FormStep[] = ["category", "partnerType", "basicInfo", "location", "profilePhoto", "typeSpecific", "documents", "review"];
      const currentIndex = stepOrder.indexOf(current);
      return currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : null;
    } else if (selectedCategory === "fitness") {
      // Fitness form steps: category, basicInfo, location, typeSpecific (businessInfo), profilePhoto, documents, review
      const fitnessSteps: FormStep[] = ["category", "basicInfo", "location", "typeSpecific", "profilePhoto", "documents", "review"];
      const currentIndex = fitnessSteps.indexOf(current);
      return currentIndex < fitnessSteps.length - 1 ? fitnessSteps[currentIndex + 1] : null;
    }
    
    return null;
  };

  const getPreviousStep = (current: FormStep): FormStep | null => {
    if (!selectedCategory) return null;
    
    if (selectedCategory === "space") {
      const stepOrder: FormStep[] = ["category", "partnerType", "basicInfo", "location", "profilePhoto", "typeSpecific", "documents", "review"];
      const currentIndex = stepOrder.indexOf(current);
      return currentIndex > 0 ? stepOrder[currentIndex - 1] : null;
    } else if (selectedCategory === "fitness") {
      const fitnessSteps: FormStep[] = ["category", "basicInfo", "location", "typeSpecific", "profilePhoto", "documents", "review"];
      const currentIndex = fitnessSteps.indexOf(current);
      return currentIndex > 0 ? fitnessSteps[currentIndex - 1] : null;
    }
    
    return null;
  };

  const getValidationErrors = (step: FormStep): string[] => {
    const errors: string[] = [];
    
    switch (step) {
      case "category":
        if (!selectedCategory) errors.push("Category");
        break;
      case "partnerType":
        if (!partnerType) errors.push("Partner Type");
        break;
      case "basicInfo":
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        const phoneRe = /^\+971\s[1-9]\d{8}$/;
        
        if (!formData.email || !emailRe.test(formData.email)) {
          errors.push("Email");
        }
        if (!isUpdatingExistingUser) {
          if (!formData.password || formData.password.length < 6) {
            errors.push("Password (minimum 6 characters)");
          }
          if (!formData.confirmPassword || formData.password !== formData.confirmPassword) {
            errors.push("Confirm Password (must match)");
          }
        }
        if (!formData.phone || !phoneRe.test(formData.phone)) {
          errors.push("Phone Number");
        }
        if (isDifferentWhatsApp && (!formData.whatsapp_number || !phoneRe.test(formData.whatsapp_number))) {
          errors.push("WhatsApp Number");
        }
        break;
      case "location":
        if (!formData.country) errors.push("Country");
        if (!formData.state) errors.push("Province");
        if (selectedCategory === "fitness") {
          if (!formData.city) errors.push("City");
        } else {
          if (!formData.address) errors.push("Address");
        }
        // Validate website URL if provided
        if (formData.website && formData.website.trim()) {
          try {
            let urlToValidate = formData.website.trim();
            if (!urlToValidate.match(/^https?:\/\//i)) {
              urlToValidate = `https://${urlToValidate}`;
            }
            new URL(urlToValidate);
          } catch {
            errors.push("Website URL (invalid format)");
          }
        }
        break;
      case "profilePhoto":
        // Optional, no errors
        break;
      case "typeSpecific":
        if (selectedCategory === "fitness") {
          if (!formData.fullName) errors.push("Full Name");
          if (!formData.companyName) errors.push("Company Name");
          if (!formData.licenseNumber) errors.push("License Number");
        } else if (partnerType === "individual") {
          if (!formData.fullName) errors.push("Full Name");
          if (!formData.emiratesId) errors.push("Emirates ID Number");
          if (!formData.emiratesExpiry) errors.push("Emirates ID Expiry Date");
        } else if (partnerType === "agent") {
          if (!formData.fullName) errors.push("Full Name");
          if (!formData.emiratesId) errors.push("Emirates ID Number");
          if (!formData.reraNumber) errors.push("RERA/BRN Number");
        } else if (partnerType === "company") {
          if (!formData.companyName) errors.push("Company Name");
          if (!formData.tradeLicenseNumber) errors.push("Trade License Number");
        }
        break;
      case "documents":
        if (!documentFile) errors.push("Document Upload");
        break;
      case "review":
        // Will be validated by isFormValid
        break;
    }
    
    return errors;
  };

  const handleNextStep = () => {
    const validationErrors = getValidationErrors(currentStep);
    
    if (validationErrors.length > 0) {



      toast({
        title: "Please complete all required fields",
        description: `Missing or invalid: ${validationErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    const next = getNextStep(currentStep);
    if (next) {
      setCurrentStep(next);
    }
  };

  const handlePreviousStep = () => {
    const prev = getPreviousStep(currentStep);
    if (prev) {
      setCurrentStep(prev);
    }
  };

  // Guest signup handlers
  const handleGuestSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear error when user types
    if (guestSignupError) {
      setGuestSignupError("");
    }
    
    // Handle phone number and WhatsApp number with +971 prefix
    if (name === "mobile_number" || name === "whatsapp_number") {
      // Ensure +971 prefix is present, then extract only digits after it
      const prefix = "+971 ";
      if (!value.startsWith(prefix)) {
        // If prefix is missing, restore it
        const digitsOnly = value.replace(/\D/g, "");
        if (digitsOnly.length <= 9) {
          setGuestSignupData({ ...guestSignupData, [name]: digitsOnly });
        }
        return;
      }
      
      // Extract digits after the prefix
      const afterPrefix = value.substring(prefix.length);
      const digitsOnly = afterPrefix.replace(/\D/g, "");
      
      // Limit to 9 digits (after +971 prefix)
      if (digitsOnly.length <= 9) {
        setGuestSignupData({ ...guestSignupData, [name]: digitsOnly });
      }
    } else {
      setGuestSignupData({ ...guestSignupData, [name]: value });
    }
  };
  
  const handleGuestPhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldName: string) => {
    const input = e.currentTarget;
    const value = input.value;
    const prefix = "+971 ";
    
    // Prevent deletion of the +971 prefix
    if (e.key === "Backspace" && input.selectionStart !== null && input.selectionStart <= prefix.length) {
      e.preventDefault();
    }
    
    // Prevent cursor from being placed before the prefix
    if (input.selectionStart !== null && input.selectionStart < prefix.length) {
      setTimeout(() => {
        input.setSelectionRange(prefix.length, prefix.length);
      }, 0);
    }
  };

  const handleGuestSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestSignupError("");
    
    // Validation
    if (!guestSignupData.full_name.trim()) {
      setGuestSignupError("Full name is required");
      return;
    }
    
    if (!guestSignupData.email.trim()) {
      setGuestSignupError("Email is required");
      return;
    }
    
    // Validate phone number (must be exactly 9 digits)
    if (!guestSignupData.mobile_number || guestSignupData.mobile_number.length !== 9) {
      setGuestSignupError("Phone number must be exactly 9 digits");
      return;
    }
    
    // Validate WhatsApp number if checkbox is checked
    if (noWhatsApp && (!guestSignupData.whatsapp_number || guestSignupData.whatsapp_number.length !== 9)) {
      setGuestSignupError("WhatsApp number must be exactly 9 digits");
      return;
    }
    
    if (guestSignupData.password !== guestSignupData.password_confirm) {
      setGuestSignupError("Passwords do not match");
      return;
    }
    
    if (guestSignupData.password.length < 6) {
      setGuestSignupError("Password must be at least 6 characters");
      return;
    }

    // Validate Terms and Privacy Policy acceptance
    if (!guestTermsAccepted) {
      setGuestSignupError("You must accept the Terms & Conditions to continue");
      return;
    }

    if (!guestPrivacyAccepted) {
      setGuestSignupError("You must accept the Privacy Policy to continue");
      return;
    }

    setIsGuestSubmitting(true);

    try {
      const registerData = {
        full_name: guestSignupData.full_name,
        email: guestSignupData.email,
        password: guestSignupData.password,
        password_confirm: guestSignupData.password_confirm,
        mobile_number: `+971${guestSignupData.mobile_number}`,
        whatsapp_number: noWhatsApp && guestSignupData.whatsapp_number ? `+971${guestSignupData.whatsapp_number}` : `+971${guestSignupData.mobile_number}`,
        role: "seeker", // Default role for regular users
      };

      const response = await registerUserApi(registerData);
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data as any;
        
        if (responseData?.success) {
          const userData = responseData?.data?.user;
          const tokens = responseData?.data?.tokens;
          const emailVerificationRequired = responseData?.data?.email_verification_required;
          
          if (userData && tokens) {
            login(userData, {
              access: tokens.access,
              refresh: tokens.refresh,
            });

            // Register device for notifications
            handleDeviceRegistration();
            
            // Fetch updated user data (best effort, ignore failures)
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
              .catch(() => {});
            
            // Check if email verification is required
            const needsVerification = emailVerificationRequired === true || userData.is_email_verified === false || userData.is_email_verified !== true;

            if (needsVerification) {
              toast({
                title: "Registration Successful",
                description: "Please verify your email to continue.",
              });
              
              // Clear signup form
              setGuestSignupData({
                full_name: "",
                email: "",
                password: "",
                password_confirm: "",
                mobile_number: "",
                whatsapp_number: "",
              });
              setNoWhatsApp(false);
              setGuestSignupError("");
              setShowGuestModal(false);
              
              navigate("/verify-email", { state: { email: userData.email, redirectTo: "/" } });
              return;
            } else {
              toast({
                title: "Registration Successful",
                description: "Welcome! Your account has been created.",
              });
              
              // Clear signup form
              setGuestSignupData({
                full_name: "",
                email: "",
                password: "",
                password_confirm: "",
                mobile_number: "",
                whatsapp_number: "",
              });
              setNoWhatsApp(false);
              setGuestSignupError("");
              setShowGuestModal(false);
              
              // Navigate to home page
              setTimeout(() => {
                navigate("/");
              }, 500);
            }
          } else {
            toast({
              title: "Registration Failed",
              description: responseData?.message || "Failed to create account",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Registration Failed",
            description: responseData?.message || "Failed to create account",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error?.response?.data?.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    if (category === "space") {
      setCurrentStep("partnerType");
    } else if (category === "fitness") {
      setCurrentStep("basicInfo");
    } else if (category === "guest") {
      // Guest signup - open modal
      setShowGuestModal(true);
    } else {
      // For other categories, show coming soon
      toast({
        title: "Coming Soon",
        description: `${category === "drive" ? "My Drive" : "My Needs"} registration will be available soon.`,
      });
    }
  };

  // Step validation
  const isStepValid = (step: FormStep): boolean => {
    switch (step) {
      case "category":
        return selectedCategory !== null;
      case "partnerType":
        return partnerType !== null;
      case "basicInfo":
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        const phoneRe = /^\+971\s[1-9]\d{8}$/;
        const emailValid = formData.email !== "" && emailRe.test(formData.email);
        const passwordValid = isUpdatingExistingUser 
          ? true 
          : (formData.password !== "" && formData.password.length >= 6 && formData.password === formData.confirmPassword);
        const phoneValid = formData.phone !== "" && phoneRe.test(formData.phone);
        const whatsappValid = !isDifferentWhatsApp || (formData.whatsapp_number !== "" && phoneRe.test(formData.whatsapp_number));
        
        // Debug logging






        // Show toast with specific missing fields if validation fails
        if (!emailValid || !passwordValid || !phoneValid || !whatsappValid) {
          const missingFields: string[] = [];
          if (!emailValid) missingFields.push("Email");
          if (!passwordValid && !isUpdatingExistingUser) {
            if (!formData.password || formData.password.length < 6) {
              missingFields.push("Password (minimum 6 characters)");
            } else if (formData.password !== formData.confirmPassword) {
              missingFields.push("Confirm Password (must match)");
            }
          }
          if (!phoneValid) missingFields.push("Phone Number");
          if (!whatsappValid && isDifferentWhatsApp) missingFields.push("WhatsApp Number");

        }
        
        return emailValid && passwordValid && phoneValid && whatsappValid;
      case "location":
        // Validate website URL if provided
        let websiteValid = true;
        if (formData.website && formData.website.trim()) {
          try {
            let urlToValidate = formData.website.trim();
            if (!urlToValidate.match(/^https?:\/\//i)) {
              urlToValidate = `https://${urlToValidate}`;
            }
            new URL(urlToValidate);
            websiteValid = true;
          } catch {
            websiteValid = false;
          }
        }
        
        if (selectedCategory === "fitness") {
          // Fitness requires country, state, and city
          return formData.country !== "" && formData.state !== "" && formData.city !== "" && websiteValid;
        }
        return formData.country !== "" && formData.state !== "" && formData.address !== "" && websiteValid;
      case "profilePhoto":
        return true; // Optional
      case "typeSpecific":
        if (selectedCategory === "fitness") {
          // Fitness/Gym Owner validation
          return formData.fullName !== "" && formData.companyName !== "" && formData.licenseNumber !== "";
        } else if (partnerType === "individual") {
          return formData.fullName !== "" && formData.emiratesId !== "" && formData.emiratesExpiry !== "";
        } else if (partnerType === "agent") {
          return formData.fullName !== "" && formData.emiratesId !== "" && formData.reraNumber !== "";
        } else if (partnerType === "company") {
          return formData.companyName !== "" && formData.tradeLicenseNumber !== "";
        }
        return false;
      case "documents":
        return documentFile !== null;
      case "review":
        return isFormValid() || (isUpdatingExistingUser && isUpdateFormValid());
      default:
        return false;
    }
  };

  // Get step title and description
  const getStepInfo = (step: FormStep) => {
    if (selectedCategory === "fitness") {
      const fitnessStepInfo: Record<FormStep, { title: string; description: string }> = {
        category: { title: "Select Category", description: "Choose the category you want to Sign Up with" },
        partnerType: { title: "Partner Type", description: "Select your partner type" },
        basicInfo: { title: "Account Information", description: "Enter your email and contact details" },
        location: { title: "Location", description: "Select your country, province, and city" },
        profilePhoto: { title: "Profile Photo", description: "Upload your profile picture" },
        typeSpecific: { title: "Business Information", description: "Enter your gym/fitness center details" },
        documents: { title: "Documents", description: "Upload required documents" },
        review: { title: "Review & Submit", description: "Review your information and submit" },
      };
      return fitnessStepInfo[step];
    }
    
    const stepInfo: Record<FormStep, { title: string; description: string }> = {
      category: { title: "Select Category", description: "Choose the category you want to Sign Up with" },
      partnerType: { title: "Partner Type", description: "Select your partner type" },
      basicInfo: { title: "Account Information", description: "Enter your email and contact details" },
      location: { title: "Location", description: "Select your country and province" },
      profilePhoto: { title: "Profile Photo", description: "Upload your profile picture" },
      typeSpecific: { title: partnerType === "individual" ? "Individual Details" : partnerType === "agent" ? "Agent Details" : "Company Details", description: "Enter your specific details" },
      documents: { title: "Documents", description: "Upload required documents" },
      review: { title: "Review & Submit", description: "Review your information and submit" },
    };
    return stepInfo[step];
  };

  // Get step number for progress indicator
  const getStepNumber = (step: FormStep): number => {
    if (selectedCategory === "fitness") {
      const fitnessSteps: FormStep[] = ["category", "basicInfo", "location", "typeSpecific", "profilePhoto", "documents", "review"];
      return fitnessSteps.indexOf(step) + 1;
    }
    const stepOrder: FormStep[] = ["category", "partnerType", "basicInfo", "location", "profilePhoto", "typeSpecific", "documents", "review"];
    return stepOrder.indexOf(step) + 1;
  };

  const totalSteps = selectedCategory === "fitness" ? 7 : 8;

  const handleSignIn = async () => {
    if (!isSignInValid) return;
    
    setIsSubmitting(true);
    try {


      const loginData = {
        email: formData.email,
        password: formData.password,
      };
      
      const res: any = await loginUserApi(loginData);




      // Handle both AxiosResponse and AxiosError
      const responseData = res?.data ?? res;




      if (responseData?.success === true) {
        const tokens = responseData?.data?.tokens;
        const user = responseData?.data?.user;
        const userRole = user?.role?.toLowerCase();




        // Check if role is owner or gym_owner
        if (userRole !== "owner" && userRole !== "gym_owner") {
          toast({
            title: "Invalid Credentials",
            description: "This login is only for partners/owners.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        if (user && tokens?.access && tokens?.refresh) {
          // Store in Zustand - don't check approval status, just login if credentials are correct
          login(user, {
            access: tokens.access,
            refresh: tokens.refresh,
          });
          
          // Register device for notifications
          handleDeviceRegistration();
          
          // Fetch updated user data from /users/me/ endpoint after successful login
          try {
            const userResponse = await getCurrentUserMeApi();
            if (userResponse && 'data' in userResponse && 'status' in userResponse) {
              const responseData = userResponse.data;
              const fetchedUserData = responseData?.data || responseData;
              if (fetchedUserData) {
                // Update Zustand store with latest data from /users/me/
                updateUser(fetchedUserData as any);

              }
            }
          } catch (error: any) {
            console.error("Error fetching user data from /users/me/ after login:", error);
            // Don't block navigation if this fails - user is already logged in
          }
          
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          });
          
          // Delay navigation to allow device registration to complete
          setTimeout(() => {
            // Navigate based on role
            if (userRole === "gym_owner") {
              navigate("/fitness/dashboard");
            } else {
              navigate("/partner/dashboard");
            }
          }, 500);
        } else {
          console.error("Missing user or tokens in response");
          toast({
            title: "Error",
            description: "Login failed: Invalid response from server.",
            variant: "destructive",
          });
        }
      } else {
        // success is false
        console.error("Login failed:", responseData?.message);
        toast({
          title: "Login Failed",
          description: "Credentials not matched",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("=== Error in Partner Sign In ===");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Sign Up"
        description="Join Vionex AI as a partner to list properties, vehicles, services, or fitness offerings with smart discovery."
        canonical="https://vionex-ai.com/Signup"
      />
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </button>
          <h1 className="font-display font-bold text-lg">
            Partner with <span className="text-primary neon-text">VIONEX AI</span>
          </h1>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          {currentStep !== "category" && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Step {getStepNumber(currentStep)} of {totalSteps}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((getStepNumber(currentStep) / totalSteps) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(getStepNumber(currentStep) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === "category" ? (
            /* Category Selection Step */
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  Choose Your <span className="text-primary neon-text">Category</span>
                </h2>
                <p className="text-muted-foreground">Select the category you want to Sign Up with</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
                {[
                  { id: "space" as Category, label: "My Space", icon: Home, description: "Real Estate", color: "from-neon-cyan to-neon-blue" },
                  // { id: "drive" as Category, label: "My Drive", icon: Car, description: "Vehicles", color: "from-neon-blue to-neon-purple" },
                  // { id: "needs" as Category, label: "My Needs", icon: ShoppingBag, description: "Personal Items", color: "from-neon-purple to-neon-pink" },
                  { id: "fitness" as Category, label: "My Fitness", icon: Dumbbell, description: "Fitness & Wellness", color: "from-neon-cyan to-neon-purple" },
                  { id: "guest" as Category, label: "Guest", icon: UserCircle, description: "Buyer Registration", color: "from-neon-purple to-neon-pink" },
                ].map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`group relative overflow-hidden bg-card border-2 rounded-2xl p-8 text-left transition-all duration-300 w-full max-w-md ${
                        selectedCategory === category.id
                          ? "border-primary shadow-neon scale-105"
                          : "border-glass-border hover:border-primary/50 hover:shadow-lg"
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative z-10">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-display text-xl font-bold text-foreground mb-2">{category.label}</h3>
                        <p className="text-muted-foreground">{category.description}</p>
                        {selectedCategory === category.id && (
                          <div className="mt-4 flex items-center gap-2 text-primary">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Selected</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : selectedCategory === "space" ? (
            /* My Space Registration Form - Multi-step */
            <div className="space-y-6">
              {/* Step Header */}
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  {getStepInfo(currentStep).title}
                </h2>
                <p className="text-muted-foreground">{getStepInfo(currentStep).description}</p>
              </div>

              {/* Step Content */}
              {currentStep === "partnerType" ? (
                /* Partner Type Selection Step */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                  <Label className="text-lg font-semibold">Partner Type</Label>
                  <div className="space-y-3">
                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        partnerType === "individual"
                          ? "border-primary bg-primary/10"
                          : "border-glass-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={partnerType === "individual"}
                        onCheckedChange={() => setPartnerType("individual")}
                      />
                      <User className="w-6 h-6 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">Individual</span>
                        <p className="text-sm text-muted-foreground">Only sell your own property</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        partnerType === "agent"
                          ? "border-primary bg-primary/10"
                          : "border-glass-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={partnerType === "agent"}
                        onCheckedChange={() => setPartnerType("agent")}
                      />
                      <User className="w-6 h-6 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">Agent</span>
                        <p className="text-sm text-muted-foreground">Can list/sell multiple properties</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        partnerType === "company"
                          ? "border-primary bg-primary/10"
                          : "border-glass-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={partnerType === "company"}
                        onCheckedChange={() => setPartnerType("company")}
                      />
                      <Building2 className="w-6 h-6 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">Real Estate Company</span>
                        <p className="text-sm text-muted-foreground">Registered UAE business entity</p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : currentStep === "basicInfo" ? (
                /* Basic Info Step */
                <div 
                  className="bg-card border border-glass-border rounded-xl p-6 space-y-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isStepValid("basicInfo")) {
                      e.preventDefault();
                      handleNextStep();
                    }
                  }}
                >
                  <Label className="text-lg font-semibold">Account Credentials</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail">Email <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signupEmail"
                          name="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                      {emailError && (
                        <p className="text-sm text-destructive mt-1">{emailError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referralCode">Referral Code (optional)</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="referralCode"
                          name="referral_code"
                          placeholder="Enter referral code"
                          value={formData.referral_code}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                          disabled={isReferralLocked}
                        />
                      </div>
                      {isReferralLocked && (
                        <p className="text-xs text-muted-foreground">
                          Auto-filled from referral link.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPhone">Phone <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signupPhone"
                          name="phone"
                          placeholder="+971 XX XXX XXXX"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                      {phoneError && (
                        <p className="text-sm text-destructive mt-1">{phoneError}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="different-whatsapp-partner"
                        checked={isDifferentWhatsApp}
                        onCheckedChange={(checked) => {
                          setIsDifferentWhatsApp(checked as boolean);
                          if (!checked) {
                            setFormData((prev) => ({ ...prev, whatsapp_number: prev.phone }));
                            setWhatsappError("");
                          }
                        }}
                      />
                      <Label
                        htmlFor="different-whatsapp-partner"
                        className="text-sm font-normal cursor-pointer"
                      >
                        This is not my WhatsApp number
                      </Label>
                    </div>
                    {isDifferentWhatsApp && (
                      <div className="space-y-2">
                        <Label htmlFor="signupWhatsApp">WhatsApp Number <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signupWhatsApp"
                            name="whatsapp_number"
                            placeholder="+971 XX XXX XXXX"
                            value={formData.whatsapp_number}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && isStepValid("basicInfo")) {
                                e.preventDefault();
                                handleNextStep();
                              }
                            }}
                            className="pl-10 bg-muted/30 border-glass-border"
                          />
                        </div>
                        {whatsappError && (
                          <p className="text-sm text-destructive mt-1">{whatsappError}</p>
                        )}
                      </div>
                    )}
                    {!isUpdatingExistingUser && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="signupPassword">Password <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signupPassword"
                              name="password"
                              type="password"
                              placeholder="••••••••"
                              value={formData.password}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                          {passwordError && (
                            <p className="text-sm text-destructive mt-1">{passwordError}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type="password"
                              placeholder="••••••••"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                          {confirmError && (
                            <p className="text-sm text-destructive mt-1">{confirmError}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {isUpdatingExistingUser && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-3">
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                          <strong>Note:</strong> You're updating your existing account. Password fields are not required. Your account will be converted to a partner account.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentStep === "location" ? (
                /* Location Step */
                <div className="space-y-6">
                  <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                    <Label className="text-lg font-semibold">Location <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Country <span className="text-destructive">*</span></Label>
                        <Select 
                          value={formData.country} 
                          onValueChange={(v) => handleSelectChange("country", v)}
                          disabled={isLoadingCountries || countries.length === 0}
                        >
                          <SelectTrigger className="bg-muted/30 border-glass-border">
                            <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : countries.length === 0 ? "No countries available" : "Select country"} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={country.id?.toString() || ""}>
                                <div className="flex items-center gap-2">
                                  {country.flag_image_url && (
                                    <img
                                      src={country.flag_image_url}
                                      alt={country.name}
                                      className="w-5 h-4 object-cover rounded"
                                    />
                                  )}
                                  <span>{country.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Province <span className="text-destructive">*</span></Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(v) => handleSelectChange("state", v)}
                          disabled={!formData.country || isLoadingStates || states.length === 0}
                        >
                          <SelectTrigger className="bg-muted/30 border-glass-border">
                            <SelectValue placeholder={
                              !formData.country 
                                ? "Select country first" 
                                : isLoadingStates 
                                ? "Loading provinces..." 
                                : states.length === 0 
                                ? "No provinces available" 
                                : "Select province"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.name} value={state.name}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                    <Label className="text-lg font-semibold">Address <span className="text-destructive">*</span></Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          name="address"
                          placeholder="Your address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                    <Label className="text-lg font-semibold">Website</Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          placeholder="https://example.com"
                          value={formData.website}
                          onChange={handleInputChange}
                          onBlur={(e) => {
                            // Validate on blur as well
                            if (e.target.value.trim()) {
                              handleInputChange(e);
                            }
                          }}
                          className={`bg-muted/30 border-glass-border ${websiteError ? "border-destructive" : ""}`}
                        />
                      </div>
                      {websiteError && (
                        <p className="text-sm text-destructive mt-1">{websiteError}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : currentStep === "profilePhoto" ? (
                /* Profile Photo Step */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <Label className="text-xl font-semibold">Profile Photo</Label>
                  <p className="text-sm text-muted-foreground">Upload a profile photo — shown on your public profile</p>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <label className="relative group cursor-pointer">
                      <div className="w-40 h-40 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden border-4 border-dashed border-primary/30 group-hover:border-primary transition-all duration-200 shadow-lg">
                        {profilePreview ? (
                          <img src={profilePreview} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <User className="w-16 h-16" />
                            <span className="text-sm font-medium">No Photo</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm font-semibold">Click to Upload</span>
                        </div>
                      </div>
                      <input
                        id="profile-photo-input-main"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePhotoChange}
                      />
                    </label>
                    <div className="text-center space-y-2 w-full max-w-md">
                      <Label htmlFor="profile-photo-input-main" className="cursor-pointer w-full">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full"
                          asChild
                        >
                          <span>
                            <Upload className="w-5 h-5 mr-2" />
                            {profilePhoto ? "Change Photo" : "Choose Photo"}
                          </span>
                        </Button>
                      </Label>
                      {profilePhoto ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-sm">{profilePhoto.name}</p>
                          <p className="text-xs text-muted-foreground">File selected successfully</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No photo uploaded yet</p>
                      )}
                      <p className="text-xs text-muted-foreground pt-2">
                        Recommended: 400x400px, JPG/PNG format<br />
                        Max size: 5MB 
                      </p>
                      {fileError && profilePhoto && (
                        <p className="text-sm text-destructive mt-2 font-medium">{fileError}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : currentStep === "typeSpecific" ? (
                /* Type-Specific Fields Step */
                <div className="space-y-6">
                  {partnerType === "individual" && (
                    <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                      <Label className="text-lg font-semibold">Individual Details</Label>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="individualFullName">Full Name (as per Emirates ID) <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="individualFullName"
                              name="fullName"
                              placeholder="Enter your full name"
                              value={formData.fullName}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emiratesId">Emirates ID Number <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="emiratesId"
                              name="emiratesId"
                              placeholder="784-XXXX-XXXXXXX-X"
                              value={formData.emiratesId}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emiratesExpiry">Emirates ID Expiry Date <span className="text-destructive">*</span></Label>
                          <DatePicker
                              id="emiratesExpiry"
                              name="emiratesExpiry"
                            value={formData.emiratesExpiry || undefined}
                            onChange={(date) => {
                              const dateString = date ? format(date, "yyyy-MM-dd") : "";
                              handleInputChange({
                                target: { name: "emiratesExpiry", value: dateString }
                              } as React.ChangeEvent<HTMLInputElement>);
                            }}
                            placeholder="Select expiry date"
                            className="bg-muted/30 border-glass-border hover:border-primary/50"
                            />
                        </div>
                      </div>
                    </div>
                  )}

                  {partnerType === "agent" && (
                    <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                      <Label className="text-lg font-semibold">Agent Details (UAE Law Compliant)</Label>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name (as per Emirates ID) <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fullName"
                              name="fullName"
                              placeholder="Enter your full name"
                              value={formData.fullName}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emiratesId">Emirates ID Number <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="emiratesId"
                              name="emiratesId"
                              placeholder="784-XXXX-XXXXXXX-X"
                              value={formData.emiratesId}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reraNumber">RERA/BRN Number <span className="text-destructive">*</span></Label>
                          <Input
                            id="reraNumber"
                            name="reraNumber"
                            placeholder="RERA Number"
                            value={formData.reraNumber}
                            onChange={handleInputChange}
                            className="bg-muted/30 border-glass-border"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {partnerType === "company" && (
                    <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                      <Label className="text-lg font-semibold">Company Details (UAE Law Compliant)</Label>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name (as per Trade License) <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="companyName"
                              name="companyName"
                              placeholder="Enter company name"
                              value={formData.companyName}
                              onChange={handleInputChange}
                              className="pl-10 bg-muted/30 border-glass-border"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tradeLicenseNumber">Trade License Number <span className="text-destructive">*</span></Label>
                          <Input
                            id="tradeLicenseNumber"
                            name="tradeLicenseNumber"
                            placeholder="License Number"
                            value={formData.tradeLicenseNumber}
                            onChange={handleInputChange}
                            className="bg-muted/30 border-glass-border"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : currentStep === "documents" ? (
                /* Documents Step */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                  <Label className="text-lg font-semibold">
                    Document Upload <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {partnerType === "agent" 
                      ? "Upload your Emirates ID and RERA certificate " 
                      : partnerType === "individual"
                      ? "Upload your Emirates ID "
                      : "Upload your Trade License and Company registration documents "
                    }
                  </p>
                  <label className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    documentFile 
                      ? "border-primary bg-primary/10" 
                      : "border-glass-border hover:border-primary/50 hover:bg-primary/5"
                  }`}>
                    <Upload className={`w-10 h-10 ${documentFile ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      {documentFile ? (
                        <>
                          <p className="font-medium text-primary">{documentFile.name}</p>
                          <p className="text-sm text-muted-foreground">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-foreground">Click to upload document</p>
                          <p className="text-sm text-muted-foreground">Image or PDF (Images: Max 5MB | PDFs: Max 10MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleDocumentChange}
                    />
                  </label>
                  {fileError && documentFile && (
                    <p className="text-xs text-destructive">{fileError}</p>
                  )}
                  {!documentFile && (
                    <p className="text-xs text-destructive">* Document upload is mandatory for registration</p>
                  )}
                </div>
              ) : currentStep === "review" ? (
                /* Review Step */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-6">
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">Review Your Information</h3>
                    <p className="text-muted-foreground">Please review all details before submitting</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Account Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-foreground">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="text-foreground">{formData.phone}</span>
                        </div>
                        {isDifferentWhatsApp && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">WhatsApp:</span>
                            <span className="text-foreground">{formData.whatsapp_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Location</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Country:</span>
                          <span className="text-foreground">{countries.find(c => c.id?.toString() === formData.country)?.name || "Not selected"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Province:</span>
                          <span className="text-foreground">{formData.state || "Not selected"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="text-foreground">{formData.address || "Not provided"}</span>
                        </div>
                      </div>
                    </div>

                    {partnerType === "individual" && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-3">Individual Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Full Name:</span>
                            <span className="text-foreground">{formData.fullName || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Emirates ID:</span>
                            <span className="text-foreground">{formData.emiratesId || "Not provided"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {partnerType === "agent" && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-3">Agent Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Full Name:</span>
                            <span className="text-foreground">{formData.fullName || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Emirates ID:</span>
                            <span className="text-foreground">{formData.emiratesId || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">RERA Number:</span>
                            <span className="text-foreground">{formData.reraNumber || "Not provided"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {partnerType === "company" && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-3">Company Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Company Name:</span>
                            <span className="text-foreground">{formData.companyName || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Trade License:</span>
                            <span className="text-foreground">{formData.tradeLicenseNumber || "Not provided"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Documents</h4>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Document: </span>
                        <span className="text-foreground">{documentFile ? documentFile.name : "Not uploaded"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-glass-border space-y-4">
                    {/* Terms and Privacy Policy Checkboxes */}
                    {!isUpdatingExistingUser && (
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="partner-terms-accept"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            className="mt-1"
                          />
                          <Label
                            htmlFor="partner-terms-accept"
                            className="text-sm font-normal cursor-pointer leading-tight"
                          >
                            I agree to the{" "}
                            <a
                              href="/terms-and-conditions"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Terms & Conditions
                            </a>
                          </Label>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="partner-privacy-accept"
                            checked={privacyAccepted}
                            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                            className="mt-1"
                          />
                          <Label
                            htmlFor="partner-privacy-accept"
                            className="text-sm font-normal cursor-pointer leading-tight"
                          >
                            I agree to the{" "}
                            <a
                              href="/privacy-policy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Privacy Policy
                            </a>
                          </Label>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="neon"
                      size="lg"
                      className={`w-full transition-opacity ${
                        isUpdatingExistingUser 
                          ? (isUpdateFormValid() ? "opacity-100" : "opacity-60") 
                          : (isFormValid() ? "opacity-100" : "opacity-60")
                      }`}
                      onClick={handleSignUp}
                      disabled={isSubmitting || (isUpdatingExistingUser ? !isUpdateFormValid() : !isFormValid())}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          {isUpdatingExistingUser ? "Updating..." : "Submitting..."}
                        </span>
                      ) : (
                        isUpdatingExistingUser ? "Convert to Partner" : "Submit Registration"
                      )}
                    </Button>
                    {!isUpdatingExistingUser && (
                      <p className="text-xs text-muted-foreground text-center">
                      By registering, you agree to comply with UAE Real Estate Regulatory Agency (RERA) guidelines
                    </p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Navigation Buttons - My Space */}
              {currentStep !== "review" && (
                <div className="space-y-4 pt-6">
                  {/* Error Message - Above buttons on mobile */}
                  {!isStepValid(currentStep) && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive text-center">
                        Please fill all required fields correctly to continue. Check the fields above for errors.
                      </p>
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      onClick={handlePreviousStep}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    {shouldShowNextButton(currentStep) && (
                      <Button
                        variant="neon"
                        onClick={handleNextStep}
                        disabled={!isStepValid(currentStep)}
                        className="flex items-center gap-2"
                        type="button"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : selectedCategory === "fitness" ? (
            /* My Fitness Registration Form - Multi-step */
            <div className="space-y-6">
              {/* Step Header */}
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  {getStepInfo(currentStep).title}
                </h2>
                <p className="text-muted-foreground">{getStepInfo(currentStep).description}</p>
              </div>

              {/* Step Content */}
              {currentStep === "basicInfo" ? (
                /* Basic Info Step - Same as My Space */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                  <Label className="text-lg font-semibold">Account Credentials</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fitnessEmail">Email <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fitnessEmail"
                          name="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                      {emailError && (
                        <p className="text-sm text-destructive mt-1">{emailError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fitnessPhone">Phone <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fitnessPhone"
                          name="phone"
                          placeholder="+971 XX XXX XXXX"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                      {phoneError && (
                        <p className="text-sm text-destructive mt-1">{phoneError}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="different-whatsapp-fitness"
                        checked={isDifferentWhatsApp}
                        onCheckedChange={(checked) => {
                          setIsDifferentWhatsApp(checked as boolean);
                          if (!checked) {
                            setFormData((prev) => ({ ...prev, whatsapp_number: prev.phone }));
                            setWhatsappError("");
                          }
                        }}
                      />
                      <Label
                        htmlFor="different-whatsapp-fitness"
                        className="text-sm font-normal cursor-pointer"
                      >
                        This is not my WhatsApp number
                      </Label>
                    </div>
                    {isDifferentWhatsApp && (
                      <div className="space-y-2">
                        <Label htmlFor="fitnessWhatsApp">WhatsApp Number <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fitnessWhatsApp"
                            name="whatsapp_number"
                            placeholder="+971 XX XXX XXXX"
                            value={formData.whatsapp_number}
                            onChange={handleInputChange}
                            className="pl-10 bg-muted/30 border-glass-border"
                          />
                        </div>
                        {whatsappError && (
                          <p className="text-sm text-destructive mt-1">{whatsappError}</p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fitnessPassword">Password <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fitnessPassword"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="pl-10 bg-muted/30 border-glass-border"
                          />
                        </div>
                        {passwordError && (
                          <p className="text-sm text-destructive mt-1">{passwordError}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fitnessConfirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fitnessConfirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="pl-10 bg-muted/30 border-glass-border"
                          />
                        </div>
                        {confirmError && (
                          <p className="text-sm text-destructive mt-1">{confirmError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentStep === "location" ? (
                /* Location Step - Fitness (with City instead of Address) */
                <div className="space-y-6">
                  <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                    <Label className="text-lg font-semibold">Location <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Country <span className="text-destructive">*</span></Label>
                        <Select 
                          value={formData.country} 
                          onValueChange={(v) => handleSelectChange("country", v)}
                          disabled={isLoadingCountries || countries.length === 0}
                        >
                          <SelectTrigger className="bg-muted/30 border-glass-border">
                            <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : countries.length === 0 ? "No countries available" : "Select country"} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={country.id?.toString() || ""}>
                                <div className="flex items-center gap-2">
                                  {country.flag_image_url && (
                                    <img
                                      src={country.flag_image_url}
                                      alt={country.name}
                                      className="w-5 h-4 object-cover rounded"
                                    />
                                  )}
                                  <span>{country.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Province <span className="text-destructive">*</span></Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(v) => handleSelectChange("state", v)}
                          disabled={!formData.country || isLoadingStates || states.length === 0}
                        >
                          <SelectTrigger className="bg-muted/30 border-glass-border">
                            <SelectValue placeholder={
                              !formData.country 
                                ? "Select country first" 
                                : isLoadingStates 
                                ? "Loading provinces..." 
                                : states.length === 0 
                                ? "No provinces available" 
                                : "Select province"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.name} value={state.name}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="fitnessCity">City <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fitnessCity"
                            name="city"
                            placeholder="Enter city name"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="pl-10 bg-muted/30 border-glass-border"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentStep === "typeSpecific" ? (
                /* Business Info Step - Fitness */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                  <Label className="text-lg font-semibold">Business Information <span className="text-destructive">*</span></Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fitnessFullName">Full Name <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fitnessFullName"
                          name="fullName"
                          placeholder="Enter your full name"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fitnessCompanyName">Company Name <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fitnessCompanyName"
                          name="companyName"
                          placeholder="Enter company/gym name"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fitnessLicenseNumber">License Number <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fitnessLicenseNumber"
                          name="licenseNumber"
                          placeholder="Enter license number"
                          value={formData.licenseNumber}
                          onChange={handleInputChange}
                          className="pl-10 bg-muted/30 border-glass-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fitnessAboutMe">About Me / Business Description</Label>
                      <textarea
                        id="fitnessAboutMe"
                        name="aboutMe"
                        placeholder="Tell us about your fitness center or gym..."
                        value={formData.aboutMe}
                        onChange={(e) => handleInputChange(e as any)}
                        rows={4}
                        className="w-full px-3 py-2 bg-muted/30 border border-glass-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fitnessWebsite">Website</Label>
                      <Input
                        id="fitnessWebsite"
                        name="website"
                        type="url"
                        placeholder="https://example.com"
                        value={formData.website}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          // Validate on blur as well
                          if (e.target.value.trim()) {
                            handleInputChange(e);
                          }
                        }}
                        className={`bg-muted/30 border-glass-border ${websiteError ? "border-destructive" : ""}`}
                      />
                      {websiteError && (
                        <p className="text-sm text-destructive mt-1">{websiteError}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : currentStep === "profilePhoto" ? (
                /* Profile Photo Step - Same as My Space */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <Label className="text-xl font-semibold">Profile Photo</Label>
                  <p className="text-sm text-muted-foreground">Upload a profile photo — shown on your public profile</p>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <label className="relative group cursor-pointer">
                      <div className="w-40 h-40 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden border-4 border-dashed border-primary/30 group-hover:border-primary transition-all duration-200 shadow-lg">
                        {profilePreview ? (
                          <img src={profilePreview} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <User className="w-16 h-16" />
                            <span className="text-sm font-medium">No Photo</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm font-semibold">Click to Upload</span>
                        </div>
                      </div>
                      <input
                        id="profile-photo-input-fitness"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePhotoChange}
                      />
                    </label>
                    <div className="text-center space-y-2 w-full max-w-md">
                      <Label htmlFor="profile-photo-input-fitness" className="cursor-pointer w-full">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full"
                          asChild
                        >
                          <span>
                            <Upload className="w-5 h-5 mr-2" />
                            {profilePhoto ? "Change Photo" : "Choose Photo"}
                          </span>
                        </Button>
                      </Label>
                      {profilePhoto ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-sm">{profilePhoto.name}</p>
                          <p className="text-xs text-muted-foreground">File selected successfully</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No photo uploaded yet</p>
                      )}
                      <p className="text-xs text-muted-foreground pt-2">
                        Recommended: 400x400px, JPG/PNG format<br />
                        Max size: 5MB (will be compressed to 1MB)
                      </p>
                      {fileError && profilePhoto && (
                        <p className="text-sm text-destructive mt-2 font-medium">{fileError}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : currentStep === "documents" ? (
                /* Documents Step - Same as My Space */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
                  <Label className="text-lg font-semibold">
                    Document Upload <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upload your business license and registration documents (Image or PDF, Max 5MB for images/compressed to 1MB, Max 10MB for PDFs/compressed to 2MB)
                  </p>
                  <label className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    documentFile 
                      ? "border-primary bg-primary/10" 
                      : "border-glass-border hover:border-primary/50 hover:bg-primary/5"
                  }`}>
                    <Upload className={`w-10 h-10 ${documentFile ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      {documentFile ? (
                        <>
                          <p className="font-medium text-primary">{documentFile.name}</p>
                          <p className="text-sm text-muted-foreground">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-foreground">Click to upload document</p>
                          <p className="text-sm text-muted-foreground">Image or PDF (Images: Max 5MB | PDFs: Max 10MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleDocumentChange}
                    />
                  </label>
                  {fileError && documentFile && (
                    <p className="text-xs text-destructive">{fileError}</p>
                  )}
                  {!documentFile && (
                    <p className="text-xs text-destructive">* Document upload is mandatory for registration</p>
                  )}
                </div>
              ) : currentStep === "review" ? (
                /* Review Step - Fitness */
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-6">
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">Review Your Information</h3>
                    <p className="text-muted-foreground">Please review all details before submitting</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Account Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-foreground">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="text-foreground">{formData.phone}</span>
                        </div>
                        {isDifferentWhatsApp && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">WhatsApp:</span>
                            <span className="text-foreground">{formData.whatsapp_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Location</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Country:</span>
                          <span className="text-foreground">{countries.find(c => c.id?.toString() === formData.country)?.name || "Not selected"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Province:</span>
                          <span className="text-foreground">{formData.state || "Not selected"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">City:</span>
                          <span className="text-foreground">{formData.city || "Not provided"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Business Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Full Name:</span>
                          <span className="text-foreground">{formData.fullName || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Company Name:</span>
                          <span className="text-foreground">{formData.companyName || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">License Number:</span>
                          <span className="text-foreground">{formData.licenseNumber || "Not provided"}</span>
                        </div>
                        {formData.aboutMe && (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground mb-1">About:</span>
                            <span className="text-foreground">{formData.aboutMe}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Documents</h4>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Document: </span>
                        <span className="text-foreground">{documentFile ? documentFile.name : "Not uploaded"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-glass-border space-y-4">
                    {/* Terms and Privacy Policy Checkboxes */}
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="fitness-terms-accept"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                          className="mt-1"
                        />
                        <Label
                          htmlFor="fitness-terms-accept"
                          className="text-sm font-normal cursor-pointer leading-tight"
                        >
                          I agree to the{" "}
                          <a
                            href="/terms-and-conditions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Terms & Conditions
                          </a>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="fitness-privacy-accept"
                          checked={privacyAccepted}
                          onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                          className="mt-1"
                        />
                        <Label
                          htmlFor="fitness-privacy-accept"
                          className="text-sm font-normal cursor-pointer leading-tight"
                        >
                          I agree to the{" "}
                          <a
                            href="/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Privacy Policy
                          </a>
                        </Label>
                      </div>
                    </div>

                    <Button
                      variant="neon"
                      size="lg"
                      className="w-full"
                      onClick={handleFitnessSignUp}
                      disabled={isSubmitting || !isFitnessFormValid()}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </span>
                      ) : (
                        "Submit Registration"
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Navigation Buttons - Fitness */}
              {currentStep !== "review" && (
                <div className="space-y-4 pt-6">
                  {/* Error Message - Above buttons on mobile */}
                  {!isStepValid(currentStep) && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive text-center">
                        Please fill all required fields correctly to continue. Check the fields above for errors.
                      </p>
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      onClick={handlePreviousStep}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    {shouldShowNextButton(currentStep) && (
                      <Button
                        variant="neon"
                        onClick={handleNextStep}
                        disabled={!isStepValid(currentStep)}
                        className="flex items-center gap-2"
                        type="button"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="font-display text-2xl">
              Registration <span className="text-primary neon-text">Submitted!</span>
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Your application has been successfully submitted and is now under review.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 rounded-xl p-4 space-y-3 my-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm text-foreground">Documents received</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-foreground">Verification in progress (24-48 hours)</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">You will receive an email/SMS notification</span>
            </div>
          </div>
          <Button variant="neon" className="w-full" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </DialogContent>
      </Dialog>

      {/* Guest Signup Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="sm:max-w-md bg-card border-glass-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-2xl">
              Guest <span className="text-primary neon-text">Registration</span>
            </DialogTitle>
            <DialogDescription className="text-center">
              Create an account to browse and contact property owners
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuestSignup} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-name"
                  name="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={guestSignupData.full_name}
                  onChange={handleGuestSignupChange}
                  className="pl-10 bg-muted/30 border-glass-border"
                  required
                  disabled={isGuestSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={guestSignupData.email}
                  onChange={handleGuestSignupChange}
                  className="pl-10 bg-muted/30 border-glass-border"
                  required
                  disabled={isGuestSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-phone"
                  name="mobile_number"
                  type="tel"
                  value={guestSignupData.mobile_number ? `+971 ${guestSignupData.mobile_number}` : "+971 "}
                  onChange={handleGuestSignupChange}
                  onKeyDown={(e) => handleGuestPhoneKeyDown(e, "mobile_number")}
                  onFocus={(e) => {
                    const prefix = "+971 ";
                    if (e.target.selectionStart !== null && e.target.selectionStart < prefix.length) {
                      e.target.setSelectionRange(prefix.length, prefix.length);
                    }
                  }}
                  className="pl-10 bg-muted/30 border-glass-border"
                  maxLength={15}
                  required
                  disabled={isGuestSubmitting}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="guest-no-whatsapp"
                checked={noWhatsApp}
                onCheckedChange={(checked) => {
                  setNoWhatsApp(checked as boolean);
                  if (!checked) {
                    setGuestSignupData({ ...guestSignupData, whatsapp_number: "" });
                  }
                  if (guestSignupError) {
                    setGuestSignupError("");
                  }
                }}
              />
              <Label
                htmlFor="guest-no-whatsapp"
                className="text-sm font-normal cursor-pointer"
              >
                This is not my WhatsApp number
              </Label>
            </div>

            {noWhatsApp && (
              <div className="space-y-2">
                <Label htmlFor="guest-whatsapp">WhatsApp Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-whatsapp"
                    name="whatsapp_number"
                    type="tel"
                    value={guestSignupData.whatsapp_number ? `+971 ${guestSignupData.whatsapp_number}` : "+971 "}
                    onChange={handleGuestSignupChange}
                    onKeyDown={(e) => handleGuestPhoneKeyDown(e, "whatsapp_number")}
                    onFocus={(e) => {
                      const prefix = "+971 ";
                      if (e.target.selectionStart !== null && e.target.selectionStart < prefix.length) {
                        e.target.setSelectionRange(prefix.length, prefix.length);
                      }
                    }}
                    className="pl-10 bg-muted/30 border-glass-border"
                    maxLength={15}
                    required={noWhatsApp}
                    disabled={isGuestSubmitting}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="guest-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-password"
                  name="password"
                  type={showGuestPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={guestSignupData.password}
                  onChange={handleGuestSignupChange}
                  className="pl-10 pr-10 bg-muted/30 border-glass-border"
                  required
                  disabled={isGuestSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowGuestPassword(!showGuestPassword)}
                >
                  {showGuestPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-confirm-password"
                  name="password_confirm"
                  type={showGuestConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={guestSignupData.password_confirm}
                  onChange={handleGuestSignupChange}
                  className="pl-10 pr-10 bg-muted/30 border-glass-border"
                  required
                  disabled={isGuestSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowGuestConfirmPassword(!showGuestConfirmPassword)}
                >
                  {showGuestConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Terms and Privacy Policy Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="guest-terms-accept"
                  checked={guestTermsAccepted}
                  onCheckedChange={(checked) => {
                    setGuestTermsAccepted(checked as boolean);
                    if (guestSignupError) setGuestSignupError("");
                  }}
                  className="mt-1"
                />
                <Label
                  htmlFor="guest-terms-accept"
                  className="text-sm font-normal cursor-pointer leading-tight"
                >
                  I agree to the{" "}
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms & Conditions
                  </a>
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="guest-privacy-accept"
                  checked={guestPrivacyAccepted}
                  onCheckedChange={(checked) => {
                    setGuestPrivacyAccepted(checked as boolean);
                    if (guestSignupError) setGuestSignupError("");
                  }}
                  className="mt-1"
                />
                <Label
                  htmlFor="guest-privacy-accept"
                  className="text-sm font-normal cursor-pointer leading-tight"
                >
                  I agree to the{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                </Label>
              </div>
            </div>

            {guestSignupError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {guestSignupError}
              </div>
            )}

            <Button
              type="submit"
              variant="neon"
              className="w-full"
              disabled={isGuestSubmitting || !guestTermsAccepted || !guestPrivacyAccepted}
            >
              {isGuestSubmitting ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Partner;
