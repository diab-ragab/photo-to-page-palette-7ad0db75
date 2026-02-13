import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight, Home, HelpCircle, AlertTriangle, Clock, MessageCircle, CreditCard, ShieldCheck, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const RefundFAQ = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Refund Policy", url: `${baseUrl}/refund` },
    { name: "Refund FAQ", url: `${baseUrl}/refund-faq` },
  ];

  const faqs = [
    {
      question: "Can I get a refund for my purchase?",
      answer:
        "Refunds depend on the type of purchase. VIP memberships and Game Pass may be refunded within 24 hours if benefits haven't been used. Zen (virtual currency) and donations are non-refundable once delivered. See each category below for details.",
    },
    {
      question: "How do I request a refund?",
      answer:
        "Open a support ticket on our official Discord server. Provide your in-game username and the PayPal transaction ID or order number. Our team will review your request within 24 hours.",
    },
    {
      question: "My purchase wasn't delivered. What should I do?",
      answer:
        "If your payment was successful but items weren't delivered, contact support immediately with your username and transaction ID. Most delivery issues are resolved within minutes after verification.",
    },
    {
      question: "How long does a refund take to process?",
      answer:
        "Approved refunds are processed within 3–7 business days depending on your payment provider (PayPal). You'll receive a confirmation once the refund is initiated.",
    },
    {
      question: "What happens if I file a chargeback?",
      answer:
        "Filing a chargeback or payment dispute without contacting support first is considered payment abuse. It may result in permanent account suspension and loss of all associated items. Always reach out to us first — we resolve most issues quickly.",
    },
    {
      question: "Can I get a refund for Zen (virtual currency)?",
      answer:
        "No. Once Zen has been successfully delivered to your in-game account, it is non-refundable. Zen has no real-world monetary value and is for in-game use only.",
    },
    {
      question: "I accidentally purchased the wrong item. Can I get a refund?",
      answer:
        "For VIP or Game Pass, you may be eligible if you haven't used any benefits and you contact support within 24 hours. For Zen or other instant-delivery items, refunds are not available after delivery.",
    },
    {
      question: "Are donations refundable?",
      answer:
        "No. Donations are voluntary contributions to support the server and community. They are non-refundable.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Refund FAQ"
        description="Frequently asked questions about WOI Endgame refunds, delivery issues, chargebacks, and how to request support."
        keywords="WOI refund FAQ, refund help, chargeback policy, WOI Endgame support"
        breadcrumbs={breadcrumbs}
      />
      <Navbar />
      <main className="container py-20 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/refund" className="hover:text-primary transition-colors">
            Refund Policy
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Refund FAQ</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Refund FAQ</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Find answers to the most common questions about refunds, delivery issues, and payment disputes.
        </p>

        {/* Step-by-step guide */}
        <section className="mb-14">
          <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            How to Request a Refund — Step by Step
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: 1,
                icon: MessageCircle,
                title: "Open a Discord Ticket",
                desc: "Go to the #support channel on our official Discord and create a new ticket.",
              },
              {
                step: 2,
                icon: CreditCard,
                title: "Provide Transaction Details",
                desc: "Include your in-game username, character name, and PayPal transaction/order ID.",
              },
              {
                step: 3,
                icon: Clock,
                title: "Wait for Review",
                desc: "Our team reviews refund requests within 24 hours. We may ask follow-up questions.",
              },
              {
                step: 4,
                icon: ShieldCheck,
                title: "Receive Resolution",
                desc: "If approved, refunds are processed in 3–7 business days via PayPal.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold text-sm">
                    {item.step}
                  </span>
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Chargeback warning */}
        <section className="mb-14 rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-semibold text-foreground mb-1">
              Important: Avoid Chargebacks
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Filing a chargeback or payment dispute with PayPal without contacting our support first
              may result in <strong className="text-foreground">permanent account suspension</strong>,
              loss of all items, and a ban from future purchases. Please always reach out to us first
              — we resolve most issues within hours.
            </p>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section>
          <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="text-left font-display font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Back link */}
        <div className="mt-12 flex items-center gap-6 text-sm">
          <Link
            to="/refund"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Refund Policy
          </Link>
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundFAQ;
