import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Building2, Target, Users, Zap, Shield, Globe, Heart } from "lucide-react";

const AboutUs = () => {
  const features = [
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "AI-Powered Platform",
      description: "Leveraging cutting-edge artificial intelligence to match you with the perfect properties and fitness centers."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Trusted & Secure",
      description: "Your data and transactions are protected with industry-leading security measures."
    },
    {
      icon: <Globe className="h-8 w-8 text-primary" />,
      title: "Customer Focused",
      description: "Specialized marketplace designed specifically for the Middle East market with local expertise."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Community Driven",
      description: "Connecting property owners, fitness centers, and seekers across the Middle East."
    }
  ];

  const values = [
    {
      title: "Innovation",
      description: "We continuously evolve our platform with the latest technology to serve you better."
    },
    {
      title: "Transparency",
      description: "Clear pricing, honest listings, and straightforward processes for everyone."
    },
    {
      title: "Excellence",
      description: "We strive for excellence in every interaction and transaction on our platform."
    },
    {
      title: "Customer First",
      description: "Your satisfaction and success are at the heart of everything we do."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="About Us"
        description="Learn about Vionex AI, our mission, and how we connect communities with trusted listings and smart discovery."
        canonical="https://vionex-ai.com/about-us"
      />
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-card opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                About <span className="text-primary neon-text">VIONEX AI</span>
              </h1>
              <div className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto space-y-4">
                <p>
                  <strong>Vionex AI</strong> (also known as <strong>VionexAI</strong> or accessible at <strong>vionex-ai.com</strong>) is an AI-powered global real estate platform designed to bring buyers, sellers, renters,
                  and real estate professionals together in one intelligent marketplace.
                </p>
                <p>
                  The <strong>Vionex</strong> platform simplifies the way people discover, list, and invest in properties worldwide. With
                  advanced AI-driven search and smart filtering, users can quickly find properties that match their
                  exact needs—whether buying, selling, or renting—along with nearby facilities and essential location
                  insights.
                </p>
                <p>
                  The UAE is one of the world's most attractive destinations to live and invest, and <strong>Vionex AI</strong> is built
                  to support this dynamic market. Our experienced real estate brokers and partners provide expert
                  guidance to help clients make confident, budget-oriented decisions.
                </p>
                <p>
                  <strong>Vionex AI</strong> also empowers property owners and agencies to showcase their listings to a global audience,
                  increasing visibility and reach beyond traditional platforms.
                </p>
                <p>
                  At <strong>Vionex</strong>, we believe real estate should be smarter, faster, and more connected—powered by
                  technology, driven by trust, and built for the future.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-8 md:p-12 neon-border">
                <div className="flex items-center gap-4 mb-6">
                  <Target className="h-8 w-8 text-primary" />
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                    Our Mission
                  </h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  At VIONEX AI, we're on a mission to simplify the way people discover and connect with 
                  properties and fitness centers in the UAE. We believe that finding the perfect space 
                  to live or the ideal gym to train at shouldn't be complicated.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Through our innovative AI-powered platform, we're creating a seamless experience that 
                  connects property owners, fitness center operators, and seekers, making the UAE's real 
                  estate and wellness markets more accessible and transparent for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Choose <span className="text-primary">VIONEX AI</span>?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We combine technology, expertise, and a customer-first approach to deliver exceptional value.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="glass rounded-xl p-6 neon-border hover:shadow-glow transition-all duration-300"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Core Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The principles that guide everything we do at VIONEX AI.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="glass rounded-xl p-6 neon-border"
                >
                  <h3 className="font-semibold text-xl text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-card">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center glass rounded-2xl p-8 md:p-12 neon-border">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Join the <span className="text-primary neon-text">VIONEX AI</span> Community
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you're looking for a property, listing a space, or managing a fitness center, 
                we're here to help you succeed. Start your journey with us today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/listings/space"
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Explore Properties
                </a>
                <a
                  href="/listings/fitness"
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Find Fitness Centers
                </a>
                <a
                  href="/Signup"
                  className="px-6 py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;

