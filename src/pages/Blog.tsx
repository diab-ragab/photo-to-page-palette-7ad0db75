import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { BlogCard } from "@/components/blog/BlogCard";
import { staticBlogPosts, notificationToBlogPost, BlogPost } from "@/lib/blogData";
import { notificationsApi } from "@/lib/notificationsApi";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, Home, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const Blog = () => {
  const [allPosts, setAllPosts] = useState<BlogPost[]>(staticBlogPosts);
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await notificationsApi.getAll();
        // Ensure data is an array before filtering
        const notifications = Array.isArray(data) ? data : [];
        const notificationPosts = notifications
          .filter((n) => n.is_active === 1)
          .map(notificationToBlogPost);
        
        // Merge and sort by date (newest first)
        const merged = [...notificationPosts, ...staticBlogPosts].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        setAllPosts(merged);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Blog", url: `${baseUrl}/blog` },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "WOI Endgame Blog",
    description: "Latest news, updates, guides, and patch notes for WOI Endgame private server.",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: "WOI Endgame",
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Blog"
        description="Stay updated with the latest WOI Endgame news, patch notes, guides, and community events. Your source for all things WOI."
        keywords="WOI blog, game updates, patch notes, gaming news, WOI Endgame news, MMORPG guides"
        structuredData={structuredData}
        breadcrumbs={breadcrumbs}
      />
      <Navbar />
      <main className="container py-20 px-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Blog</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <span className="text-primary text-xs md:text-sm font-display uppercase tracking-widest mb-4 block">
            News & Updates
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            WOI Endgame Blog
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Stay updated with the latest news, patch notes, guides, and community events.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allPosts.map((post, index) => (
              <BlogCard key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
