import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Shield, Lock, Eye, Database, UserCheck } from "lucide-react";

const PrivacyPolicy = () => {
  const lastUpdated = "January 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Privacy Policy"
        description="Read how Vionex AI collects, uses, and protects your personal information and data."
      />
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Privacy <span className="text-primary neon-text">Policy</span>
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
                VIONEX AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                2. Information We Collect
              </h2>
              
              <div className="mb-6">
                <h3 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  2.1 Personal Information
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Name, email address, and phone number</li>
                  <li>Profile picture and biographical information</li>
                  <li>Property or fitness center listing details</li>
                  <li>Payment and billing information</li>
                  <li>Government-issued identification documents (for verification)</li>
                  <li>Company information and license numbers (for business accounts)</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  2.2 Automatically Collected Information
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  When you use our Service, we automatically collect certain information, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, clicks)</li>
                  <li>Location data (if you enable location services)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process your registrations and transactions</li>
                <li>Verify your identity and account information</li>
                <li>Send you service-related communications</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations and enforce our Terms</li>
                <li>Send you marketing communications (with your consent)</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                4. Information Sharing and Disclosure
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>With Other Users:</strong> Your public profile and listings are visible to other users of the Service</li>
                <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
                <li><strong>Business Transfers:</strong> Information may be transferred in connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> We may share information with your explicit consent</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary" />
                5. Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure data storage and backup procedures</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-primary" />
                6. Your Rights and Choices
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Data Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us using the information provided in the Contact section below.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                7. Cookies and Tracking Technologies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                8. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                9. Children's Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our Service, you consent to the transfer of your information to these facilities.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                12. Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
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

export default PrivacyPolicy;

