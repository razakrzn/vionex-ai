import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, User, Mail, Phone, MapPin, Building2, FileText, Calendar, CheckCircle2, XCircle, Clock, Bed, Bath, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSidebar from "@/components/AdSidebar";
import { getAgentDetailsApi, type AdminUser } from "@/services/admin/users";
import { getPropertiesByOwnerIdApi, type PartnerProperty } from "@/services/partner/myspace";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";

interface Agent extends AdminUser {
  company_name?: string | null;
  seller_type_display?: string;
  emirate_name?: string;
  country_name?: string;
  whatsapp_number?: string | null;
  about_me?: string | null;
}

const AgentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<PartnerProperty[]>([]);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch agent details
  useEffect(() => {
    if (!id) {
      setError("Agent ID is missing");
      setIsLoadingAgent(false);
      return;
    }

    const fetchAgent = async () => {
      try {
        setIsLoadingAgent(true);
        setError(null);
        const response = await getAgentDetailsApi(id);

        if (response && 'data' in response && 'status' in response) {
          const responseData = response.data;
          // Handle both single user object and array response
          let agentData: Agent | null = null;

          if (Array.isArray(responseData?.data)) {
            // If it's an array, find the agent with matching id
            agentData = responseData.data.find((user: AdminUser) => user.id.toString() === id) as Agent || null;
          } else if (responseData?.data && typeof responseData.data === 'object' && 'id' in responseData.data) {
            // Single user object
            agentData = responseData.data as Agent;
          }

          if (agentData) {
            setAgent(agentData);
          } else {
            setError("Agent not found");
          }
        }
      } catch (err) {
        console.error("Error fetching agent:", err);
        setError("Failed to load agent details");
        toast({
          title: "Error",
          description: "Failed to load agent details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAgent(false);
      }
    };

    fetchAgent();
  }, [id, toast]);

  // Fetch properties by owner_id
  useEffect(() => {
    if (!id) return;

    const fetchProperties = async () => {
      try {
        setIsLoadingProperties(true);
        const response = await getPropertiesByOwnerIdApi(id);

        if (response && 'data' in response && 'status' in response) {
          const responseData = response.data;
          const propertiesData = responseData?.data || [];

          if (Array.isArray(propertiesData)) {
            setProperties(propertiesData);
          }
        }
      } catch (err) {
        console.error("Error fetching properties:", err);
      } finally {
        setIsLoadingProperties(false);
      }
    };

    fetchProperties();
  }, [id]);

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getVerificationBadge = (status: string | null | undefined) => {
    if (!status) return null;

    const statusUpper = status.toUpperCase();
    if (statusUpper === "APPROVED") {
      return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    } else if (statusUpper === "REJECTED") {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    } else {
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatPrice = (price: string, currency: string, rentPeriod?: string) => {
    const formattedPrice = parseFloat(price).toLocaleString();
    return `${formattedPrice} ${currency}${rentPeriod ? `/${rentPeriod}` : ''}`;
  };
  const seoTitle = agent?.full_name ?? "Agent Details";
  const seoDescription =
    agent?.about_me ??
    "View agent profile details, listings, and contact information on Vionex AI.";

  if (isLoadingAgent) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Agent Details" description={seoDescription} />
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Agent Details" description={seoDescription} />
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Agent Not Found</h1>
            <p className="text-muted-foreground">{error || "The agent you're looking for doesn't exist."}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = agent.company_name || agent.full_name || agent.email || "Agent";

  return (
    <div className="min-h-screen bg-background">
      <Seo title={seoTitle} description={seoDescription} />
      <Header />

      <div className="flex pt-16 md:pt-20">
        {/* Main Content */}
        <div className="w-full lg:w-[70%] min-h-screen">
          <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>

            {/* Agent Profile Section */}
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-primary/30">
                  {agent.profile_picture ? (
                    <AvatarImage src={agent.profile_picture} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {getInitials(agent.full_name || agent.company_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
                      <p className="text-muted-foreground mb-4">
                        {agent.seller_type_display || agent.seller_type || "Agent"}
                      </p>
                    </div>
                    {getVerificationBadge(agent.verification_status)}
                  </div>

                  {/* Contact Information */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {agent.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{agent.email}</span>
                      </div>
                    )}
                    {agent.mobile_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{agent.mobile_number}</span>
                      </div>
                    )}
                    {agent.whatsapp_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>WhatsApp: {agent.whatsapp_number}</span>
                      </div>
                    )}
                    {agent.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{agent.address}</span>
                      </div>
                    )}
                    {(agent.emirate_name || agent.country_name) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {agent.emirate_name || ""}
                          {agent.emirate_name && agent.country_name ? `, ${agent.country_name}` : agent.country_name || ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* About Me */}
              {agent.about_me && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold text-lg mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{agent.about_me}</p>
                </div>
              )}

              {/* Rejection Note */}
              {agent.rejection_note && (
                <div className="mt-6 pt-6 border-t border-border p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h3 className="font-semibold text-lg text-red-500 mb-2">Rejection Note</h3>
                  <p className="text-sm text-muted-foreground">{agent.rejection_note}</p>
                </div>
              )}
            </div>

            {/* Properties Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Properties ({properties.length})</h2>

              {isLoadingProperties ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : properties.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-lg border border-border">
                  <p className="text-muted-foreground">No properties available</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      onClick={() => navigate(`/property/${property.id}`)}
                      className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      {property.main_image && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={property.main_image}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{property.title}</h3>
                        <p className="text-primary font-bold mb-2">
                          {formatPrice(property.price, property.currency, property.rent_period)}
                        </p>
                        {property.place && (
                          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{property.place}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {property.bedrooms && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-4 h-4" />
                              {property.bedrooms}
                            </span>
                          )}
                          {property.bathrooms && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-4 h-4" />
                              {property.bathrooms}
                            </span>
                          )}
                          {property.property_type_name && (
                            <span>{property.property_type_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: Fixed Ad Sidebar */}
        <div className="hidden lg:block">
          <AdSidebar />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AgentDetails;

