import { Home, Dumbbell, ArrowRight, Zap, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const services = [
  {
    id: "space",
    title: "My Space",
    description: "Single rooms, family rooms, camp spaces, and apartments across UAE",
    icon: Home,
    color: "neon-cyan",
    features: ["Single Room", "Family Room", "Camp Space", "Apartment"],
  },
  {
    id: "fitness",
    title: "My Fitness",
    description: "Find the perfect gym and fitness center for your wellness journey",
    icon: Dumbbell,
    color: "neon-purple",
    features: ["Traditional Gym", "Yoga Studio", "CrossFit", "Wellness Center"],
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Instant Connection",
    description: "Connects buyers and sellers instantly ease of deal",
  },
  {
    icon: Shield,
    title: "Verified Listings",
    description: "All listings go through verification",
  },
  {
    icon: CreditCard,
    title: "Cashback Rewards",
    description: "Earn 20% on successful sales",
  },
];

const ServicesSection = () => {
  const navigate = useNavigate();

  const handleServiceClick = (serviceId: string) => {
    navigate(`/listings/${serviceId}`);
  };

  return (
    <section className="py-0 md:py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="absolute right-0 top-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            One Platform, <span className="text-primary neon-text">Endless Possibilities</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Whether you're looking for a place to stay or a fitness center - <strong>Vionex AI</strong> (VionexAI) has you covered. Your trusted AI-powered marketplace in the Middle East.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-10 md:mb-16 max-w-4xl mx-auto">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="group glass rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-500 hover:shadow-glow hover:-translate-y-2 neon-border animate-slide-up cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleServiceClick(service.id)}
            >
              {/* Icon */}
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-${service.color}/20 flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 transition-transform`}>
                <service.icon className={`h-5 w-5 md:h-7 md:w-7 text-${service.color}`} />
              </div>

              <h3 className="font-display text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2 group-hover:text-primary transition-colors">
                {service.title}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-5">
                {service.description}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-5">
                {service.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs bg-muted/50 text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <Button 
                variant="ghost" 
                className="group/btn p-0 h-auto text-primary text-sm md:text-base"
                onClick={(e) => {
                  e.stopPropagation();
                  handleServiceClick(service.id);
                }}
              >
                Explore
                <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-muted/30 border border-glass-border animate-slide-up"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm md:text-base text-foreground mb-1">{benefit.title}</h4>
                <p className="text-xs md:text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
