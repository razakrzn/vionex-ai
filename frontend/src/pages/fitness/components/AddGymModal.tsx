import { useState, useEffect } from "react";
import { X, Upload, MapPin, Clock, Users, Loader2, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { truncateFilename } from "@/utils/fileUtils";
import { getGymTypesApi, getFacilitiesApi, createGymApi, updateGymApi, getGymByIdApi, type GymType, type Facility, type Gym } from "@/services/admin/fitness";
import { MapPicker } from "@/pages/partner/components/MapPicker";

interface AddGymModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  gymId?: number; // If provided, this is edit mode
}

interface ImageFile {
  file: File | null; // null for existing images from API
  preview: string;
  id: string;
  existingImageId?: number; // ID from API for existing images
  isExisting?: boolean; // true if this is an existing image from API
}

interface GymPackage {
  id?: number; // For existing packages in edit mode
  title: string;
  price: string;
  duration: string;
  description: string;
  isNew?: boolean; // Track if this is a new package
  isModified?: boolean; // Track if existing package was modified
}

type FormStep = "basic" | "location" | "details" | "packages";

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

const DRAFT_STORAGE_KEY = "add-gym-draft";

const getDefaultFormData = () => ({
  name: "",
  gym_type_id: "",
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  opening_time: "",
  closing_time: "",
  is_24_hours: false,
  gender_allowed: "MIXED",
  facility_ids: [] as number[],
  off_day: [] as string[],
  social_media: {
    facebook: "",
    instagram: "",
  },
});

export const AddGymModal = ({ isOpen, onOpenChange, onSuccess, gymId }: AddGymModalProps) => {
  const isEditMode = !!gymId;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentStep, setCurrentStep] = useState<FormStep>("basic");
  
  // Loading modal state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [compressingCount, setCompressingCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  
  // Dropdown data
  const [gymTypes, setGymTypes] = useState<GymType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  
  // Form data
  const [formData, setFormData] = useState(getDefaultFormData);

  // Packages state
  const [packages, setPackages] = useState<GymPackage[]>([]);
  const [packagesToDelete, setPackagesToDelete] = useState<number[]>([]);
  
  // Store original gym data for change detection
  const [originalPackages, setOriginalPackages] = useState<GymPackage[]>([]);

  // Days of the week for off days
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  
  // Images
  const [mainImage, setMainImage] = useState<ImageFile | null>(null);
  const [galleryImages, setGalleryImages] = useState<ImageFile[]>([]);
  
  // Track deleted image IDs for update operations
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [deletedMainImageId, setDeletedMainImageId] = useState<number | null>(null);
  
  // Store original gym data for change detection
  const [originalGymData, setOriginalGymData] = useState<any>(null);

  // Map picker
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Load gym types and facilities
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [gymTypesRes, facilitiesRes] = await Promise.all([
          getGymTypesApi(),
          getFacilitiesApi(),
        ]);

        // Process gym types
        if ('data' in gymTypesRes && 'status' in gymTypesRes) {
          const gymTypesData = gymTypesRes.data?.data || [];
          setGymTypes(gymTypesData);
        }

        // Process facilities
        if ('data' in facilitiesRes && 'status' in facilitiesRes) {
          const facilitiesData = facilitiesRes.data?.data || [];
          setFacilities(facilitiesData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load gym types and facilities",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, toast]);

  // Load gym data when in edit mode
  useEffect(() => {
    const loadGymData = async () => {
      if (!isOpen || !gymId) return;
      
      setIsLoadingData(true);
      try {
        const response = await getGymByIdApi(gymId);
        
        if ('data' in response && 'status' in response) {
          const responseData = response.data;
          if (responseData?.success && responseData?.data) {
            const gym = responseData.data as any;
            
            // Store original gym data for change detection
            setOriginalGymData(gym);
            
            // Convert time from HH:MM:SS to HH:MM for time inputs
            const formatTimeForInput = (time: string | null) => {
              if (!time) return "";
              return time.substring(0, 5); // Get HH:MM from HH:MM:SS
            };
            
            // Extract gym_type_id from gym_type object
            const gymTypeId = gym.gym_type?.id || gym.gym_type_id || "";
            
            // Extract facility_ids from facilities array
            const facilityIds = gym.facilities?.map((f: any) => f.id) || gym.facility_ids || [];
            
            setFormData({
              name: gym.name || "",
              gym_type_id: gymTypeId.toString(),
              description: gym.description || "",
              address: gym.address || "",
              latitude: gym.latitude?.toString() || "",
              longitude: gym.longitude?.toString() || "",
              opening_time: formatTimeForInput(gym.opening_time),
              closing_time: formatTimeForInput(gym.closing_time),
              is_24_hours: gym.is_24_hours || false,
              gender_allowed: gym.gender_allowed || "MIXED",
              facility_ids: facilityIds,
              off_day: gym.off_day || [],
              social_media: gym.social_media || { facebook: "", instagram: "" },
            });
            
            // Reset deleted image IDs when loading new gym
            setDeletedImageIds([]);
            
            // Set main image (existing image from API)
            if (gym.main_image) {
              setMainImage({
                file: null, // Existing image from API
                preview: gym.main_image,
                id: `main-${Date.now()}`,
                isExisting: true,
              });
            } else {
              setMainImage(null);
            }
            
            // Load gallery images with existing IDs
            const loadedGalleryImages: ImageFile[] = [];
            if (gym.gallery_images && Array.isArray(gym.gallery_images)) {
              gym.gallery_images.forEach((galleryImg: any) => {
                if (galleryImg.image) {
                  // Ensure existingImageId is a valid positive integer
                  let imageId: number | undefined;
                  if (galleryImg.id !== null && galleryImg.id !== undefined) {
                    const parsed = typeof galleryImg.id === 'number' 
                      ? galleryImg.id 
                      : parseInt(String(galleryImg.id), 10);
                    // Only store if it's a valid positive integer
                    if (!isNaN(parsed) && parsed > 0) {
                      imageId = parsed;
                    }
                  }
                  
                  loadedGalleryImages.push({
                    file: null, // Existing image from API
                    preview: galleryImg.image,
                    id: `gallery-${imageId || Date.now()}`,
                    existingImageId: imageId,
                    isExisting: !!imageId, // Only mark as existing if we have a valid ID
                  });
                }
              });
            }
            setGalleryImages(loadedGalleryImages);
            
            // Load packages if they exist (API returns "packages" not "packages_data")
            if (gym.packages && Array.isArray(gym.packages)) {
              const loadedPackages: GymPackage[] = gym.packages.map((pkg: any) => ({
                id: pkg.id,
                title: pkg.title || "",
                price: pkg.price?.toString() || "",
                duration: pkg.duration || "",
                description: pkg.description || "",
                isNew: false,
                isModified: false,
              }));
              setPackages(loadedPackages);
              setOriginalPackages(loadedPackages);
            } else if (gym.packages_data && Array.isArray(gym.packages_data)) {
              // Fallback to packages_data if packages doesn't exist
              const loadedPackages: GymPackage[] = gym.packages_data.map((pkg: any) => ({
                id: pkg.id,
                title: pkg.title || "",
                price: pkg.price?.toString() || "",
                duration: pkg.duration || "",
                description: pkg.description || "",
                isNew: false,
                isModified: false,
              }));
              setPackages(loadedPackages);
              setOriginalPackages(loadedPackages);
            } else {
              setPackages([]);
              setOriginalPackages([]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading gym data:", error);
        toast({
          title: "Error",
          description: "Failed to load gym data",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadGymData();
  }, [isOpen, gymId, toast]);

  const resetFormState = () => {
    setFormData(getDefaultFormData());
    setPackages([]);
    setPackagesToDelete([]);
    setOriginalPackages([]);
    setCurrentStep("basic");
    // Clean up image URLs
    setMainImage((prev) => {
      if (prev && prev.preview.startsWith("blob:")) {
        URL.revokeObjectURL(prev.preview);
      }
      return null;
    });
    setGalleryImages((prev) => {
      prev.forEach((img) => {
        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
      return [];
    });
    
    // Reset deleted image IDs
    setDeletedImageIds([]);
    setDeletedMainImageId(null);
    setOriginalGymData(null);
  };

  // Restore draft data when opening in add mode
  useEffect(() => {
    if (!isOpen || isEditMode) return;

    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft);
      if (draft?.formData) {
        const defaults = getDefaultFormData();
        setFormData({
          ...defaults,
          ...draft.formData,
          social_media: {
            ...defaults.social_media,
            ...(draft.formData.social_media || {}),
          },
        });
      }
      if (draft?.currentStep) {
        setCurrentStep(draft.currentStep);
      }
      if (Array.isArray(draft?.packages)) {
        setPackages(draft.packages);
      }
    } catch (error) {
      console.error("Failed to restore add gym draft:", error);
    }
  }, [isOpen, isEditMode]);

  // Save draft on close (add mode) and reset in edit mode
  useEffect(() => {
    if (!isOpen) {
      if (isEditMode) {
        resetFormState();
        return;
      }

      const draft = {
        formData,
        currentStep,
        packages,
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error("Failed to save add gym draft:", error);
      }
    }
  }, [isOpen, isEditMode, formData, currentStep, packages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      social_media: {
        ...prev.social_media,
        [platform]: value,
      },
    }));
  };

  const handleFacilityToggle = (facilityId: number) => {
    setFormData((prev) => {
      const facilityIds = prev.facility_ids.includes(facilityId)
        ? prev.facility_ids.filter((id) => id !== facilityId)
        : [...prev.facility_ids, facilityId];
      return { ...prev, facility_ids: facilityIds };
    });
  };

  const handleOffDayToggle = (day: string) => {
    setFormData((prev) => {
      const offDays = prev.off_day.includes(day)
        ? prev.off_day.filter((d) => d !== day)
        : [...prev.off_day, day];
      return { ...prev, off_day: offDays };
    });
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setMainImage({ file, preview, id: `main-${Date.now()}` });
  };

  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (galleryImages.length + files.length > 3) {
      toast({
        title: "Error",
        description: "Maximum 3 gallery images allowed",
        variant: "destructive",
      });
      return;
    }

    const newImages: ImageFile[] = [];
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: `${file.name} must be less than 5MB`,
          variant: "destructive",
        });
        return;
      }

      const preview = URL.createObjectURL(file);
      newImages.push({ file, preview, id: `gallery-${Date.now()}-${Math.random()}` });
    });

    setGalleryImages((prev) => [...prev, ...newImages]);
  };

  const removeMainImage = () => {
    if (mainImage) {
      // Revoke object URL if it was a preview
      if (mainImage.preview.startsWith("blob:")) {
        URL.revokeObjectURL(mainImage.preview);
      }
      setMainImage(null);
    }
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        // If it's an existing image with an ID, track it for deletion
        if (imageToRemove.isExisting && imageToRemove.existingImageId) {
          const imageId = typeof imageToRemove.existingImageId === 'number' 
            ? imageToRemove.existingImageId 
            : parseInt(String(imageToRemove.existingImageId), 10);
          if (!isNaN(imageId) && imageId > 0) {
            setDeletedImageIds((prevIds) => [...prevIds, imageId]);
          }
        }
        // Revoke object URL if it was a preview
        if (imageToRemove.preview.startsWith("blob:")) {
          URL.revokeObjectURL(imageToRemove.preview);
        }
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Step navigation
  const steps: FormStep[] = ["basic", "location", "details", "packages"];
  const stepLabels = {
    basic: "Basic Information",
    location: "Location",
    details: "Details & Images",
    packages: "Membership Packages",
  };

  const validateStep = (step: FormStep): boolean => {
    switch (step) {
      case "basic":
        if (!formData.name.trim()) {
          toast({
            title: "Error",
            description: "Gym name is required",
            variant: "destructive",
          });
          return false;
        }
        if (!formData.gym_type_id) {
          toast({
            title: "Error",
            description: "Please select a gym type",
            variant: "destructive",
          });
          return false;
        }
        if (!formData.description.trim()) {
          toast({
            title: "Error",
            description: "Description is required",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "location":
        if (!formData.address.trim()) {
          toast({
            title: "Error",
            description: "Address is required",
            variant: "destructive",
          });
          return false;
        }
        if (!formData.latitude || !formData.longitude) {
          toast({
            title: "Error",
            description: "Please select location on map",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "details":
        if (!formData.is_24_hours && (!formData.opening_time || !formData.closing_time)) {
          toast({
            title: "Error",
            description: "Either select 'Open 24 hours' or provide opening and closing times",
            variant: "destructive",
          });
          return false;
        }
        if (!mainImage) {
          toast({
            title: "Error",
            description: "Main image is required",
            variant: "destructive",
          });
          return false;
        }
        if (!isEditMode && (!mainImage.file || mainImage.file.size === 0)) {
          toast({
            title: "Error",
            description: "Main image is required",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "packages":
        // Packages are optional, so always return true
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      const currentIndex = steps.indexOf(currentStep);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
      }
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Packages management
  const addPackage = () => {
    setPackages([
      {
        title: "",
        price: "",
        duration: "",
        description: "",
        isNew: true,
      },
      ...packages,
    ]);
  };

  const updatePackage = (index: number, field: keyof GymPackage, value: string | number) => {
    setPackages((prev) => {
      const updated = [...prev];
      const pkg = { ...updated[index] };
      (pkg as any)[field] = value;
      // Mark as modified if it's an existing package
      if (pkg.id && !pkg.isNew) {
        pkg.isModified = true;
      }
      updated[index] = pkg;
      return updated;
    });
  };

  const removePackage = (index: number) => {
    const pkg = packages[index];
    // If it's an existing package with an ID, add to delete list
    if (pkg.id && !pkg.isNew) {
      setPackagesToDelete((prev) => [...prev, pkg.id!]);
    }
    setPackages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Gym name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.gym_type_id) {
      toast({
        title: "Error",
        description: "Please select a gym type",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.address.trim()) {
      toast({
        title: "Error",
        description: "Address is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Error",
        description: "Latitude and longitude are required",
        variant: "destructive",
      });
      return;
    }

    // Either 24 hours OR working time is required
    if (!formData.is_24_hours && (!formData.opening_time || !formData.closing_time)) {
      toast({
        title: "Error",
        description: "Either select 'Open 24 hours' or provide opening and closing times",
        variant: "destructive",
      });
      return;
    }

    // Main image is required
    // For new gyms: must have a new file
    // For edit mode: must have either existing image or new file
    if (!mainImage) {
      toast({
        title: "Error",
        description: "Main image is required",
        variant: "destructive",
      });
      return;
    }
    
    // For new gyms, main image must have a file
    if (!isEditMode && (!mainImage.file || mainImage.file.size === 0)) {
      toast({
        title: "Error",
        description: "Main image is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Show loading modal
    setShowLoadingModal(true);
    setLoadingStep("Preparing submission...");
    setLoadingProgress(0);
    setCompressingCount(0);
    setTotalImages(0);
    
    try {
      // Collect images that need compression
      const imagesToCompress: { file: File; type: 'main' | 'gallery'; index?: number }[] = [];
      
      if (isEditMode) {
        // For UPDATE: only compress new/changed images
        if (mainImage && mainImage.file && mainImage.file.size > 0) {
          imagesToCompress.push({ file: mainImage.file, type: 'main' });
        }
        galleryImages.forEach((image) => {
          if (image.file && image.file.size > 0) {
            imagesToCompress.push({ file: image.file, type: 'gallery' });
          }
        });
      } else {
        // For CREATE: compress all images
        if (mainImage && mainImage.file && mainImage.file.size > 0) {
          imagesToCompress.push({ file: mainImage.file, type: 'main' });
        }
        galleryImages.forEach((image) => {
          if (image.file && image.file.size > 0) {
            imagesToCompress.push({ file: image.file, type: 'gallery' });
          }
        });
      }
      
      setTotalImages(imagesToCompress.length);
      setCompressingCount(0);

      // Compress images with progress tracking
      const compressedImages: { file: File; type: 'main' | 'gallery'; index?: number }[] = [];
      
      if (imagesToCompress.length > 0) {
        for (let i = 0; i < imagesToCompress.length; i++) {
          const img = imagesToCompress[i];
          setLoadingStep(`Compressing image ${i + 1} of ${imagesToCompress.length}...`);
          setCompressingCount(i + 1);
          setLoadingProgress(((i + 1) / imagesToCompress.length) * 50); // 50% for compression
          
          try {
            // Compress gym images to ~1MB each
            const compressedFile = await compressImage(img.file, 1);
            compressedImages.push({ ...img, file: compressedFile });
          } catch (error) {
            console.error("Error compressing image:", error);
            // Use original file if compression fails
            compressedImages.push(img);
          }
        }
        setLoadingProgress(60);
      } else {
        setLoadingProgress(60);
      }

      setLoadingStep("Preparing data...");
      
      const fd = new FormData();

      // Helper function to check if a value has changed
      const hasChanged = (field: string, currentValue: any, originalValue: any) => {
        if (isEditMode && originalGymData) {
          // For update, only send if changed
          if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
            // Compare arrays by sorting and stringifying
            const currentStr = JSON.stringify([...currentValue].sort());
            const originalStr = JSON.stringify([...originalValue].sort());
            return currentStr !== originalStr;
          }
          if (typeof currentValue === 'object' && typeof originalValue === 'object') {
            // Compare objects by stringifying
            return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
          }
          return String(currentValue || "") !== String(originalValue || "");
        }
        // For create, always send
        return true;
      };

      // Basic fields - only send if changed in edit mode
      if (!isEditMode || hasChanged("name", formData.name.trim(), originalGymData?.name)) {
        fd.append("name", formData.name.trim());
      }
      
      const originalGymTypeId = originalGymData?.gym_type?.id || originalGymData?.gym_type_id;
      if (!isEditMode || hasChanged("gym_type_id", formData.gym_type_id, originalGymTypeId?.toString())) {
        fd.append("gym_type_id", formData.gym_type_id);
      }
      
      if (!isEditMode || hasChanged("description", formData.description.trim(), originalGymData?.description)) {
        fd.append("description", formData.description.trim());
      }
      
      if (!isEditMode || hasChanged("address", formData.address.trim(), originalGymData?.address)) {
        fd.append("address", formData.address.trim());
      }
      
      if (!isEditMode || hasChanged("latitude", formData.latitude, originalGymData?.latitude?.toString())) {
        fd.append("latitude", formData.latitude);
      }
      
      if (!isEditMode || hasChanged("longitude", formData.longitude, originalGymData?.longitude?.toString())) {
        fd.append("longitude", formData.longitude);
      }
      
      if (!isEditMode || hasChanged("is_24_hours", formData.is_24_hours, originalGymData?.is_24_hours)) {
        fd.append("is_24_hours", formData.is_24_hours.toString());
      }
      
      if (!isEditMode || hasChanged("gender_allowed", formData.gender_allowed, originalGymData?.gender_allowed)) {
        fd.append("gender_allowed", formData.gender_allowed);
      }

      // Time fields (convert HH:MM to HH:MM:SS format) - only send if changed
      if (!formData.is_24_hours) {
        const openingTime = formData.opening_time ? `${formData.opening_time}:00` : "";
        const closingTime = formData.closing_time ? `${formData.closing_time}:00` : "";
        const originalOpeningTime = originalGymData?.opening_time || "";
        const originalClosingTime = originalGymData?.closing_time || "";
        
        if (!isEditMode || hasChanged("opening_time", openingTime, originalOpeningTime)) {
          fd.append("opening_time", openingTime);
        }
        if (!isEditMode || hasChanged("closing_time", closingTime, originalClosingTime)) {
          fd.append("closing_time", closingTime);
        }
      }

      // Facility IDs - send as JSON array string [1, 2, 3] or [] when empty
      const originalFacilityIds = originalGymData?.facilities?.map((f: any) => f.id) || originalGymData?.facility_ids || [];
      if (!isEditMode || hasChanged("facility_ids", formData.facility_ids, originalFacilityIds)) {
        // Send as JSON array string format: [1, 2, 3] or [] when empty
        if (formData.facility_ids.length > 0) {
          // Ensure all IDs are valid integers
          const validIds = formData.facility_ids
            .map(id => {
              const facilityId = typeof id === 'number' ? id : parseInt(String(id), 10);
              return (!isNaN(facilityId) && facilityId > 0) ? facilityId : null;
            })
            .filter((id): id is number => id !== null);
          
          const facilityIdsJson = JSON.stringify(validIds);
          fd.append("facility_ids", facilityIdsJson);
        } else {
          // Send empty array [] when facilities are removed/unselected
          fd.append("facility_ids", JSON.stringify([]));
        }
      }

      // Off days - only send if changed
      const originalOffDay = originalGymData?.off_day || [];
      if (!isEditMode || hasChanged("off_day", formData.off_day, originalOffDay)) {
        const offDayJson = JSON.stringify(formData.off_day);
        fd.append("off_day", offDayJson);
      }

      // Social media - send if changed (including when cleared/removed)
      const originalSocialMedia = originalGymData?.social_media || {};
      const socialMedia: { [key: string]: string } = {};
      if (formData.social_media.facebook?.trim()) {
        socialMedia.facebook = formData.social_media.facebook.trim();
      }
      if (formData.social_media.instagram?.trim()) {
        socialMedia.instagram = formData.social_media.instagram.trim();
      }
      
      // Always send social_media if it has changed (including when cleared to empty object)
      const socialMediaChanged = JSON.stringify(socialMedia) !== JSON.stringify(originalSocialMedia);
      if (socialMediaChanged || !isEditMode) {
        // Send as JSON string (even if empty object to clear social media)
        fd.append("social_media", JSON.stringify(socialMedia));
      }

      // Handle packages_data
      // For CREATE: send all packages as full objects (as JSON string in FormData)
      // For PATCH: send only modified packages with id and price (as JSON string in FormData)
      // For PUT: send all packages (existing + new) as full objects + packages_to_delete (as JSON string in FormData)
      const usePut = false; // Set to true if using PUT method
      
      if (packages.length > 0) {
        if (isEditMode && !usePut) {
          // For PATCH: send modified packages (id + price) and new packages (full objects)
          const modifiedPackages = packages
            .filter(pkg => pkg.id && pkg.isModified && !pkg.isNew)
            .map(pkg => ({
              id: pkg.id!,
              price: pkg.price.trim(),
            }));
          
          const newPackages = packages
            .filter(pkg => pkg.isNew && pkg.title.trim() && pkg.price.trim())
            .map(pkg => ({
              title: pkg.title.trim(),
              price: pkg.price.trim(),
              duration: pkg.duration.trim(),
              description: pkg.description.trim() || "",
            }));
          
          // Combine modified and new packages
          const allPackages = [...modifiedPackages, ...newPackages];
          if (allPackages.length > 0) {
            const packagesJson = JSON.stringify(allPackages);
            fd.append("packages_data", packagesJson);
          }
        } else if (isEditMode && usePut) {
          // For PUT: send all packages (existing + new) as full objects
          const packagesData = packages
            .filter(pkg => pkg.title.trim() && pkg.price.trim())
            .map(pkg => {
              if (pkg.id && !pkg.isNew) {
                // Existing package: include id
                return {
                  id: pkg.id,
                  title: pkg.title.trim(),
                  price: pkg.price.trim(),
                  duration: pkg.duration.trim(), // Backend example shows duration_months, but we use duration
                  description: pkg.description.trim() || "",
                };
              } else {
                // New package: no id
                return {
                  title: pkg.title.trim(),
                  price: pkg.price.trim(),
                  duration: pkg.duration.trim(), // Backend example shows duration_months, but we use duration
                  description: pkg.description.trim() || "",
                };
              }
            });
          
          if (packagesData.length > 0) {
            const packagesJson = JSON.stringify(packagesData);
            fd.append("packages_data", packagesJson);
          }
        } else {
          // For CREATE: send all packages as full objects
          const packagesData = packages
            .filter(pkg => pkg.title.trim() && pkg.price.trim())
            .map(pkg => ({
              title: pkg.title.trim(),
              price: pkg.price.trim(),
              duration: pkg.duration.trim(),
              description: pkg.description.trim() || "",
            }));
          
          if (packagesData.length > 0) {
            const packagesJson = JSON.stringify(packagesData);
            fd.append("packages_data", packagesJson);
          }
        }
      }

      // Send packages_to_delete for both PATCH and PUT when packages are deleted
      if (isEditMode && packagesToDelete.length > 0) {
        const uniqueDeleteIds = Array.from(new Set(packagesToDelete.filter(id => id > 0)));
        if (uniqueDeleteIds.length > 0) {
          const deleteJson = JSON.stringify(uniqueDeleteIds);
          fd.append("packages_to_delete", deleteJson);
        }
      }

      setLoadingProgress(80);
      setLoadingStep("Sending data to server...");

      // Handle images differently for CREATE vs UPDATE
      if (isEditMode) {
        // UPDATE: Only send changed/new images
        // Main image - only send if it has changed (has a new file)
        const compressedMainImage = compressedImages.find(img => img.type === 'main');
        if (compressedMainImage) {
          const truncatedFile = new File([compressedMainImage.file], truncateFilename(compressedMainImage.file.name), { type: compressedMainImage.file.type });
          fd.append("main_image", truncatedFile);
        }

        // Gallery images - only send new/changed images (not existing ones that haven't changed)
        const compressedGalleryImages = compressedImages.filter(img => img.type === 'gallery');
        compressedGalleryImages.forEach((compressedImg) => {
          const truncatedFile = new File([compressedImg.file], truncateFilename(compressedImg.file.name), { type: compressedImg.file.type });
          fd.append("gallery_images_data", truncatedFile);
        });

        // Send deleted image IDs - send each ID separately (backend expects array format)
        if (deletedImageIds.length > 0) {
          const integerIds = deletedImageIds
            .map(id => {
              const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
              return (!isNaN(parsed) && parsed > 0) ? parsed : null;
            })
            .filter((id): id is number => id !== null);
          
          const uniqueIds = Array.from(new Set(integerIds));
          // Send each ID as a separate form field (backend will parse as array)
          uniqueIds.forEach((id) => {
            fd.append("gallery_images_to_delete", id.toString());
          });


        }
      } else {
        // CREATE: Send all images
        // Main image
        const compressedMainImage = compressedImages.find(img => img.type === 'main');
        if (compressedMainImage) {
          const truncatedFile = new File([compressedMainImage.file], truncateFilename(compressedMainImage.file.name), { type: compressedMainImage.file.type });
          fd.append("main_image", truncatedFile);
        }

        // Gallery images
        const compressedGalleryImages = compressedImages.filter(img => img.type === 'gallery');
        compressedGalleryImages.forEach((compressedImg, index) => {
          const truncatedFile = new File([compressedImg.file], truncateFilename(compressedImg.file.name), { type: compressedImg.file.type });
          fd.append(`gallery_images_data[${index}][image]`, truncatedFile);
        });
      }

      setLoadingProgress(90);
      setLoadingStep("Submitting to server...");

      const response = isEditMode 
        ? await updateGymApi(gymId!, fd, "PATCH")
        : await createGymApi(fd);

      setLoadingProgress(100);
      setLoadingStep("Complete!");

      if ('data' in response && 'status' in response) {
        const responseData = response.data;
        if (responseData?.success) {
          // Small delay to show completion
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setShowLoadingModal(false);
          toast({
            title: "Success",
            description: isEditMode ? "Gym updated successfully" : "Gym created successfully",
          });
          
          if (!isEditMode) {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
          resetFormState();
          onOpenChange(false);
          if (onSuccess) {
            onSuccess();
          }
        } else {
          setShowLoadingModal(false);
          toast({
            title: "Error",
            description: responseData?.message || "Failed to create gym",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error creating gym:", error);
      setShowLoadingModal(false);
      toast({
        title: "Error",
        description: "Failed to create gym. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowLoadingModal(false);
    }
  };

  const getCurrentStepIndex = () => steps.indexOf(currentStep);
  const getProgress = () => ((getCurrentStepIndex() + 1) / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6 pb-4 border-b border-glass-border">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Gym" : "Add New Gym"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the details of your gym"
                : "Fill in the details to add a new gym to your fitness business"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12 px-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Step Progress Indicator */}
                <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {getCurrentStepIndex() + 1} of {steps.length}
                </span>
                <span className="text-sm font-medium">{stepLabels[currentStep]}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                {steps.map((step) => (
                  <span 
                    key={step}
                    className={currentStep === step ? "text-primary font-medium" : ""}
                  >
                    {stepLabels[step]}
                  </span>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <div className="min-h-[400px]">
              {/* Step 1: Basic Information */}
              {currentStep === "basic" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Gym Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Name of the gym"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gym_type_id">Gym Type *</Label>
                  <Select
                    value={formData.gym_type_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gym_type_id: value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gym type" />
                    </SelectTrigger>
                    <SelectContent>
                      {gymTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="min-h-[100px]"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === "location" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Location
                  </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location on Map *</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant={formData.latitude && formData.longitude ? "default" : "outline"}
                      onClick={() => setIsMapPickerOpen(true)}
                      className="flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      <MapPin className="h-4 w-4" />
                      {formData.latitude && formData.longitude ? "Change Location" : "Pick Location on Map"}
                    </Button>
                    {formData.latitude && formData.longitude && (
                      <p className="text-sm text-muted-foreground">
                        Location selected: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click the button above to select the gym location on the map
                  </p>
                  {/* Hidden inputs to store lat/lng for form submission */}
                  <input
                    type="hidden"
                    name="latitude"
                    value={formData.latitude}
                  />
                  <input
                    type="hidden"
                    name="longitude"
                    value={formData.longitude}
                  />
                </div>
              </div>
                </div>
              )}

              {/* Step 3: Details & Images */}
              {currentStep === "details" && (
                <div className="space-y-6">
                  {/* Operating Hours */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Operating Hours
                    </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_24_hours"
                    checked={formData.is_24_hours}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_24_hours: checked as boolean }))
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="is_24_hours" className="cursor-pointer">
                    Open 24 hours
                  </Label>
                </div>
                {!formData.is_24_hours && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opening_time">Opening Time *</Label>
                      <Input
                        id="opening_time"
                        name="opening_time"
                        type="time"
                        value={formData.opening_time}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closing_time">Closing Time *</Label>
                      <Input
                        id="closing_time"
                        name="closing_time"
                        type="time"
                        value={formData.closing_time}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>
                )}
                {/* Off Days */}
                <div className="space-y-2">
                  <Label>Off Days (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select days when the gym is closed
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {daysOfWeek.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`off_day_${day}`}
                          checked={formData.off_day.includes(day)}
                          onCheckedChange={() => handleOffDayToggle(day)}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor={`off_day_${day}`} className="cursor-pointer text-sm">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                  </div>

                  {/* Gender Allowed */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Gender Policy
                    </h3>
              <div className="space-y-2">
                <Label htmlFor="gender_allowed">Gender Allowed *</Label>
                <Select
                  value={formData.gender_allowed}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, gender_allowed: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">Mixed (Men & Women)</SelectItem>
                    <SelectItem value="MALE">Male Only</SelectItem>
                    <SelectItem value="FEMALE">Female Only</SelectItem>
                  </SelectContent>
                </Select>
                  </div>
                  </div>

                  {/* Facilities */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Facilities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {facilities.map((facility) => (
                  <div key={facility.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`facility-${facility.id}`}
                      checked={formData.facility_ids.includes(facility.id)}
                      onCheckedChange={() => handleFacilityToggle(facility.id)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={`facility-${facility.id}`} className="cursor-pointer text-sm">
                      {facility.name}
                    </Label>
                  </div>
                ))}
                  </div>
                  </div>

                  {/* Social Media */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook URL</Label>
                  <Input
                    id="facebook"
                    placeholder="Facebook URL"
                    value={formData.social_media.facebook}
                    onChange={(e) => handleSocialMediaChange("facebook", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <Input
                    id="instagram"
                    placeholder="Instagram URL"
                    value={formData.social_media.instagram}
                    onChange={(e) => handleSocialMediaChange("instagram", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                  </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Images</h3>
               
                    {/* Main Image */}
                    <div className="space-y-2">
                      <Label>Main Image *</Label>
                      {mainImage ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-glass-border">
                          <img
                            src={mainImage.preview}
                            alt="Main"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeMainImage}
                            className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                            disabled={isSubmitting}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-glass-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload main image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMainImageChange}
                            className="hidden"
                            disabled={isSubmitting}
                          />
                        </label>
                      )}
                    </div>

                    {/* Gallery Images */}
                    <div className="space-y-2">
                      <Label>Gallery Images (Max 3)</Label>
                      <div className="grid grid-cols-3 gap-4">
                        {galleryImages.map((image) => (
                          <div key={image.id} className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-glass-border">
                            <img
                              src={image.preview}
                              alt="Gallery"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(image.id)}
                              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                              disabled={isSubmitting}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {galleryImages.length < 3 && (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-glass-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                            <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Add image</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleGalleryImageChange}
                              className="hidden"
                              disabled={isSubmitting}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Packages */}
              {currentStep === "packages" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Membership Packages</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPackage}
                      className="flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      <Plus className="w-4 h-4" />
                      Add Package
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add membership packages for your gym. Packages are optional.
                  </p>

                  {packages.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-glass-border rounded-lg">
                      <p className="text-muted-foreground mb-4">No packages added yet</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPackage}
                        disabled={isSubmitting}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Package
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {packages.map((pkg, index) => (
                        <div key={index} className="border border-glass-border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Package {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePackage(index)}
                              className="text-destructive hover:text-destructive"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Package Title *</Label>
                              <Input
                                placeholder="e.g., 1 Month Membership"
                                value={pkg.title}
                                onChange={(e) => updatePackage(index, "title", e.target.value)}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Price (AED) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="500.00"
                                value={pkg.price}
                                onChange={(e) => updatePackage(index, "price", e.target.value)}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Duration *</Label>
                              <Input
                                type="text"
                                placeholder="e.g., 1 Month, 3 Months, 6 Months"
                                value={pkg.duration}
                                onChange={(e) => updatePackage(index, "duration", e.target.value)}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Package description"
                                value={pkg.description}
                                onChange={(e) => updatePackage(index, "description", e.target.value)}
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
            </div>

            {/* Navigation Buttons - Fixed at Bottom */}
            <div className="mt-auto border-t border-glass-border bg-background px-6 py-4">
              <div className="flex justify-between gap-3">
                <div>
                  {getCurrentStepIndex() > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePreviousStep}
                      disabled={isSubmitting}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  {getCurrentStepIndex() < steps.length - 1 ? (
                    <Button
                      variant="default"
                      onClick={handleNextStep}
                      disabled={isSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        isEditMode ? "Update Gym" : "Create Gym"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Picker Dialog */}
        <MapPicker
          isOpen={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          onSelect={(lat, lng) => {
            setFormData((prev) => ({
              ...prev,
              latitude: lat.toString(),
              longitude: lng.toString(),
            }));
            setIsMapPickerOpen(false);
          }}
          initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
          initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
        />
      </DialogContent>

      {/* Loading Modal */}
      <Dialog open={showLoadingModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center">
              {isEditMode ? "Updating Gym" : "Creating Gym"}
            </DialogTitle>
            <DialogDescription className="text-center">
              Please wait while we process your gym...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{loadingStep}</span>
                <span className="font-medium">{Math.round(loadingProgress)}%</span>
              </div>
              <Progress value={loadingProgress} className="h-2" />
            </div>
            
            {totalImages > 0 && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Compressing images: {compressingCount} of {totalImages}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please don't close this window</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

