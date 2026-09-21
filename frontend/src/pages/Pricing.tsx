import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Check, Loader2, CreditCard, Zap, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import requestmodel from "@/services/requestmodel";
import base_url from "@/services/base_url";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  duration_days?: number;
  is_duration_unlimited?: boolean;
  features?: string[];
  role?: string;
  seller_type?: string | null;
  is_offer?: boolean;
  offer_percentage?: string | number;
  offer_price?: number;
  max_listings?: number | null;
  is_unlimited?: boolean;
  is_active?: boolean;
}

interface PlansResponse {
  success?: boolean;
  data?: Plan[];
  message?: string;
}

const Pricing = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gymPlans, setGymPlans] = useState<Plan[]>([]);
  const [propertyPlans, setPropertyPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Call API without headers (empty object)
        const url = `${base_url}/payments/plans/`;
        const response = await requestmodel("GET", url, undefined, {});
        
        if ('data' in response && 'status' in response) {
          const responseData = response.data as PlansResponse;
          
          let allPlans: Plan[] = [];
          
          if (responseData?.success && responseData?.data) {
            // Filter only active plans
            allPlans = responseData.data.filter(plan => plan.is_active !== false);
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            // Handle case where data is directly in response
            allPlans = responseData.data.filter((plan: Plan) => plan.is_active !== false);
          } else {
            setError("No pricing plans available");
            setIsLoading(false);
            return;
          }

          // Classify plans by role
          const gymPlansList = allPlans.filter(plan => 
            plan.role?.toLowerCase() === "gym_owner" || 
            plan.role?.toLowerCase() === "fitness"
          );
          const propertyPlansList = allPlans.filter(plan => 
            plan.role?.toLowerCase() === "owner" || 
            plan.role?.toLowerCase() === "agent" ||
            plan.role?.toLowerCase() === "individual" ||
            plan.role?.toLowerCase() === "company"
          ).sort((a, b) => {
            const order = ["INDIVIDUAL", "AGENT", "COMPANY"];
            const aIndex = order.indexOf((a.seller_type || "").toUpperCase());
            const bIndex = order.indexOf((b.seller_type || "").toUpperCase());
            const safeA = aIndex === -1 ? order.length : aIndex;
            const safeB = bIndex === -1 ? order.length : bIndex;
            return safeA - safeB;
          });

          setGymPlans(gymPlansList);
          setPropertyPlans(propertyPlansList);
          setPlans(allPlans); // Keep for backward compatibility if needed
          console.log("[Pricing] plans fetched", {
            total: allPlans.length,
            property: propertyPlansList.length,
            fitness: gymPlansList.length,
            propertyPlanIds: propertyPlansList.map((plan) => plan.id),
            fitnessPlanIds: gymPlansList.map((plan) => plan.id),
          });
        } else {
          setError("Failed to fetch pricing plans");
        }
      } catch (err: any) {
        console.error("Error fetching pricing plans:", err);
        setError(err?.response?.data?.message || "Failed to load pricing plans. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load pricing plans. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const getPlanIcon = () => {
    return <Crown className="h-6 w-6" />;
  };

  const formatPrice = (price: number, currency: string = "AED") => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getRoleLabel = (role?: string) => {
    const normalized = role?.toLowerCase() || "";
    if (normalized === "owner") return "Property";
    if (normalized === "gym_owner" || normalized === "fitness") return "Fitness";
    return role || "";
  };

  const getSellerTypeLabel = (sellerType?: string | null) => {
    if (!sellerType) return "";
    const normalized = sellerType.toUpperCase();
    if (normalized === "INDIVIDUAL") return "Individual";
    if (normalized === "AGENT") return "Agent";
    if (normalized === "COMPANY") return "Company";
    return sellerType;
  };

  const formatDuration = (days?: number, isUnlimited?: boolean) => {
    if (isUnlimited) return "Unlimited";
    if (!days) return "N/A";
    if (days === 30) return "1 Month";
    if (days === 90) return "3 Months";
    if (days === 180) return "6 Months";
    if (days === 365) return "1 Year";
    return `${days} Days`;
  };

  const formatListings = (maxListings?: number | null, isUnlimited?: boolean) => {
    if (isUnlimited) return "Unlimited listings";
    if (maxListings === null || maxListings === undefined) return "Unlimited listings";
    return `Upload ${maxListings} listings`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Pricing"
        description="Compare plans and choose the right subscription to list, promote, and grow with Vionex AI."
        canonical="https://vionex-ai.com/pricing"
      />
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Pricing <span className="text-primary neon-text">Plans</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your needs. All plans include access to our AI-powered marketplace platform.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-8 neon-border text-center">
                <p className="text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Property Plans Section */}
          {!isLoading && !error && propertyPlans.length > 0 && (
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  Property <span className="text-primary">Plans</span>
                </h2>
                <p className="text-muted-foreground">
                  Choose a plan for property listings and real estate services
                </p>
              </div>
              <div className="grid gap-6 max-w-7xl mx-auto justify-center justify-items-center grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                {propertyPlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="glass rounded-2xl p-8 neon-border hover:shadow-glow transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center w-full max-w-sm"
                  >
                  

                    {/* Plan Icon */}
                    <div className="flex flex-col items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        {getPlanIcon()}
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold text-foreground">
                          {plan.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
                         
                          {plan.seller_type && (
                            <span className="px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-glass-border">
                              {getSellerTypeLabel(plan.seller_type)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6 w-full space-y-2">
                      <div className="flex items-baseline justify-center gap-2 flex-wrap">
                        {plan.is_offer && plan.offer_price !== undefined ? (
                          <>
                            <span className="text-base text-muted-foreground line-through">
                              {formatPrice(plan.price, plan.currency)}
                            </span>
                            <span className="text-4xl font-bold text-foreground">
                              {formatPrice(plan.offer_price, plan.currency)}
                            </span>
                          </>
                        ) : (
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(plan.price, plan.currency)}
                          </span>
                        )}
                        {plan.duration_days && !plan.is_duration_unlimited && (
                          <span className="text-muted-foreground">
                            / {formatDuration(plan.duration_days, plan.is_duration_unlimited)}
                          </span>
                        )}
                      </div>
                      {plan.is_duration_unlimited && (
                        <p className="text-sm text-muted-foreground text-center">
                          {formatDuration(plan.duration_days, plan.is_duration_unlimited)}
                        </p>
                      )}
                      {plan.is_offer && plan.offer_percentage && (
                        <div className="flex items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {plan.offer_percentage}% OFF
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground text-center">
                        {formatListings(plan.max_listings, plan.is_duration_unlimited)}
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        5% VAT inclusive
                      </p>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-muted-foreground mb-6 min-h-[3rem]">
                        {plan.description}
                      </p>
                    )}

                    {/* Features */}
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = "/Signup";
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gym Plans Section */}
          {!isLoading && !error && gymPlans.length > 0 && (
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  Fitness <span className="text-primary">Plans</span>
                </h2>
                <p className="text-muted-foreground">
                  Choose a plan for gym and fitness center listings
                </p>
              </div>
              <div className="grid gap-6 max-w-7xl mx-auto justify-center justify-items-center grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                {gymPlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="glass rounded-2xl p-8 neon-border hover:shadow-glow transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center w-full max-w-sm"
                  >
                
                   

                    {/* Plan Icon */}
                    <div className="flex flex-col items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        {getPlanIcon()}
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold text-foreground">
                          {plan.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
                         
                          {plan.seller_type && (
                            <span className="px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-glass-border">
                              {getSellerTypeLabel(plan.seller_type)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6 w-full space-y-2">
                      <div className="flex items-baseline justify-center gap-2 flex-wrap">
                        {plan.is_offer && plan.offer_price !== undefined ? (
                          <>
                            <span className="text-base text-muted-foreground line-through">
                              {formatPrice(plan.price, plan.currency)}
                            </span>
                            <span className="text-4xl font-bold text-foreground">
                              {formatPrice(plan.offer_price, plan.currency)}
                            </span>
                          </>
                        ) : (
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(plan.price, plan.currency)}
                          </span>
                        )}
                        {plan.duration_days && !plan.is_duration_unlimited && (
                          <span className="text-muted-foreground">
                            / {formatDuration(plan.duration_days, plan.is_duration_unlimited)}
                          </span>
                        )}
                      </div>
                      {plan.is_duration_unlimited && (
                        <p className="text-sm text-muted-foreground text-center">
                          {formatDuration(plan.duration_days, plan.is_duration_unlimited)}
                        </p>
                      )}
                      {plan.is_offer && plan.offer_percentage && (
                        <div className="flex items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {plan.offer_percentage}% OFF
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground text-center">
                        {formatListings(plan.max_listings, plan.is_duration_unlimited)}
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        5% VAT inclusive
                      </p>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-muted-foreground mb-6 min-h-[3rem]">
                        {plan.description}
                      </p>
                    )}

                    {/* Features */}
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = "/Signup";
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Plans Grid (if no classification) */}
          {!isLoading && !error && propertyPlans.length === 0 && gymPlans.length === 0 && plans.length > 0 && (
            <div className="grid gap-6 max-w-7xl mx-auto justify-center justify-items-center grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {plans.map((plan, index) => (
                <div
                  key={plan.id}
                  className="glass rounded-2xl p-8 neon-border hover:shadow-glow transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center w-full max-w-sm"
                >
                 

                  {/* Plan Icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      {getPlanIcon()}
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-foreground">
                        {plan.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {plan.role && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {getRoleLabel(plan.role)}
                          </span>
                        )}
                        {plan.seller_type && (
                          <span className="px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-glass-border">
                            {getSellerTypeLabel(plan.seller_type)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {plan.is_offer && plan.offer_price !== undefined ? (
                        <>
                          <span className="text-base text-muted-foreground line-through">
                            {formatPrice(plan.price, plan.currency)}
                          </span>
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(plan.offer_price, plan.currency)}
                          </span>
                        </>
                      ) : (
                        <span className="text-4xl font-bold text-foreground">
                          {formatPrice(plan.price, plan.currency)}
                        </span>
                      )}
                      {plan.duration_days && !plan.is_duration_unlimited && (
                        <span className="text-muted-foreground">
                          / {formatDuration(plan.duration_days, plan.is_duration_unlimited)}
                        </span>
                      )}
                    </div>
                    {plan.is_duration_unlimited && (
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(plan.duration_days, plan.is_duration_unlimited)}
                      </p>
                    )}
                    {plan.is_offer && plan.offer_percentage && (
                      <div className="flex items-center justify-center">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {plan.offer_percentage}% OFF
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground text-center">
                      {formatListings(plan.max_listings, plan.is_duration_unlimited)}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      5% VAT inclusive
                    </p>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="text-muted-foreground mb-6 min-h-[3rem]">
                      {plan.description}
                    </p>
                  )}

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA Button */}
                  <Button
                    variant={index === 1 ? "neon" : "outline"}
                    className="w-full"
                    onClick={() => {
                      // Navigate to partner registration or show login modal
                      if (window.location.pathname !== "/Signup") {
                        window.location.href = "/Signup";
                      }
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No Plans Available */}
          {!isLoading && !error && propertyPlans.length === 0 && gymPlans.length === 0 && plans.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-8 neon-border text-center">
                <p className="text-muted-foreground">
                  No pricing plans available at the moment. Please check back later.
                </p>
              </div>
            </div>
          )}

          {/* Additional Info */}
          {!isLoading && !error && (propertyPlans.length > 0 || gymPlans.length > 0 || plans.length > 0) && (
            <div className="mt-12 text-center">
              <div className="glass rounded-2xl p-6 neon-border max-w-3xl mx-auto">
                <p className="text-sm text-muted-foreground mb-2">
                  All plans are subject to our Terms & Conditions and Privacy Policy.
                </p>
                <p className="text-sm text-muted-foreground">
                  For custom enterprise plans, please contact us at{" "}
                  <a
                    href="mailto:sales@vionexnova.com"
                    className="text-primary hover:underline"
                  >
                    sales@vionexnova.com
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;

