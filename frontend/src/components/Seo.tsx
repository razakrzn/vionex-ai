import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

type SeoProps = {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string;
};

const DEFAULT_DESCRIPTION =
  "Vionex AI (vionex-ai.com) - Your AI-powered marketplace for properties and fitness in the Middle East. List properties, get direct leads, full analytics dashboard, connect TikTok/YouTube videos. Vionex AI is a product of Vionex Nova.";

const DEFAULT_KEYWORDS = 
  "vionex ai, vionexai, vionex-ai.com, vionexai.com, vionex.ai, vionex, vionex nova, AI marketplace, property marketplace, fitness marketplace, Middle East properties, AI-powered platform";

const toAbsoluteUrl = (siteUrl: string, url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const Seo = ({ title, description, canonical, image, noIndex, keywords }: SeoProps) => {
  const location = useLocation();
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const canonicalUrl = canonical ?? `${siteUrl}${location.pathname}`;
  const imageUrl = toAbsoluteUrl(siteUrl, image ?? "/og-image.png");
  const fullTitle = title.includes("Vionex AI") || title.includes("VionexAI") || title.includes("Vionex") 
    ? title 
    : `${title} | Vionex AI`;
  const metaDescription = description ?? DEFAULT_DESCRIPTION;
  const metaKeywords = keywords ? `${DEFAULT_KEYWORDS}, ${keywords}` : DEFAULT_KEYWORDS;
  const robotsValue = noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="robots" content={robotsValue} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Vionex AI" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@VionexAI" />
    </Helmet>
  );
};

export default Seo;

