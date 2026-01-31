import { Helmet } from "react-helmet-async";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  structuredData?: object;
  breadcrumbs?: BreadcrumbItem[];
}

const defaultMeta = {
  siteName: "WOI Endgame",
  title: "WOI Endgame | #1 World of Illusions Private Server",
  description: "Join WOI Endgame, the best World of Illusions private server. 9 unique classes, custom dungeons, active community, x10 EXP rates. Free to play!",
  keywords: "WOI Endgame, World of Illusions private server, WOI private server, MMORPG, free MMO, Paladin, Necromancer, Warlock, Berserker, Assassin, Ranger, Magus, Monk, Heretic, custom dungeons, PvP",
  ogImage: "/og-image.jpg",
  twitterCard: "summary_large_image" as const,
  locale: "en_US",
};

export const SEO = ({
  title,
  description = defaultMeta.description,
  keywords = defaultMeta.keywords,
  canonicalUrl,
  ogImage = defaultMeta.ogImage,
  ogType = "website",
  twitterCard = defaultMeta.twitterCard,
  noIndex = false,
  structuredData,
  breadcrumbs,
}: SEOProps) => {
  const fullTitle = title 
    ? `${title} | ${defaultMeta.siteName}` 
    : defaultMeta.title;
  
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const canonical = canonicalUrl || currentUrl;

  // Default organization structured data
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: defaultMeta.siteName,
    description: defaultMeta.description,
    url: typeof window !== "undefined" ? window.location.origin : "",
  };

  // Breadcrumb structured data
  const breadcrumbStructuredData = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
    })),
  } : null;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={defaultMeta.siteName} />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={defaultMeta.siteName} />
      <meta property="og:locale" content={defaultMeta.locale} />
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData || defaultStructuredData)}
      </script>
      
      {/* Breadcrumb Structured Data */}
      {breadcrumbStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbStructuredData)}
        </script>
      )}
    </Helmet>
  );
};
