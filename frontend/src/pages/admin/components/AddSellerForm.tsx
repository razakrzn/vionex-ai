import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  Upload,
} from "lucide-react";
import { sellersStore } from "@/stores/sellersStore";
import { useToast } from "@/hooks/use-toast";
import { truncateFilename } from "@/utils/fileUtils";
import type { SellerType, SellerStatus } from "@/stores/sellersStore";

interface AddSellerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddSellerForm = ({ isOpen, onOpenChange }: AddSellerFormProps) => {
  const { toast } = useToast();
  const [sellerType, setSellerType] = useState<SellerType>("individual");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // Common fields
    email: "",
    phone: "",
    emirate: "",
    status: "active" as SellerStatus,
    
    // Agent fields
    fullName: "",
    emiratesId: "",
    reraNumber: "",
    
    // Company fields
    companyName: "",
    tradeLicenseNumber: "",
    authorizedPersonName: "",
    authorizedPersonEmiratesId: "",
  });

  const emirates = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Fujairah", "Ras Al Khaimah", "Umm Al Quwain"];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (sellerType === "individual") {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.emirate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.companyName || !formData.email || !formData.phone || !formData.emirate || !formData.authorizedPersonName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check if email already exists
    const existingSellers = sellersStore.getSellers();
    if (existingSellers.some((s) => s.email === formData.email)) {
      toast({
        title: "Error",
        description: "A seller with this email already exists",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Add seller
    setTimeout(() => {
      const sellerData: any = {
        type: sellerType,
        email: formData.email,
        phone: formData.phone,
        emirate: formData.emirate,
        status: formData.status,
      };

      if (sellerType === "individual") {
        sellerData.name = formData.fullName;
        sellerData.fullName = formData.fullName;
        sellerData.emiratesId = formData.emiratesId;
        sellerData.reraNumber = formData.reraNumber;
      } else {
        sellerData.name = formData.companyName;
        sellerData.companyName = formData.companyName;
        sellerData.tradeLicenseNumber = formData.tradeLicenseNumber;
        sellerData.authorizedPersonName = formData.authorizedPersonName;
        sellerData.authorizedPersonEmiratesId = formData.authorizedPersonEmiratesId;
      }

      sellersStore.addSeller(sellerData);

      toast({
        title: "Success",
        description: "Seller added successfully",
      });

      // Reset form
      setFormData({
        email: "",
        phone: "",
        emirate: "",
        status: "active",
        fullName: "",
        emiratesId: "",
        reraNumber: "",
        companyName: "",
        tradeLicenseNumber: "",
        authorizedPersonName: "",
        authorizedPersonEmiratesId: "",
      });
      setSellerType("individual");
      setDocumentFile(null);

      setIsSubmitting(false);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-glass-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl">
            Add New Seller
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seller Type Selection */}
          <div className="bg-muted/30 border border-glass-border rounded-xl p-6 space-y-4">
            <Label className="text-lg font-semibold">Seller Type</Label>
            <div className="space-y-3">
              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  sellerType === "individual"
                    ? "border-primary bg-primary/10"
                    : "border-glass-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={sellerType === "individual"}
                  onCheckedChange={() => setSellerType("individual")}
                />
                <User className="w-6 h-6 text-primary" />
                <div>
                  <span className="font-semibold text-foreground">Individual Agent</span>
                  <p className="text-sm text-muted-foreground">RERA certified real estate agent</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  sellerType === "company"
                    ? "border-primary bg-primary/10"
                    : "border-glass-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={sellerType === "company"}
                  onCheckedChange={() => setSellerType("company")}
                />
                <Building2 className="w-6 h-6 text-primary" />
                <div>
                  <span className="font-semibold text-foreground">Real Estate Company</span>
                  <p className="text-sm text-muted-foreground">Registered UAE business entity</p>
                </div>
              </label>
            </div>
          </div>

          {/* Common Fields */}
          <div className="bg-muted/30 border border-glass-border rounded-xl p-6 space-y-4">
            <Label className="text-lg font-semibold">Contact Information</Label>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 bg-background border-glass-border"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+971 XX XXX XXXX"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10 bg-background border-glass-border"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emirate *</Label>
                  <Select value={formData.emirate} onValueChange={(v) => handleSelectChange("emirate", v)}>
                    <SelectTrigger className="bg-background border-glass-border">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {emirates.map((emirate) => (
                        <SelectItem key={emirate} value={emirate}>{emirate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v as SellerStatus)}>
                    <SelectTrigger className="bg-background border-glass-border">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Individual-specific fields */}
          {sellerType === "individual" && (
            <div className="bg-muted/30 border border-glass-border rounded-xl p-6 space-y-4">
              <Label className="text-lg font-semibold">Agent Details (UAE Law Compliant)</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name (as per Emirates ID) *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="pl-10 bg-background border-glass-border"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emiratesId">Emirates ID Number</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emiratesId"
                      name="emiratesId"
                      placeholder="784-XXXX-XXXXXXX-X"
                      value={formData.emiratesId}
                      onChange={handleInputChange}
                      className="pl-10 bg-background border-glass-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reraNumber">RERA/BRN Number</Label>
                  <Input
                    id="reraNumber"
                    name="reraNumber"
                    placeholder="RERA Number"
                    value={formData.reraNumber}
                    onChange={handleInputChange}
                    className="bg-background border-glass-border"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Company-specific fields */}
          {sellerType === "company" && (
            <div className="bg-muted/30 border border-glass-border rounded-xl p-6 space-y-4">
              <Label className="text-lg font-semibold">Company Details (UAE Law Compliant)</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name (as per Trade License) *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="pl-10 bg-background border-glass-border"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tradeLicenseNumber">Trade License Number</Label>
                  <Input
                    id="tradeLicenseNumber"
                    name="tradeLicenseNumber"
                    placeholder="License Number"
                    value={formData.tradeLicenseNumber}
                    onChange={handleInputChange}
                    className="bg-background border-glass-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorizedPersonName">Authorized Person Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="authorizedPersonName"
                      name="authorizedPersonName"
                      placeholder="Full name of authorized representative"
                      value={formData.authorizedPersonName}
                      onChange={handleInputChange}
                      className="pl-10 bg-background border-glass-border"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorizedPersonEmiratesId">Authorized Person Emirates ID</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="authorizedPersonEmiratesId"
                      name="authorizedPersonEmiratesId"
                      placeholder="784-XXXX-XXXXXXX-X"
                      value={formData.authorizedPersonEmiratesId}
                      onChange={handleInputChange}
                      className="pl-10 bg-background border-glass-border"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Upload - Optional */}
          <div className="bg-muted/30 border border-glass-border rounded-xl p-6 space-y-4">
            <Label className="text-lg font-semibold">Document Upload (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              {sellerType === "individual" 
                ? "Upload Emirates ID and RERA certificate (PDF or Image)" 
                : "Upload Trade License and Company registration documents (PDF or Image)"
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
                    <p className="text-sm text-muted-foreground">PDF or Image (Max 10MB)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="neon" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Seller"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

