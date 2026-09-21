import { useState, useEffect, useRef } from "react";
import { Search, Plus, Edit2, X, Upload, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { truncateFilename } from "@/utils/fileUtils";
import {
  getAdsApi,
  createAdApi,
  updateAdApi,
  patchAdApi,
  deleteAdApi,
  type Ad,
  type GalleryImage,
} from "@/services/admin/ads";

// Image compression utility - compresses to max 1MB
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
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, extension), {
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

interface ImagePreview {
  file?: File;
  url?: string;
  isExisting?: boolean;
  imageId?: number; // ID of existing image from backend
}

export const AdsTab = () => {
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    brand_name: "",
    location: "",
    video_url: "",
    total_units: "",
    billing_cycle: "monthly",
    whatsapp_number: "",
  });
  
  const [logoFile, setLogoFile] = useState<ImagePreview | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<ImagePreview[]>([]);
  // Track original gallery images to detect deletions
  const [originalGalleryImages, setOriginalGalleryImages] = useState<GalleryImage[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  // Track image error handling to prevent infinite loops (using string keys for adId-src combinations)
  const imageErrorHandledRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setIsLoading(true);
    try {

      const res: any = await getAdsApi();
      const responseData = res?.data ?? res;

      // Handle response structure: data can be directly an array or nested in data.data
      let adsData: Ad[] = [];
      if (responseData?.success) {
        adsData = Array.isArray(responseData.data) 
          ? responseData.data 
          : responseData.data?.data || [];

      } else if (Array.isArray(responseData)) {
        // If response is directly an array
        adsData = responseData;

      } else {
        console.error("Unexpected response structure:", responseData);
        toast({
          title: "Error",
          description: responseData?.message || "Failed to load ads",
          variant: "destructive",
        });
      }

      // Log image data for each ad
      adsData.forEach((ad, index) => {




        if (ad.gallery_images && Array.isArray(ad.gallery_images)) {
          ad.gallery_images.forEach((img, imgIndex) => {

            if (typeof img === 'object' && img.image) {

            }
          });
        }
      });

      setAds(adsData);

    } catch (err) {
      console.error("Error loading ads:", err);
      toast({
        title: "Error",
        description: "Failed to load ads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredAds = (): Ad[] => {
    let filtered = ads;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ad) =>
          (ad.title ?? "").toLowerCase().includes(query) ||
          (ad.brand_name ?? "").toLowerCase().includes(query) ||
          (ad.location ?? "").toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredAds = getFilteredAds();

  const handleAdd = () => {
    setFormData({
      title: "",
      brand_name: "",
      location: "",
      video_url: "",
      total_units: "",
      billing_cycle: "monthly",
      whatsapp_number: "",
    });
    setLogoFile(null);
    setGalleryFiles([]);
    setSelectedAd(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (ad: Ad) => {
    setSelectedAd(ad);
    setFormData({
      title: ad.title ?? "",
      brand_name: ad.brand_name ?? "",
      location: ad.location ?? "",
      video_url: ad.video_url ?? "",
      total_units: ad.total_units != null ? String(ad.total_units) : "",
      billing_cycle: ad.billing_cycle ?? "monthly",
      whatsapp_number: ad.whatsapp_number ?? "",
    });
    setLogoFile(ad.logo ? { url: ad.logo, isExisting: true } : null);
    // Handle gallery_images as array of objects with id and image properties
    const galleryImages = ad.gallery_images || [];
    setOriginalGalleryImages(galleryImages);
    setGalleryFiles(
      galleryImages.map((item) => ({
        url: typeof item === 'string' ? item : item.image,
        isExisting: true,
        imageId: typeof item === 'object' ? item.id : undefined,
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Logo image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoFile({
        file,
        url: event.target?.result as string,
        isExisting: false,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total count (max 3)
    if (galleryFiles.length + files.length > 3) {
      toast({
        title: "Error",
        description: "Maximum 3 gallery images allowed",
        variant: "destructive",
      });
      return;
    }

    const newFiles: ImagePreview[] = [];

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: `${file.name} must be less than 5MB`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        newFiles.push({
          file,
          url: event.target?.result as string,
          isExisting: false,
        });
        if (newFiles.length === files.length) {
          setGalleryFiles([...galleryFiles, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles(galleryFiles.filter((_, i) => i !== index));
  };

  const handleSaveAdd = async () => {
    if (!formData.whatsapp_number.trim()) {
      toast({
        title: "Error",
        description: "WhatsApp number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsCompressing(true);

    try {
      // Compress images
      const compressedGallery: File[] = [];
      
      for (const galleryItem of galleryFiles) {
        if (galleryItem.file) {
          const compressed = await compressImage(galleryItem.file, 1);
          compressedGallery.push(compressed);
        }
      }

      setIsCompressing(false);

      // Create FormData
      const formDataToSend = new FormData();
      if (formData.title.trim()) formDataToSend.append("title", formData.title.trim());
      if (formData.brand_name.trim()) formDataToSend.append("brand_name", formData.brand_name.trim());
      if (formData.location.trim()) formDataToSend.append("location", formData.location.trim());
      if (formData.video_url.trim()) formDataToSend.append("video_url", formData.video_url.trim());
      if (formData.total_units) formDataToSend.append("total_units", formData.total_units);
      if (formData.billing_cycle) formDataToSend.append("billing_cycle", formData.billing_cycle);
      if (formData.whatsapp_number.trim()) {
        formDataToSend.append("whatsapp_number", formData.whatsapp_number.trim());
      }

      if (logoFile?.file) {
        const compressedLogo = await compressImage(logoFile.file, 1);
        const truncatedLogo = new File([compressedLogo], truncateFilename(compressedLogo.name), { type: compressedLogo.type });
        formDataToSend.append("logo", truncatedLogo);
      }
      
      compressedGallery.forEach((file) => {
        const truncatedFile = new File([file], truncateFilename(file.name), { type: file.type });
        formDataToSend.append("gallery_images_data", truncatedFile);
      });

      const res: any = await createAdApi(formDataToSend);
      const responseData = res?.data ?? res;

      if (responseData?.success) {
        await loadAds();
        setIsAddModalOpen(false);
        resetForm();
        toast({
          title: "Success",
          description: "Ad created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to create ad",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating ad:", err);
      toast({
        title: "Error",
        description: "Failed to create ad. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsCompressing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAd) return;

    setIsSubmitting(true);
    setIsCompressing(true);

    try {
      const formDataToSend = new FormData();
      if (formData.title.trim()) formDataToSend.append("title", formData.title.trim());
      if (formData.brand_name.trim()) formDataToSend.append("brand_name", formData.brand_name.trim());
      if (formData.location.trim()) formDataToSend.append("location", formData.location.trim());
      if (formData.video_url.trim()) formDataToSend.append("video_url", formData.video_url.trim());
      if (formData.total_units) formDataToSend.append("total_units", formData.total_units);
      if (formData.billing_cycle) formDataToSend.append("billing_cycle", formData.billing_cycle);
      if (formData.whatsapp_number.trim()) {
        formDataToSend.append("whatsapp_number", formData.whatsapp_number.trim());
      }

      // Handle logo
      if (logoFile?.file) {
        const compressedLogo = await compressImage(logoFile.file, 1);
        const truncatedLogo = new File([compressedLogo], truncateFilename(compressedLogo.name), { type: compressedLogo.type });
        formDataToSend.append("logo", truncatedLogo);
      }

      // Handle gallery images - new files
      const newGalleryFiles = galleryFiles.filter((item) => !item.isExisting && item.file);
      if (newGalleryFiles.length > 0) {
        for (const galleryItem of newGalleryFiles) {
          if (galleryItem.file) {
            const compressed = await compressImage(galleryItem.file, 1);
            const truncatedFile = new File([compressed], truncateFilename(compressed.name), { type: compressed.type });
            formDataToSend.append("gallery_images_data", truncatedFile);
          }
        }
      }

      // Handle deleted gallery images - find IDs of images that were removed
      const currentExistingImageIds = galleryFiles
        .filter((item) => item.isExisting && item.imageId)
        .map((item) => item.imageId!);
      
      const originalImageIds = originalGalleryImages
        .map((item) => typeof item === 'object' ? item.id : null)
        .filter((id): id is number => id !== null);
      
      const deletedImageIds = originalImageIds.filter(
        (id) => !currentExistingImageIds.includes(id)
      );

      // Send deleted image IDs as array
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach((id) => {
          formDataToSend.append("gallery_images_to_delete", id.toString());
        });

      }

      setIsCompressing(false);

      const hasFileUpdates =
        Boolean(logoFile?.file) ||
        newGalleryFiles.length > 0 ||
        deletedImageIds.length > 0;

      const res: any = hasFileUpdates
        ? await updateAdApi(selectedAd.id, formDataToSend)
        : await patchAdApi(selectedAd.id, formDataToSend);
      const responseData = res?.data ?? res;

      if (responseData?.success) {
        await loadAds();
        setIsEditModalOpen(false);
        resetForm();
        toast({
          title: "Success",
          description: "Ad updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to update ad",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating ad:", err);
      toast({
        title: "Error",
        description: "Failed to update ad. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsCompressing(false);
    }
  };

  const handleDelete = async (ad: Ad) => {
    const confirmed = window.confirm(`Delete ad "${ad.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingAdId(ad.id);
    try {
      const res: any = await deleteAdApi(ad.id);
      const responseData = res?.data ?? res;
      if (responseData?.success || res?.status === 204) {
        await loadAds();
        toast({
          title: "Ad deleted",
          description: "The ad has been removed successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: responseData?.message || "Failed to delete ad",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting ad:", error);
      toast({
        title: "Error",
        description: "Failed to delete ad. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingAdId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      brand_name: "",
      location: "",
      video_url: "",
      total_units: "",
      billing_cycle: "monthly",
      whatsapp_number: "",
    });
    setLogoFile(null);
    setGalleryFiles([]);
    setOriginalGalleryImages([]);
    setSelectedAd(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const renderForm = () => (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter ad title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="bg-muted/30 border-glass-border"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand_name">Brand Name</Label>
        <Input
          id="brand_name"
          placeholder="Enter brand name"
          value={formData.brand_name}
          onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
          className="bg-muted/30 border-glass-border"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Logo</Label>
        <div className="flex items-center gap-4">
          {logoFile?.url && (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-glass-border bg-muted/30">
              <img
                src={logoFile.url}
                alt="Logo preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                  }
                }}
              />
              {!logoFile.isExisting && (
                <button
                  onClick={() => setLogoFile(null)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => logoInputRef.current?.click()}
            disabled={isSubmitting}
          >
            <Upload className="w-4 h-4 mr-2" />
            {logoFile ? "Change Logo" : "Upload Logo"}
          </Button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
            disabled={isSubmitting}
          />
        </div>
        <p className="text-xs text-muted-foreground">Max 5MB, image formats only</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Enter location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="bg-muted/30 border-glass-border"
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="video_url">Video URL</Label>
        <Input
          id="video_url"
          placeholder="https://example.com/video.mp4"
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
          className="bg-muted/30 border-glass-border"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="total_units">Total Units</Label>
          <Input
            id="total_units"
            type="number"
            min="0"
            placeholder="Enter total units"
            value={formData.total_units}
            onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
            className="bg-muted/30 border-glass-border"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billing_cycle">Billing Cycle</Label>
        <Select
          value={formData.billing_cycle}
          onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
          disabled={isSubmitting}
        >
          <SelectTrigger className="bg-muted/30 border-glass-border">
            <SelectValue placeholder="Select billing cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
        <Input
          id="whatsapp_number"
          value={formData.whatsapp_number}
          onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
          placeholder="+971"
          className="bg-muted/30 border-glass-border"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>Gallery Images (Max 3)</Label>
        <div className="grid grid-cols-3 gap-4">
          {galleryFiles.map((item, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-glass-border bg-muted/30">
              <img
                src={item.url}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                  }
                }}
              />
              <button
                onClick={() => removeGalleryImage(index)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {galleryFiles.length < 3 && (
            <Button
              type="button"
              variant="outline"
              className="aspect-square"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <ImageIcon className="w-6 h-6" />
            </Button>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryChange}
          className="hidden"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">Max 3 images, 5MB each, image formats only</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Ads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage advertisements
          </p>
        </div>
        <Button onClick={handleAdd} variant="neon" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Ad
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ads by title, brand, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-glass-border"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="bg-card border border-glass-border rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="bg-card border border-glass-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No ads found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map((ad) => {
            // Get first gallery image or logo for card display
            let displayImage: string | null = null;
            
            // Extract first gallery image URL
            if (ad.gallery_images && Array.isArray(ad.gallery_images) && ad.gallery_images.length > 0) {
              const firstGalleryItem = ad.gallery_images[0];

              // Handle both object format {id, image} and string format
              if (typeof firstGalleryItem === 'object' && firstGalleryItem?.image) {
                displayImage = firstGalleryItem.image;

              } else if (typeof firstGalleryItem === 'string') {
                displayImage = firstGalleryItem;

              }
            }
            
            // Fallback to logo if no gallery image
            if (!displayImage && ad.logo) {
              displayImage = ad.logo;

            }

            // Get gallery count
            const galleryCount = ad.gallery_images && Array.isArray(ad.gallery_images) 
              ? ad.gallery_images.length 
              : 0;

            return (
            <Card key={ad.id} className="bg-card border-glass-border overflow-hidden">
              <div className="aspect-video relative bg-muted/30 overflow-hidden">
                {displayImage ? (
                  <>
                    <img
                      key={`${ad.id}-${displayImage}`}
                      src={displayImage}
                      alt={ad.brand_name || ad.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const adId = ad.id;
                        const currentSrc = img.src;
                        const errorKey = `${adId}-${currentSrc}`;
                        
                        // Prevent infinite loop - if we've already handled this error, stop
                        if (imageErrorHandledRef.current[errorKey]) {
                          img.onerror = null;
                          return;
                        }
                        
                        console.warn(`[Ad ${adId}] Image failed to load:`, currentSrc);
                        console.warn(`[Ad ${adId}] This might be due to ad blocker blocking the request (ERR_BLOCKED_BY_CLIENT)`);
                        
                        // Mark as handled
                        imageErrorHandledRef.current[errorKey] = true;
                        
                        // Try logo as fallback if we were showing gallery image
                        if (displayImage !== ad.logo && ad.logo) {
                          img.onerror = null;
                          img.src = ad.logo;
                          // Set one-time error handler for logo
                          img.onerror = function() {
                            const logoErrorKey = `${adId}-${this.src}`;
                            imageErrorHandledRef.current[logoErrorKey] = true;
                            this.onerror = null;
                            this.style.display = 'none';
                            const parent = this.parentElement;
                            if (parent && !parent.querySelector('.image-placeholder')) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'image-placeholder w-full h-full flex flex-col items-center justify-center bg-muted p-4';
                              placeholder.innerHTML = `
                                <svg class="w-12 h-12 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-xs text-muted-foreground text-center">Image blocked by ad blocker</p>
                              `;
                              parent.appendChild(placeholder);
                            }
                          };
                        } else {
                          // Show placeholder
                          img.onerror = null;
                          img.style.display = 'none';
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector('.image-placeholder')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'image-placeholder w-full h-full flex flex-col items-center justify-center bg-muted p-4';
                            placeholder.innerHTML = `
                              <svg class="w-12 h-12 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p class="text-xs text-muted-foreground text-center">Image blocked by ad blocker</p>
                            `;
                            parent.appendChild(placeholder);
                          }
                        }
                      }}
                    />
                    {/* Show gallery count badge if multiple images */}
                    {galleryCount > 1 && (
                      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-foreground border border-glass-border">
                        {galleryCount} images
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg text-foreground truncate">
                    {ad.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{ad.brand_name}</p>
                  {ad.verification_status && (
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                      ad.verification_status === "APPROVED" 
                        ? "bg-green-500/10 text-green-500" 
                        : ad.verification_status === "PENDING"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {ad.verification_status}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Location:</span> {ad.location}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Units:</span> {ad.total_units}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Billing:</span> {ad.billing_cycle}
                  </p>
                  {ad.gallery_images && ad.gallery_images.length > 0 && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Gallery:</span> {ad.gallery_images.length} image{ad.gallery_images.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ad)}
                    disabled={deletingAdId === ad.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletingAdId === ad.id ? "Deleting..." : "Delete"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(ad)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* Add Ad Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-glass-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Ad</DialogTitle>
            <DialogDescription>
              Create a new advertisement
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting || isCompressing}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              onClick={handleSaveAdd}
              disabled={isSubmitting || isCompressing}
            >
              {isSubmitting || isCompressing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isCompressing ? "Compressing..." : "Saving..."}
                </span>
              ) : (
                "Add Ad"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Ad Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-glass-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ad</DialogTitle>
            <DialogDescription>
              Update advertisement information
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting || isCompressing}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              onClick={handleSaveEdit}
              disabled={isSubmitting || isCompressing}
            >
              {isSubmitting || isCompressing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isCompressing ? "Compressing..." : "Saving..."}
                </span>
              ) : (
                "Update Ad"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

