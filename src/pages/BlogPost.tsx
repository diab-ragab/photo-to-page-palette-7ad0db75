import { useParams, Link, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { getBlogPostBySlug, getRecentPosts } from "@/lib/blogData";
import { BlogCard } from "@/components/blog/BlogCard";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ChevronRight, Home, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  const recentPosts = getRecentPosts(3).filter((p) => p.slug !== slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Blog", url: `${baseUrl}/blog` },
    { name: post.title, url: `${baseUrl}/blog/${post.slug}` },
  ];

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: `${baseUrl}${post.image}`,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "WOI Endgame",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/og-image.jpg`,
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={post.title}
        description={post.excerpt}
        keywords={`${post.category}, WOI Endgame, ${post.title.split(" ").slice(0, 3).join(", ")}`}
        ogType="article"
        ogImage={post.image}
        structuredData={articleStructuredData}
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
          <Link to="/blog" className="hover:text-primary transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground line-clamp-1">{post.title}</span>
        </nav>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link to="/blog">
              <Button variant="ghost" size="sm" className="mb-6 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {post.readTime} min read
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
              {post.title}
            </h1>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            <div className="aspect-video rounded-xl overflow-hidden mb-10">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            <article className="prose prose-invert prose-primary max-w-none">
              {post.content.split("\n").map((paragraph, index) => {
                if (paragraph.startsWith("## ")) {
                  return (
                    <h2 key={index} className="text-2xl font-display font-bold mt-8 mb-4 text-foreground">
                      {paragraph.replace("## ", "")}
                    </h2>
                  );
                }
                if (paragraph.startsWith("### ")) {
                  return (
                    <h3 key={index} className="text-xl font-display font-semibold mt-6 mb-3 text-foreground">
                      {paragraph.replace("### ", "")}
                    </h3>
                  );
                }
                if (paragraph.startsWith("- **")) {
                  const match = paragraph.match(/- \*\*(.+?)\*\*: (.+)/);
                  if (match) {
                    return (
                      <li key={index} className="text-muted-foreground ml-4">
                        <strong className="text-foreground">{match[1]}</strong>: {match[2]}
                      </li>
                    );
                  }
                }
                if (paragraph.startsWith("- ")) {
                  return (
                    <li key={index} className="text-muted-foreground ml-4">
                      {paragraph.replace("- ", "")}
                    </li>
                  );
                }
                if (paragraph.match(/^\d+\. /)) {
                  return (
                    <li key={index} className="text-muted-foreground ml-4">
                      {paragraph.replace(/^\d+\. /, "")}
                    </li>
                  );
                }
                if (paragraph.trim()) {
                  return (
                    <p key={index} className="text-muted-foreground mb-4">
                      {paragraph}
                    </p>
                  );
                }
                return null;
              })}
            </article>
          </motion.div>

          {recentPosts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 pt-12 border-t border-border"
            >
              <h2 className="text-2xl font-display font-bold mb-8">More Articles</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {recentPosts.slice(0, 2).map((recentPost, index) => (
                  <BlogCard key={recentPost.id} post={recentPost} index={index} />
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
