import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import Seo from "@/components/Seo";

const Login = () => {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Login | Vionex AI"
        description="Login to Vionex AI to manage listings, connect with owners, and access your dashboard."
      />
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-xl space-y-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Login to Vionex AI
          </h1>
          <p className="text-muted-foreground">
            Access your account to manage listings, track inquiries, and stay connected.
          </p>
          <Button onClick={() => setIsAuthModalOpen(true)} variant="neon">
            Open Login Form
          </Button>
          <Button onClick={() => navigate("/properties")} variant="ghost">
            Browse Properties
          </Button>
        </div>
      </main>

      <Footer />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default Login;

