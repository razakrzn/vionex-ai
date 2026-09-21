import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  MapPin,
  Calendar,
  Users,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Building2,
  Car,
  Package,
  Clock,
} from "lucide-react";
import { listingsStore, Listing } from "@/stores/listingsStore";
import { useToast } from "@/hooks/use-toast";

interface ReviewModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReviewModal = ({ listing, isOpen, onOpenChange }: ReviewModalProps) => {
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState("");

  if (!listing) return null;

  const handleApprove = () => {
    listingsStore.approveListing(listing.id, reviewNote);
    toast({
      title: "Listing Approved",
      description: `"${listing.title}" is now live on the website.`,
    });
    onOpenChange(false);
    setReviewNote("");
  };

  const handleReject = () => {
    if (reviewNote.trim()) {
      listingsStore.rejectListing(listing.id, reviewNote);
      toast({
        title: "Listing Rejected",
        description: "The partner will be notified with your feedback.",
        variant: "destructive",
      });
      onOpenChange(false);
      setReviewNote("");
    } else {
      toast({
        title: "Note Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "property":
        return <Building2 className="w-4 h-4" />;
      case "vehicle":
        return <Car className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-glass-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Review Listing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {listing.photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {listing.photoPreviews.map((preview, idx) => (
                <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-foreground">{listing.title}</h3>
              <div className="flex items-center gap-2">
                {getCategoryIcon(listing.category)}
                <span className="text-muted-foreground capitalize">{listing.category}</span>
                {getStatusBadge(listing.status)}
              </div>
              <p className="text-muted-foreground text-sm">{listing.description}</p>
            </div>

            <div className="space-y-2 text-sm">
              <DetailItem icon={MapPin} text={`${listing.location}, ${listing.emirate}`} />
              <DetailItem icon={Calendar} text={`Submitted: ${listing.createdAt}`} />
              <DetailItem icon={Users} text={`Partner: ${listing.partnerName}`} />
              <DetailItem icon={Mail} text={listing.partnerEmail} />
              <DetailItem icon={Phone} text={listing.phone} />
            </div>
          </div>

          <CategoryDetails listing={listing} />
          <PriceDisplay price={listing.price} />

          {listing.status === "pending" && (
            <ReviewNoteInput value={reviewNote} onChange={setReviewNote} />
          )}

          {listing.reviewNote && <PreviousReviewNote listing={listing} />}
        </div>

        <DialogFooter className="gap-2">
          {listing.status === "pending" ? (
            <>
              <Button variant="destructive" onClick={handleReject}>
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button variant="neon" onClick={handleApprove}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve & Publish
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DetailItem = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Icon className="w-4 h-4" />
    <span>{text}</span>
  </div>
);

const CategoryDetails = ({ listing }: { listing: Listing }) => (
  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
    <h4 className="font-medium text-foreground">Listing Details</h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      {listing.category === "property" && (
        <>
          <DetailField label="Type:" value={listing.propertyType || "-"} />
          <DetailField label="Bedrooms:" value={listing.bedrooms || "-"} />
          <DetailField label="Bathrooms:" value={listing.bathrooms || "-"} />
          <DetailField label="Area:" value={listing.area ? `${listing.area} sqft` : "-"} />
        </>
      )}
      {listing.category === "vehicle" && (
        <>
          <DetailField label="Make:" value={listing.make || "-"} />
          <DetailField label="Model:" value={listing.model || "-"} />
          <DetailField label="Year:" value={listing.year || "-"} />
          <DetailField label="Mileage:" value={listing.mileage ? `${listing.mileage} km` : "-"} />
        </>
      )}
      {listing.category === "other" && (
        <DetailField label="Item Type:" value={listing.itemType || "-"} />
      )}
    </div>
  </div>
);

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-muted-foreground">{label}</span>
    <p className="font-medium">{value}</p>
  </div>
);

const PriceDisplay = ({ price }: { price: string }) => (
  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Listed Price (not verified)</span>
      <span className="text-2xl font-bold text-primary neon-text">
        AED {Number(price).toLocaleString()}
      </span>
    </div>
  </div>
);

const ReviewNoteInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <div className="space-y-2">
    <Label>Review Note (required for rejection)</Label>
    <Textarea
      placeholder="Add notes about this listing..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-muted/30 border-glass-border min-h-[80px]"
    />
  </div>
);

const PreviousReviewNote = ({ listing }: { listing: Listing }) => (
  <div className="bg-muted/30 rounded-lg p-4">
    <h4 className="font-medium text-foreground mb-2">Review Note</h4>
    <p className="text-sm text-muted-foreground">{listing.reviewNote}</p>
    {listing.reviewedAt && (
      <p className="text-xs text-muted-foreground mt-2">Reviewed on {listing.reviewedAt}</p>
    )}
  </div>
);