import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Mail, Phone } from "lucide-react";
import logoImage from "@/assets/V-AI_logo.png";
import { VERSION } from "@/config/version";

const Footer = () => {
  return (
    <footer className="relative pt-20 pb-8 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-card" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-1 mb-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-transparent flex-shrink-0">
                <img
                  src={logoImage}
                  alt="Vionex AI Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">
                  VIONEX <span className="text-primary neon-text">AI</span>
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your AI-powered marketplace for properties and fitness in the Middle East. Vionex AI (also known as VionexAI, vionex-ai.com) is a product of Vionex Nova.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => window.open("https://www.facebook.com/share/1CyAjSfhqZ/?mibextid=wwXIfr", "_blank", "noopener,noreferrer")}
              >
                <Facebook className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => window.open("https://www.instagram.com/vionex_ai/", "_blank", "noopener,noreferrer")}
              >
                <Instagram className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => window.open("https://www.tiktok.com/@vionexnova", "_blank", "noopener,noreferrer")}
                title="TikTok"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </Button>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/listings/space" className="text-muted-foreground hover:text-primary transition-colors">My Space</a></li>
              <li><a href="/listings/fitness" className="text-muted-foreground hover:text-primary transition-colors">My Fitness</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/about-us" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
              <li><a href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="/terms-and-conditions" className="text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</a></li>
              <li><a href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

        {/* Contact */}
          <div>
          <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:sales@vionexnova.com" className="hover:text-primary transition-colors">
                sales@vionexnova.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <a href="tel:+971557609116" className="hover:text-primary transition-colors">
                +971 55 760 9116
              </a>
            </div>
          </div>
        </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-glass-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Vionex Nova. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Version {VERSION}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Vionex AI acts as a broker. Both parties negotiate and close deals independently. 5% VAT applicable.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
