import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Box,
  Heart,
  Share2,
  Shield,
  Star,
  Check,
  Phone,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSidebar from "@/components/AdSidebar";
import Seo from "@/components/Seo";

const NeedsDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the item data from navigation state
  const item = location.state?.item;

  const images = item?.images || [item?.image].filter(Boolean);
  const seoTitle = item?.title ?? "Needs Details";
  const seoDescription =
    item?.description ??
    "View request details and connect with seekers on Vionex AI.";

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        setIsFading(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleThumbnailClick = (index: number) => {
    if (index === currentImageIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
      setIsFading(false);
    }, 300);
  };

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Seo title="Needs Details" description={seoDescription} />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Item not found
          </h1>
          <Button onClick={() => navigate("/")}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title={seoTitle} description={seoDescription} />
      <Header />

      <div className="lg:hidden">
        <AdSidebar />
      </div>

      <div className="flex">
        <div className="w-full lg:w-[60%] min-h-screen">
          <main className="container mx-auto px-4 py-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6 hover:bg-primary/10 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to listings
            </Button>

            {/* Image Gallery */}
            <div className="flex gap-4 mb-8">
              <div className="relative flex-1 rounded-2xl overflow-hidden">
                <img
                  src={images[currentImageIndex]}
                  alt={item.title}
                  className={`w-full h-64 md:h-96 object-cover transition-opacity duration-300 ${
                    isFading ? "opacity-0" : "opacity-100"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-primary/90 text-primary-foreground">
                    {item.type}
                  </span>
                  {item.isHot && (
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-neon-pink/90 text-foreground">
                      🔥 Hot Deal
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="icon" variant="glass" className="rounded-full">
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="glass" className="rounded-full">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                {/* Price */}
                <div className="absolute bottom-4 right-4">
                  <div className="glass rounded-xl px-6 py-3">
                    <p className="font-display text-3xl font-bold text-foreground neon-text">
                      {item.price}{" "}
                      <span className="text-lg font-normal text-muted-foreground">
                        AED
                      </span>
                    </p>
                  </div>
                </div>

                {/* Image counter */}
                <div className="absolute bottom-4 left-4 glass rounded-full px-3 py-1 text-sm text-foreground">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2 w-24">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                        index === currentImageIndex
                          ? "ring-2 ring-primary scale-105"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Location */}
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                {item.title}
              </h1>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                {item.location}
              </p>
            </div>

            {/* Item Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Stat icon={<Box />} label="Condition" value={item.usage || "N/A"} />
              <Stat icon={<DollarSign />} label="Price" value={`${item.price} AED`} />
              <Stat icon={<Clock />} label="Listed" value={`${item.daysListed} days ago`} />
              <Stat icon={<Star />} label="Rating" value="4.5/5" />
            </div>

            {/* Description */}
            <div className="glass rounded-2xl p-6 mb-8 neon-border">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                Description
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This {item.type.toLowerCase()} is located in {item.location}. 
                {item.usage ? ` Condition: ${item.usage}.` : ""}
                Contact the seller for more details or to arrange a purchase.
              </p>
            </div>

            {/* Safety & Verification */}
            <div className="glass rounded-2xl p-6 mb-8 neon-border">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Safety & Verification
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">Verified Seller</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-foreground">Item Verified</span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="glass rounded-2xl p-6 neon-border sticky bottom-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="neon" size="lg" className="flex-1">
                  <Phone className="h-5 w-5 mr-2" />
                  Call Seller
                </Button>
                <Button variant="outline" size="lg" className="flex-1">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>

        <div className="hidden lg:block">
          <AdSidebar />
        </div>
      </div>
    </div>
  );
};

// Reusable Stat component
const Stat = ({ icon, label, value }) => (
  <div className="glass rounded-xl p-4 text-center neon-border">
    <div className="h-6 w-6 text-primary mx-auto mb-2">{icon}</div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-semibold text-foreground">{value}</p>
  </div>
);

export default NeedsDetails;
