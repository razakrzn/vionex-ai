import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { FileText, Shield, AlertCircle } from "lucide-react";

const TermsAndConditions = () => {
  const lastUpdated = "January 2025";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Terms and Conditions"
        description="Review Vionex AI terms and conditions for using the platform, listings, payments, and account responsibilities."
      />
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Terms & <span className="text-primary neon-text">Conditions</span>
            </h1>
            <p className="text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className="glass rounded-2xl p-8 md:p-12 neon-border space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                1. Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Welcome to VIONEX AI ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our platform, services, and website located at vionex-ai.com (the "Service").
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.
              </p>
            </section>

            {/* Acceptance */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                2. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                By creating an account, accessing, or using VIONEX AI, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 18 years old to use our Service. By using the Service, you represent and warrant that you are of legal age to form a binding contract.
              </p>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                3. User Accounts
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To access certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            {/* Use of Service */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                4. Use of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Transmit any viruses, malware, or harmful code</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems to access the Service without permission</li>
              </ul>
            </section>

            {/* Listings and Content */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                5. Listings and Content
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                As a user, you may post listings for properties, fitness centers, or other content ("User Content"). You retain ownership of your User Content but grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your User Content on the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You are solely responsible for your User Content and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>You own or have the right to post the User Content</li>
                <li>The User Content is accurate and not misleading</li>
                <li>The User Content does not violate any third-party rights</li>
                <li>The User Content complies with all applicable laws</li>
              </ul>
            </section>

            {/* Transactions */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                6. Transactions and Payments
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                VIONEX AI acts as a broker platform connecting buyers and sellers. We facilitate transactions but are not a party to any agreement between users.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 my-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-1">Important Notice</p>
                    <p className="text-sm text-muted-foreground">
                      Both parties negotiate and close deals independently. VIONEX AI acts as a broker. 
                      All transactions are subject to 5% VAT as applicable under UAE law.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If a property is sold through VIONEX AI, the seller receives 20% cashback as redeemable points, subject to eligibility and verification.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for verifying the accuracy of listings and conducting due diligence before entering into any transaction.
              </p>
            </section>

            {/* Refund Policy */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                7. Refund Policy
              </h2>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-2">No Refund Policy</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      VIONEX AI operates under a strict no-refund policy. All transactions are final and non-refundable.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                In the event of a transaction error, duplicate transaction, or any other payment-related issue, the affected amount will not be refunded as cash. Instead, the amount will be credited to your VIONEX AI wallet as redeemable points.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                These wallet credits (points) can be used to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-4">
                <li>Make future purchases on the platform</li>
                <li>Pay for premium listings or services</li>
                <li>Redeem for various platform features and benefits</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wallet credits are non-transferable and cannot be converted to cash or withdrawn. They are valid for use on the VIONEX AI platform only.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If you experience any transaction issues, please contact our support team at <a href="mailto:sales@vionexnova.com" className="text-primary hover:underline">sales@vionexnova.com</a> within 7 days of the transaction. Our team will investigate and credit the appropriate amount to your wallet if the issue is verified.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                8. Intellectual Property
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by VIONEX AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To the maximum extent permitted by law, VIONEX AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our total liability to you for all claims arising from or related to the use of the Service shall not exceed the amount you paid us in the twelve (12) months prior to the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                10. Indemnification
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless VIONEX AI and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the Service, your User Content, or your violation of these Terms.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                11. Termination
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Upon termination, your right to use the Service will cease immediately. All provisions of these Terms that by their nature should survive termination shall survive termination.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                12. Changes to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                13. Governing Law
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of the United Arab Emirates.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                14. Contact Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-medium">VIONEX AI</p>
                <p className="text-muted-foreground">Email: <a href="mailto:sales@vionexnova.com" className="text-primary hover:underline">sales@vionexnova.com</a></p>
                <p className="text-muted-foreground">Website: <a href="https://vionex-ai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.vionex-ai.com</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;

