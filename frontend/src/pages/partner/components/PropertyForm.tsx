import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  X,
  GripVertical,
  Loader2,
  ArrowLeft,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { truncateFilename } from "@/utils/fileUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MapPicker } from "./MapPicker";
import { useToast } from "@/hooks/use-toast";
import { createPropertyApi, updatePropertyApi, getPropertyByIdApi } from "@/services/partner/myspace";
import base_url from "@/services/base_url";
import {
  getPropertyTypesApi,
  getPurposesApi,
  getCompletionStatusesApi,
  getFurnishingStatusesApi,
  getAmenitiesApi,
  getOccupantTypesApi,
  type PropertyType,
  type Purpose,
  type CompletionStatus,
  type FurnishingStatus,
  type Amenity,
  type OccupantType,
} from "@/services/admin/myspace";

interface PropertyFormProps {
  propertyId?: number;
  onCancel?: () => void;
  onSuccess?: () => void;
}

interface ImageFile {
  file: File | null; // null for existing images from API
  preview: string;
  id: string; // unique ID for React key, or existing image ID from API
  existingImageId?: number; // ID from API for existing images
  isExisting?: boolean; // true if this is an existing image from API
}

// Image compression function - optimized for WebP with JPEG fallback
const compressImage = (file: File, maxSizeMB: number = 0.8, maxDimension: number = 1600): Promise<File> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const originalDimensions = `${width}x${height}`;
        
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

                // Log compression stats
                const compressionRatio = ((1 - blob.size / originalSize) * 100).toFixed(1);
                const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
                const compressedSizeMB = (blob.size / 1024 / 1024).toFixed(2);
                console.log(`📸 Image Compression: ${file.name}`);
                console.log(`   Original: ${originalSizeMB}MB (${originalDimensions})`);
                console.log(`   Compressed: ${compressedSizeMB}MB (${width}x${height})`);
                console.log(`   Compression: ${compressionRatio}% reduction`);
                console.log(`   Quality: ${quality.toFixed(2)}, Format: ${useWebP ? 'WebP' : 'JPEG'}`);

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

export const PropertyForm = ({ propertyId, onCancel, onSuccess }: PropertyFormProps) => {
  const draftKey = "property-form-draft";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Scroll to top when form is displayed
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  // Dropdown data
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [completionStatuses, setCompletionStatuses] = useState<CompletionStatus[]>([]);
  const [furnishingStatuses, setFurnishingStatuses] = useState<FurnishingStatus[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [occupantTypes, setOccupantTypes] = useState<OccupantType[]>([]);

  const steps = [
    { id: "basic", title: "Basic Info", description: "Title, type, purpose" },
    { id: "location", title: "Location & Price", description: "Address, map, price" },
    { id: "details", title: "Details & Amenities", description: "Specs, amenities, socials" },
    { id: "media", title: "Media", description: "Featured & gallery images" },
  ];

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    property_type_id: "",
    purpose_id: "",
    completion_status_id: "",
    address: "",
    place: "",
    price: "",
    furnishing_status_id: "",
    building_name: "",
    floor_number: "",
    unit_number: "",
    latitude: "",
    longitude: "",
    bedrooms: "",
    bathrooms: "",
    occupant_type_id: "",
    currency: "AED",
    rent_period: "",
    handover_date: "",
    developer_name: "",
    project_name: "",
    amenity_ids: [] as number[],
    social_media: {
      instagram: "",
      tiktok: "",
      youtube: "",
    },
  });

  // Images - separate main image and gallery images
  const [mainImage, setMainImage] = useState<ImageFile | null>(null);
  const [galleryImages, setGalleryImages] = useState<ImageFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Loading modal state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [compressingCount, setCompressingCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  // Image viewer modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Map picker
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  
  // Location input (manual entry)

  // Track deleted image IDs and original property data for change detection
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [originalPropertyData, setOriginalPropertyData] = useState<any>(null);

  // Load dropdown data
  useEffect(() => {
    loadDropdownData();
  }, []);

  // Load property data when editing
  useEffect(() => {
    if (propertyId) {
      loadPropertyData();
    }
  }, [propertyId]);

  // Load draft for new property
  useEffect(() => {
    if (propertyId) {
      setIsDraftLoaded(true);
      return;
    }

    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          formData?: typeof formData;
          currentStep?: number;
        };
        if (parsed?.formData) {
          setFormData(parsed.formData);
        }
        if (typeof parsed?.currentStep === "number") {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch {
      // Ignore malformed drafts
    } finally {
      setIsDraftLoaded(true);
    }
  }, [propertyId]);

  // Persist draft for new property
  useEffect(() => {
    if (propertyId || !isDraftLoaded) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ formData, currentStep })
      );
    } catch {
      // Ignore storage failures
    }
  }, [formData, currentStep, propertyId, isDraftLoaded]);

  const loadDropdownData = async () => {
    setIsLoadingData(true);
    try {
      // Call APIs individually
      const propertyTypesRes = await getPropertyTypesApi();
      const purposesRes = await getPurposesApi();
      const completionStatusesRes = await getCompletionStatusesApi();
      const furnishingStatusesRes = await getFurnishingStatusesApi();
      const amenitiesRes = await getAmenitiesApi();
      const occupantTypesRes = await getOccupantTypesApi();
      
      // Helper function to extract data array from response
      const extractDataArray = (response: any, name: string) => {
        let dataArray = null;
        
        // Try different response structures
        if (Array.isArray(response?.data?.data)) {
          dataArray = response.data.data;
        } else if (response?.data?.success && Array.isArray(response?.data?.data)) {
          dataArray = response.data.data;
        } else if (Array.isArray(response?.data)) {
          const firstItem = response.data[0];
          if (firstItem && typeof firstItem === 'object' && !firstItem.success) {
            dataArray = response.data;
          } else {
            if (response.data?.data && Array.isArray(response.data.data)) {
              dataArray = response.data.data;
            }
          }
        } else if (Array.isArray(response)) {
          dataArray = response;
        }
        
        return dataArray;
      };
      
      // Process property types
      if (propertyTypesRes && 'data' in propertyTypesRes) {
        let propertyTypesArray = propertyTypesRes.data?.data ?? propertyTypesRes.data;
        if (Array.isArray(propertyTypesArray)) {
          setPropertyTypes(propertyTypesArray);
        } else if (propertyTypesArray?.success && Array.isArray(propertyTypesArray?.data)) {
          setPropertyTypes(propertyTypesArray.data);
        }
      }

      // Process purposes
      if (purposesRes && 'data' in purposesRes) {
        let purposesArray = purposesRes.data?.data ?? purposesRes.data;
        if (Array.isArray(purposesArray)) {
          setPurposes(purposesArray);
        } else if (purposesArray?.success && Array.isArray(purposesArray?.data)) {
          setPurposes(purposesArray.data);
        }
      }

      // Process completion statuses
      if (completionStatusesRes && 'data' in completionStatusesRes) {
        let completionStatusesArray = completionStatusesRes.data?.data ?? completionStatusesRes.data;
        if (Array.isArray(completionStatusesArray)) {
          setCompletionStatuses(completionStatusesArray);
        } else if (completionStatusesArray?.success && Array.isArray(completionStatusesArray?.data)) {
          setCompletionStatuses(completionStatusesArray.data);
        }
      }

      // Process furnishing statuses
      if (furnishingStatusesRes && 'data' in furnishingStatusesRes) {
        let furnishingStatusesArray = furnishingStatusesRes.data?.data ?? furnishingStatusesRes.data;
        if (Array.isArray(furnishingStatusesArray)) {
          setFurnishingStatuses(furnishingStatusesArray);
        } else if (furnishingStatusesArray?.success && Array.isArray(furnishingStatusesArray?.data)) {
          setFurnishingStatuses(furnishingStatusesArray.data);
        }
      }

      // Process amenities
      if (amenitiesRes && 'data' in amenitiesRes) {
        let amenitiesArray = amenitiesRes.data?.data ?? amenitiesRes.data;
        if (Array.isArray(amenitiesArray)) {
          setAmenities(amenitiesArray);
        } else if (amenitiesArray?.success && Array.isArray(amenitiesArray?.data)) {
          setAmenities(amenitiesArray.data);
        }
      }

      // Process occupant types
      if (occupantTypesRes && 'data' in occupantTypesRes) {
        let occupantTypesArray = occupantTypesRes.data?.data ?? occupantTypesRes.data;
        if (Array.isArray(occupantTypesArray)) {
          setOccupantTypes(occupantTypesArray);
        } else if (occupantTypesArray?.success && Array.isArray(occupantTypesArray?.data)) {
          setOccupantTypes(occupantTypesArray.data);
        }
      }
      
    } catch (err) {
      console.error("Error loading dropdown data:", err);
      toast({
        title: "Error",
        description: "Failed to load some form data. You can still proceed, but some options may be unavailable.",
        variant: "destructive",
      });
    } finally {
      // Always set loading to false, even if there were errors
      setIsLoadingData(false);
    }
  };

  // Load property data for editing
  const loadPropertyData = async () => {
    if (!propertyId) return;

    setIsLoadingData(true);
    // Reset deleted image IDs when loading new property
    setDeletedImageIds([]);
    try {


      const response = await getPropertyByIdApi(propertyId);


      if ("data" in response && "status" in response) {
        const responseData = response.data?.data ?? response.data;
        const property = responseData?.data ?? responseData;

        if (property) {
          // Store original property data for change detection
          setOriginalPropertyData(property);
          // Bind form data
          setFormData({
            title: property.title || "",
            description: property.description || "",
            property_type_id: property.property_type?.id?.toString() || property.property_type_id?.toString() || "",
            purpose_id: property.purpose?.id?.toString() || property.purpose_id?.toString() || "",
            completion_status_id: property.completion_status?.id?.toString() || property.completion_status_id?.toString() || "",
            address: property.address || "",
            place: property.place || "",
            price: property.price?.toString() || "",
            furnishing_status_id: property.furnishing_status?.id?.toString() || property.furnishing_status_id?.toString() || "",
            building_name: property.building_name || "",
            floor_number: property.floor_number || "",
            unit_number: property.unit_number || "",
            latitude: property.location_latitude?.toString() || "",
            longitude: property.location_longitude?.toString() || "",
            bedrooms: property.bedrooms?.toString() || "",
            bathrooms: property.bathrooms?.toString() || "",
            occupant_type_id: property.occupant_type?.id?.toString() || property.occupant_type_id?.toString() || "",
            currency: property.currency || "AED",
            rent_period: property.rent_period === "none" ? "" : property.rent_period || "",
            handover_date: property.handover_date || "",
            developer_name: property.developer_name || "",
            project_name: property.project_name || "",
            amenity_ids: property.amenities?.map((a: any) => a.id) || [],
            social_media: {
              instagram: property.social_media?.instagram || "",
              tiktok: property.social_media?.tiktok || "",
              youtube: property.social_media?.youtube || "",
            },
          });

          // Load main image (featured image)
          if (property.main_image || property.main_image_url) {
            const mainImageUrl = property.main_image || property.main_image_url;
            setMainImage({
              file: null, // Existing image from API
              preview: mainImageUrl,
              id: `main-${Date.now()}`,
              isExisting: true,
            });
          } else {
            setMainImage(null);
          }

          // Load gallery images
          const loadedGalleryImages: ImageFile[] = [];
          if (property.gallery_images && Array.isArray(property.gallery_images)) {
            property.gallery_images.forEach((galleryImg: any) => {
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

        }
      }
    } catch (error) {
      console.error("Error loading property data:", error);
      toast({
        title: "Error",
        description: "Failed to load property data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenityId: number) => {
    setFormData((prev) => {
      const currentIds = prev.amenity_ids;
      if (currentIds.includes(amenityId)) {
        return { ...prev, amenity_ids: currentIds.filter((id) => id !== amenityId) };
      } else {
        return { ...prev, amenity_ids: [...currentIds, amenityId] };
      }
    });
  };

  // Handle main image upload
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Compress image (target ~1MB)
      const compressedFile = await compressImage(file, 1);
      const preview = URL.createObjectURL(compressedFile);
      setMainImage({
        file: compressedFile,
        preview,
        id: `main-${Date.now()}`,
        isExisting: false,
      });
    } catch (error) {
      console.error("Error compressing image:", error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try another file.",
        variant: "destructive",
      });
    }
  };

  // Handle gallery images upload
  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_GALLERY_IMAGES = 12;
    const currentCount = galleryImages.length;
    const remainingSlots = MAX_GALLERY_IMAGES - currentCount;

    if (remainingSlots <= 0) {
      toast({
        title: "Limit Reached",
        description: "Maximum 12 gallery images allowed. Please remove some images first.",
        variant: "destructive",
      });
      return;
    }

    // If more files are selected than remaining slots, only process the first ones
    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({
        title: "Notice",
        description: `Only the first ${remainingSlots} image(s) will be added. Maximum 12 gallery images allowed.`,
        variant: "default",
      });
    }

    const validFiles: File[] = [];
    const skippedFiles: string[] = [];

    // Validate files - skip invalid ones but continue processing
    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        skippedFiles.push(`${file.name} (not an image file)`);
        continue;
      }
      validFiles.push(file);
    }

    // Show warning toast for skipped files
    if (skippedFiles.length > 0) {
      toast({
        title: "Warning",
        description: `${skippedFiles.length} image(s) skipped: ${skippedFiles.join(", ")}`,
        variant: "default",
      });
    }

    // Compress and add images (only up to the limit, target ~1MB each)
    let addedCount = 0;
    for (const file of validFiles) {
      if (currentCount + addedCount >= MAX_GALLERY_IMAGES) {
        break;
      }
      try {
        const compressedFile = await compressImage(file, 1);
        const preview = URL.createObjectURL(compressedFile);
        setGalleryImages((prev) => [
          ...prev,
          { file: compressedFile, preview, id: `gallery-${Date.now()}-${Math.random()}` },
        ]);
        addedCount++;
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({
          title: "Error",
          description: `Failed to process ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  // Handle main image removal
  const handleRemoveMainImage = () => {
    if (mainImage) {
      if (mainImage.preview.startsWith("blob:")) {
        URL.revokeObjectURL(mainImage.preview);
      }
      setMainImage(null);
    }
  };

  // Handle gallery image removal
  const handleRemoveGalleryImage = (id: string) => {
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

  // Handle gallery image drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newImages = [...galleryImages];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    setGalleryImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Handle image viewer
  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const closeImageViewer = () => {
    setShowImageModal(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const allImages = [
      ...(mainImage ? [mainImage] : []),
      ...galleryImages
    ];
    
    if (direction === 'prev') {
      setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    } else {
      setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    }
  };

  // Keyboard navigation for image viewer
  useEffect(() => {
    if (!showImageModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateImage('next');
      } else if (e.key === 'Escape') {
        closeImageViewer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, mainImage, galleryImages]);

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();


    if (currentStep < steps.length - 1) {
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.property_type_id) {
      toast({
        title: "Error",
        description: "Property type is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.purpose_id) {
      toast({
        title: "Error",
        description: "Purpose is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.completion_status_id) {
      toast({
        title: "Error",
        description: "Completion status is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.occupant_type_id) {
      toast({
        title: "Error",
        description: "Occupant type is required",
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

    if (!formData.price) {
      toast({
        title: "Error",
        description: "Price is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.place.trim()) {
      toast({
        title: "Error",
        description: "Place (City/Area) is required",
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

    if (!formData.currency.trim()) {
      toast({
        title: "Error",
        description: "Currency is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.rent_period.trim()) {
      toast({
        title: "Error",
        description: "Rent period is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.handover_date.trim()) {
      toast({
        title: "Error",
        description: "Handover date is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.building_name.trim()) {
      toast({
        title: "Error",
        description: "Building name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.unit_number.trim()) {
      toast({
        title: "Error",
        description: "Unit number is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.project_name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    if (!mainImage) {

      toast({
        title: "Error",
        description: "Featured image is required",
        variant: "destructive",
      });
      return;
    }

    // Check if location is selected (latitude and longitude are required)
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Error",
        description: "Please select a location on the map",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();

      // Helper function to check if a value has changed
      const hasChanged = (field: string, currentValue: any, originalValue: any) => {
        if (propertyId && originalPropertyData) {
          // For update, only send if changed
          return String(currentValue || "") !== String(originalValue || "");
        }
        // For create, always send
        return true;
      };

      // Helper function to append field if changed
      const appendIfChanged = (key: string, value: any, originalValue?: any) => {
        if (hasChanged(key, value, originalValue)) {
          if (value !== null && value !== undefined && value !== "") {
            formDataToSend.append(key, String(value));
          }
        }
      };

      // Add text fields (only if changed for updates)
      if (hasChanged("title", formData.title, originalPropertyData?.title)) {
        formDataToSend.append("title", formData.title);
      }
      if (hasChanged("description", formData.description, originalPropertyData?.description)) {
        formDataToSend.append("description", formData.description);
      }
      if (hasChanged("property_type_id", formData.property_type_id, originalPropertyData?.property_type?.id)) {
        formDataToSend.append("property_type_id", formData.property_type_id);
      }
      if (hasChanged("purpose_id", formData.purpose_id, originalPropertyData?.purpose?.id)) {
        formDataToSend.append("purpose_id", formData.purpose_id);
      }
      if (hasChanged("completion_status_id", formData.completion_status_id, originalPropertyData?.completion_status?.id)) {
        formDataToSend.append("completion_status_id", formData.completion_status_id);
      }
      if (hasChanged("address", formData.address, originalPropertyData?.address)) {
        formDataToSend.append("address", formData.address);
      }
      if (hasChanged("place", formData.place, originalPropertyData?.place)) {
        formDataToSend.append("place", formData.place);
      }
      if (hasChanged("price", formData.price, originalPropertyData?.price)) {
        formDataToSend.append("price", formData.price);
      }

      // Optional fields (only if changed)
      if (formData.furnishing_status_id && formData.furnishing_status_id !== "none") {
        if (hasChanged("furnishing_status_id", formData.furnishing_status_id, originalPropertyData?.furnishing_status?.id)) {
          formDataToSend.append("furnishing_status_id", formData.furnishing_status_id);
        }
      }
      appendIfChanged("building_name", formData.building_name, originalPropertyData?.building_name);
      appendIfChanged("floor_number", formData.floor_number, originalPropertyData?.floor_number);
      appendIfChanged("unit_number", formData.unit_number, originalPropertyData?.unit_number);
      
      if (formData.latitude) {
        const latValue = parseFloat(formData.latitude);
        const roundedLat = latValue.toFixed(8);
        const finalLat = parseFloat(roundedLat).toString();
        if (hasChanged("latitude", finalLat, originalPropertyData?.location_latitude?.toString())) {
          formDataToSend.append("latitude", finalLat);
        }
      }
      if (formData.longitude) {
        const lngValue = parseFloat(formData.longitude);
        const roundedLng = lngValue.toFixed(8);
        const finalLng = parseFloat(roundedLng).toString();
        if (hasChanged("longitude", finalLng, originalPropertyData?.location_longitude?.toString())) {
          formDataToSend.append("longitude", finalLng);
        }
      }
      
      appendIfChanged("bedrooms", formData.bedrooms, originalPropertyData?.bedrooms);
      appendIfChanged("bathrooms", formData.bathrooms, originalPropertyData?.bathrooms);
      
      if (formData.occupant_type_id) {
        if (hasChanged("occupant_type_id", formData.occupant_type_id, originalPropertyData?.occupant_type?.id)) {
          formDataToSend.append("occupant_type_id", formData.occupant_type_id);
        }
      }
      
      if (formData.currency) {
        if (hasChanged("currency", formData.currency, originalPropertyData?.currency)) {
          formDataToSend.append("currency", formData.currency);
        }
      }
      if (formData.rent_period) {
        if (hasChanged("rent_period", formData.rent_period, originalPropertyData?.rent_period)) {
          formDataToSend.append("rent_period", formData.rent_period);
        }
      }
      appendIfChanged("handover_date", formData.handover_date, originalPropertyData?.handover_date);
      appendIfChanged("developer_name", formData.developer_name, originalPropertyData?.developer_name);
      appendIfChanged("project_name", formData.project_name, originalPropertyData?.project_name);

      // Add social media - always include all fields, even if empty (for clearing removed links)
      const socialMedia: Record<string, string> = {
        instagram: formData.social_media.instagram?.trim() || "",
        tiktok: formData.social_media.tiktok?.trim() || "",
        youtube: formData.social_media.youtube?.trim() || "",
      };
      
      // For updates, always send social_media (even if all empty) to ensure backend receives current state
      // For creates, only send if at least one field has a value
      if (propertyId) {
        // Update mode: Always send social_media to ensure backend receives current state
        // This ensures empty keys are sent when all links are removed
        formDataToSend.append("social_media", JSON.stringify(socialMedia));
      } else {
        // Create mode: Only send if at least one field has a value
        if (socialMedia.instagram || socialMedia.tiktok || socialMedia.youtube) {
          formDataToSend.append("social_media", JSON.stringify(socialMedia));
        }
      }

      // Add amenity IDs as array (only if changed)
      const originalAmenityIds = originalPropertyData?.amenities?.map((a: any) => a.id) || [];
      const currentAmenityIds = formData.amenity_ids || [];
      const amenitiesChanged = JSON.stringify([...originalAmenityIds].sort()) !== JSON.stringify([...currentAmenityIds].sort());
      if (amenitiesChanged) {
        formData.amenity_ids.forEach((id) => {
          formDataToSend.append("amenity_ids", id.toString());
        });
      }

      // Show loading modal and compress images
      setShowLoadingModal(true);
      setLoadingStep("Preparing images...");
      setLoadingProgress(0);

      // Collect all images that need compression
      const imagesToCompress: { file: File; type: 'main' | 'gallery'; index?: number }[] = [];
      
      if (mainImage?.file && mainImage.file instanceof File) {
        imagesToCompress.push({ file: mainImage.file, type: 'main' });
      }
      
      galleryImages.forEach((img, index) => {
        if (img.file && img.file instanceof File) {
          imagesToCompress.push({ file: img.file, type: 'gallery', index });
        }
      });

      setTotalImages(imagesToCompress.length);
      setCompressingCount(0);

      // Compress images with progress tracking
      const compressedImages: { file: File; type: 'main' | 'gallery'; index?: number }[] = [];
      
      for (let i = 0; i < imagesToCompress.length; i++) {
        const img = imagesToCompress[i];
        setLoadingStep(`Compressing image ${i + 1} of ${imagesToCompress.length}...`);
        setCompressingCount(i + 1);
        setLoadingProgress(((i + 1) / imagesToCompress.length) * 50); // 50% for compression
        
        try {
          // Compress to ~1MB per image before upload
          const compressedFile = await compressImage(img.file, 1);
          compressedImages.push({ ...img, file: compressedFile });
        } catch (error) {
          console.error("Error compressing image:", error);
          // Use original file if compression fails
          compressedImages.push(img);
        }
      }

      setLoadingStep("Uploading to server...");
      setLoadingProgress(60);

      // Handle images differently for CREATE vs UPDATE
      if (propertyId) {
        // UPDATE: Use gallery_images_data format
        const compressedMain = compressedImages.find(img => img.type === 'main');
        
        // Only send main image if it has changed
        if (compressedMain) {
          const truncatedFile = new File([compressedMain.file], truncateFilename(compressedMain.file.name), { type: compressedMain.file.type });
          formDataToSend.append("main_image", truncatedFile);
        }

        // Gallery Images - send only changed/new images without indices or IDs
        // Only send gallery images if they have changed (new files or replaced files)
        if (galleryImages.length > 0) {
          galleryImages.forEach((image, index) => {
            // Only send if it's a new image or an existing image with a new file
            const compressedGallery = compressedImages.find(
              img => img.type === 'gallery' && img.index === index
            );
            if (compressedGallery) {
              // Send the image file with the key "gallery_images_data" (no index, no ID)
              const truncatedFile = new File([compressedGallery.file], truncateFilename(compressedGallery.file.name), { type: compressedGallery.file.type });
              formDataToSend.append("gallery_images_data", truncatedFile);
            }
          });
        }

        // Send deleted image IDs as a JSON array
        if (deletedImageIds.length > 0) {
          const integerIds = deletedImageIds
            .map(id => {
              const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
              return (!isNaN(parsed) && parsed > 0) ? parsed : null;
            })
            .filter((id): id is number => id !== null);
          
          const uniqueIds = Array.from(new Set(integerIds));
          // Send as JSON array string
          formDataToSend.append("gallery_images_to_delete", JSON.stringify(uniqueIds));


        }
      } else {
        // CREATE: Use gallery_images_data format
        const compressedMain = compressedImages.find(img => img.type === 'main');
        if (compressedMain) {
          const truncatedFile = new File([compressedMain.file], truncateFilename(compressedMain.file.name), { type: compressedMain.file.type });
          formDataToSend.append("main_image", truncatedFile);
        }
        
        // Gallery Images - use gallery_images_data format (same as update)
        const compressedGalleryImages = compressedImages.filter(img => img.type === 'gallery');
        compressedGalleryImages.forEach((compressedImg) => {
          const truncatedFile = new File([compressedImg.file], truncateFilename(compressedImg.file.name), { type: compressedImg.file.type });
          formDataToSend.append("gallery_images_data", truncatedFile);
        });
      }

      setLoadingProgress(80);
      setLoadingStep("Saving property...");

      // Calculate and log total payload size
      let totalPayloadSize = 0;
      const payloadBreakdown: { key: string; size: number; sizeMB: string; type: string }[] = [];
      
      for (const [key, value] of formDataToSend.entries()) {
        let size = 0;
        let type = 'string';
        
        if (value instanceof File) {
          size = value.size;
          type = `File (${value.type})`;
        } else if (value instanceof Blob) {
          size = value.size;
          type = `Blob (${value.type})`;
        } else {
          // String values - estimate size (UTF-8 encoding: 1 byte per ASCII char, up to 4 bytes per char)
          size = new Blob([String(value)]).size;
          type = 'string';
        }
        
        totalPayloadSize += size;
        payloadBreakdown.push({
          key,
          size,
          sizeMB: (size / 1024 / 1024).toFixed(2),
          type
        });
      }
      
      const totalPayloadSizeMB = (totalPayloadSize / 1024 / 1024).toFixed(2);
      console.log(`📦 Total Payload Size: ${totalPayloadSizeMB}MB (${(totalPayloadSize / 1024).toFixed(2)}KB)`);
      console.log(`📋 Payload Breakdown:`);
      payloadBreakdown.forEach(item => {
        console.log(`   ${item.key}: ${item.sizeMB}MB (${item.type})`);
      });

      let response;
      try {
        if (propertyId) {
          response = await updatePropertyApi(propertyId, formDataToSend);
        } else {
          response = await createPropertyApi(formDataToSend);
        }
      } catch (error) {
        setShowLoadingModal(false);
        setIsSubmitting(false);
        throw error;
      }
      
      // Check if response is an error (AxiosError)
      if ('message' in response && 'response' in response) {
        const errorResponse = response as any;
        const statusCode = errorResponse.response?.status;
        
        // Don't show error for 401 or 409 - token refresh is handled automatically
        if (statusCode === 401 || statusCode === 409) {
          setShowLoadingModal(false);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Check if response has status property (AxiosResponse)
      const isAxiosResponse = 'status' in response && 'data' in response;
      const responseData = isAxiosResponse 
        ? (response as any).data 
        : (response as any)?.data?.data ?? (response as any)?.data;

      // Check for success: either success: true OR status_code 200-299 OR HTTP status 200-299
      const httpStatus = isAxiosResponse ? (response as any).status : null;
      const apiStatusCode = responseData?.status_code;
      const apiSuccess = responseData?.success === true;
      
      const isSuccess = apiSuccess || 
                       (httpStatus >= 200 && httpStatus < 300) ||
                       (apiStatusCode >= 200 && apiStatusCode < 300);

      if (isSuccess) {
        setLoadingProgress(100);
        setLoadingStep("Complete!");
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setShowLoadingModal(false);
        
        toast({
          title: "Success",
          description: responseData?.message || (propertyId
            ? "Property updated successfully"
            : "Property created successfully"),
        });
        
        // Clean up image previews
        if (mainImage?.preview.startsWith("blob:")) {
          URL.revokeObjectURL(mainImage.preview);
        }
        galleryImages.forEach((img) => {
          if (img.preview.startsWith("blob:")) {
            URL.revokeObjectURL(img.preview);
          }
        });
        
        setIsSubmitting(false);

        if (!propertyId) {
          try {
            localStorage.removeItem(draftKey);
          } catch {
            // Ignore storage failures
          }
        }
        
        if (onSuccess) {
          onSuccess();
        } else {
          // Navigate to my properties tab
          navigate("/partner/dashboard?tab=properties");
        }
      } else {
        setShowLoadingModal(false);
        toast({
          title: "Error",
          description: responseData?.message || "Failed to save property",
          variant: "destructive",
        });
      }
    } catch (err) {
      if ((err as any)?.response) {
        const statusCode = (err as any).response?.status;
        if (statusCode === 401) {
          return;
        }
      }
      
      toast({
        title: "Error",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading form data...</p>
      </div>
    );
  }

  const getStepError = (stepIndex: number): string | null => {
    if (stepIndex === 0) {
      if (!formData.title.trim()) return "Title is required";
      if (!formData.property_type_id) return "Property type is required";
      if (!formData.purpose_id) return "Purpose is required";
      if (!formData.completion_status_id) return "Completion status is required";
      if (!formData.occupant_type_id) return "Occupant type is required";
      if (!formData.description.trim()) return "Description is required";
    }

    if (stepIndex === 1) {
      if (!formData.address.trim()) return "Address is required";
      if (!formData.place.trim()) return "Place (City/Area) is required";
      if (!formData.price) return "Price is required";
      if (!formData.currency.trim()) return "Currency is required";
      if (!formData.rent_period.trim()) return "Rent period is required";
      if (!formData.latitude || !formData.longitude) return "Please select a location on the map";
    }

    if (stepIndex === 2) {
      if (!formData.handover_date.trim()) return "Handover date is required";
      if (!formData.building_name.trim()) return "Building name is required";
      if (!formData.unit_number.trim()) return "Unit number is required";
      if (!formData.project_name.trim()) return "Project name is required";
    }

    if (stepIndex === 3) {
      if (!mainImage) return "Featured image is required";
    }

    return null;
  };

  const isStepComplete = (stepIndex: number) => !getStepError(stepIndex);

  const handleNextStep = () => {
    const error = getStepError(currentStep);
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === currentStep) return;
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      return;
    }
    if (stepIndex === currentStep + 1) {
      handleNextStep();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-2xl font-bold text-foreground">
          {propertyId ? "Edit Property" : "Add New Property"}
        </h2>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && currentStep < steps.length - 1) {
            event.preventDefault();
          }
        }}
        className="space-y-6"
      >
        {/* Step Navigation */}
        <div className="bg-card border border-glass-border rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {steps.map((step, index) => {
              const isActive = currentStep === index;
              const isComplete = isStepComplete(index) && index < currentStep;
              const canNavigate =
                index <= currentStep || (index === currentStep + 1 && !getStepError(currentStep));

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isActive
                      ? "border-primary/60 bg-primary/10"
                      : isComplete
                        ? "border-primary/30 bg-muted/30"
                        : "border-glass-border bg-muted/10 hover:bg-muted/20"
                  } ${!canNavigate ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
        </div>

        {/* Basic Information */}
        {currentStep === 0 && (
          <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter property title"
              className="bg-muted/30 border-glass-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter property description"
              className="bg-muted/30 border-glass-border min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property_type_id">Property Type *</Label>
              <Select
                value={formData.property_type_id}
                onValueChange={(value) => handleSelectChange("property_type_id", value)}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose_id">Purpose *</Label>
              <Select
                value={formData.purpose_id}
                onValueChange={(value) => handleSelectChange("purpose_id", value)}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {purposes.map((purpose) => (
                    <SelectItem key={purpose.id} value={String(purpose.id)}>
                      {purpose.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion_status_id">Completion Status *</Label>
              <Select
                value={formData.completion_status_id}
                onValueChange={(value) => handleSelectChange("completion_status_id", value)}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select completion status" />
                </SelectTrigger>
                <SelectContent>
                  {completionStatuses.map((status) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupant_type_id">Occupant Type *</Label>
              <Select
                value={formData.occupant_type_id}
                onValueChange={(value) => handleSelectChange("occupant_type_id", value)}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select occupant type" />
                </SelectTrigger>
                <SelectContent>
                  {occupantTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="furnishing_status_id">Furnishing Status</Label>
              <Select
                value={formData.furnishing_status_id || undefined}
                onValueChange={(value) => handleSelectChange("furnishing_status_id", value === "none" ? "" : value)}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select furnishing status (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {furnishingStatuses.map((status) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
        )}

        {/* Location & Price */}
        {currentStep === 1 && (
          <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Location & Price</h3>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter property address"
              className="bg-muted/30 border-glass-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="place">Place (City/Area) *</Label>
            <Input
              id="place"
              name="place"
              value={formData.place}
              onChange={handleInputChange}
              placeholder="Enter city or area"
              className="bg-muted/30 border-glass-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Location *</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={formData.latitude && formData.longitude ? "default" : "outline"}
                onClick={() => setIsMapPickerOpen(true)}
                className="flex items-center gap-2"
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
              Click the button above to select the property location on the map
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="1500000.00"
                className="bg-muted/30 border-glass-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleSelectChange("currency", value)}
              >
                <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  {/* <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="rent_period">Rent Period *</Label>
            <Select
              value={formData.rent_period || undefined}
              onValueChange={(value) => handleSelectChange("rent_period", value)}
            >
              <SelectTrigger className="bg-muted/30 border-glass-border">
                  <SelectValue placeholder="Select rent period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="from">From</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        )}

        {/* Property Details */}
        {currentStep === 2 && (
          <>
            <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Property Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={handleInputChange}
                placeholder="No.of Bedrooms"
                className="bg-muted/30 border-glass-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={handleInputChange}
                placeholder="No.of Bathrooms"
                className="bg-muted/30 border-glass-border"
              />
            </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="handover_date">Handover Date *</Label>
              <DatePicker
                id="handover_date"
                name="handover_date"
                value={formData.handover_date || undefined}
                onChange={(date) => {
                  const dateString = date ? format(date, "yyyy-MM-dd") : "";
                  handleInputChange({
                    target: { name: "handover_date", value: dateString }
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                placeholder="Select handover date"
                className="bg-muted/30 border-glass-border hover:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="building_name">Building Name *</Label>
              <Input
                id="building_name"
                name="building_name"
                value={formData.building_name}
                onChange={handleInputChange}
                placeholder="Tower A"
                className="bg-muted/30 border-glass-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor_number">Floor Number</Label>
              <Input
                id="floor_number"
                name="floor_number"
                value={formData.floor_number}
                onChange={handleInputChange}
                placeholder="15"
                className="bg-muted/30 border-glass-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_number">Unit Number *</Label>
              <Input
                id="unit_number"
                name="unit_number"
                value={formData.unit_number}
                onChange={handleInputChange}
                placeholder="1501"
                className="bg-muted/30 border-glass-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="developer_name">Developer Name</Label>
              <Input
                id="developer_name"
                name="developer_name"
                value={formData.developer_name}
                onChange={handleInputChange}
                placeholder="ABC Developers"
                className="bg-muted/30 border-glass-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                name="project_name"
                value={formData.project_name}
                onChange={handleInputChange}
                placeholder="Luxury Towers"
                className="bg-muted/30 border-glass-border"
                required
              />
            </div>
          </div>
            </div>

        {/* Amenities */}
            <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Amenities</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {amenities.map((amenity) => (
              <div key={amenity.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${amenity.id}`}
                  checked={formData.amenity_ids.includes(amenity.id)}
                  onCheckedChange={() => handleAmenityToggle(amenity.id)}
                />
                <Label
                  htmlFor={`amenity-${amenity.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {amenity.name}
                </Label>
              </div>
            ))}
          </div>
            </div>

        {/* Social Media */}
            <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Social Media</h3>
          <p className="text-sm text-muted-foreground">
            Add links to your social media profiles (all fields are optional)
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="social_media_instagram">Instagram</Label>
              <Input
                id="social_media_instagram"
                name="social_media_instagram"
                type="url"
                value={formData.social_media.instagram}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    social_media: {
                      ...prev.social_media,
                      instagram: e.target.value,
                    },
                  }));
                }}
                placeholder="https://www.instagram.com/your-profile/"
                className="bg-muted/30 border-glass-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social_media_tiktok">TikTok</Label>
              <Input
                id="social_media_tiktok"
                name="social_media_tiktok"
                type="url"
                value={formData.social_media.tiktok}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    social_media: {
                      ...prev.social_media,
                      tiktok: e.target.value,
                    },
                  }));
                }}
                placeholder="https://www.tiktok.com/@your-profile"
                className="bg-muted/30 border-glass-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social_media_youtube">YouTube</Label>
              <Input
                id="social_media_youtube"
                name="social_media_youtube"
                type="url"
                value={formData.social_media.youtube}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    social_media: {
                      ...prev.social_media,
                      youtube: e.target.value,
                    },
                  }));
                }}
                placeholder="https://www.youtube.com/channel/your-channel"
                className="bg-muted/30 border-glass-border"
              />
            </div>
          </div>
            </div>
          </>
        )}

        {/* Featured Image */}
        {currentStep === 3 && (
          <>
            <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Featured Image *</h3>
            <p className="text-sm text-muted-foreground">
              Upload a single featured image (max 5MB). This will be the main image displayed for your property. Required.
            </p>
          </div>

          {!mainImage ? (
            <div className="border-2 border-dashed border-glass-border rounded-xl p-8 text-center hover:border-primary transition-colors">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to upload featured image
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleMainImageUpload}
                className="hidden"
                id="main-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("main-image-upload")?.click()}
                className="mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Featured Image
              </Button>
            </div>
          ) : (
            <div className="relative group border-2 border-primary border-dashed rounded-xl overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                Featured
              </div>
              <div className="absolute top-2 right-2 z-10">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMainImage();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <img
                src={mainImage.preview}
                alt="Featured property image"
                className="w-full h-64 object-cover cursor-pointer"
                onClick={() => openImageViewer(0)}
              />
            </div>
          )}
            </div>

        {/* Gallery Images */}
            <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Gallery Images</h3>
            <p className="text-sm text-muted-foreground">
              Upload up to 12 additional images (max 5MB each). Drag to reorder.
            </p>
          </div>

          {/* Image Upload Area */}
          {galleryImages.length < 12 && (
            <div
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-glass-border rounded-xl p-8 text-center hover:border-primary transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop images here, or click to select
              </p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryImageUpload}
                className="hidden"
                id="gallery-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("gallery-image-upload")?.click()}
                className="mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Gallery Images ({galleryImages.length}/12)
              </Button>
            </div>
          )}

          {/* Gallery Image Preview Grid */}
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleryImages.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group border-2 rounded-xl overflow-hidden border-glass-border ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveGalleryImage(image.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 z-10">
                    <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <img
                    src={image.preview}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => openImageViewer(mainImage ? index + 1 : index)}
                  />
                </div>
              ))}
            </div>
          )}
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button type="button" variant="neon" onClick={handleNextStep} disabled={isSubmitting}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                variant="neon"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {propertyId ? "Updating..." : "Creating..."}
                  </span>
                ) : (
                  propertyId ? "Update Property" : "Create Property"
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

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
        }}
        initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
        initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
      />

      {/* Loading Modal */}
      <Dialog open={showLoadingModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center">
              {propertyId ? "Updating Property" : "Creating Property"}
            </DialogTitle>
            <DialogDescription className="text-center">
              Please wait while we process your property...
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
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>This may take a few moments...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={showImageModal} onOpenChange={closeImageViewer}>
        <DialogContent className="max-w-7xl w-full p-0 bg-black/95 border-none">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            {/* Close Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={closeImageViewer}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Previous Button */}
            {(() => {
              const allImages = [
                ...(mainImage ? [mainImage] : []),
                ...galleryImages
              ];
              return allImages.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 text-white hover:bg-white/20"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              ) : null;
            })()}

            {/* Next Button */}
            {(() => {
              const allImages = [
                ...(mainImage ? [mainImage] : []),
                ...galleryImages
              ];
              return allImages.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 text-white hover:bg-white/20"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              ) : null;
            })()}

            {/* Image Display */}
            {(() => {
              const allImages = [
                ...(mainImage ? [mainImage] : []),
                ...galleryImages
              ];
              const currentImage = allImages[selectedImageIndex];
              
              if (!currentImage) return null;
              
              return (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={currentImage.preview}
                    alt={`Image ${selectedImageIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              );
            })()}

            {/* Image Counter */}
            {(() => {
              const allImages = [
                ...(mainImage ? [mainImage] : []),
                ...galleryImages
              ];
              return allImages.length > 1 ? (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
                  {selectedImageIndex + 1} / {allImages.length}
                </div>
              ) : null;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

