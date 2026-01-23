import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const storeFaqs = [
  {
    question: "What am I buying?",
    answer: "You are purchasing digital in-game products for WOI Endgame, such as Zen (virtual currency), in-game items, and the Elite Game Pass.",
  },
  {
    question: "How do I receive my purchase?",
    answer: "Your purchase is delivered digitally and credited directly to your WOI Endgame account after payment confirmation.",
  },
  {
    question: "How long does delivery take?",
    answer: "Delivery is usually instant. In some cases, it may take a short time due to payment verification or server processing.",
  },
  {
    question: "What information do I need to provide?",
    answer: "You must enter the correct account username / character name (and server name if required) to ensure successful delivery.",
  },
  {
    question: "What if I entered the wrong username or character name?",
    answer: "Please contact support immediately. We will try to help, but we cannot guarantee delivery changes if the product was delivered to the provided account details.",
  },
  {
    question: "What if my order is delayed or not delivered?",
    answer: "Contact support and include: Order ID / Transaction ID, Account username / character name, and Proof of payment (receipt or screenshot).",
  },
  {
    question: "Are refunds available?",
    answer: "All sales are final for digital products once delivered. Refunds may only be considered in cases of verified non-delivery due to a technical issue on our side.",
  },
  {
    question: "Can Zen be exchanged for real money?",
    answer: "No. Zen is virtual currency for in-game use only and has no real-world cash value. It cannot be withdrawn or exchanged for money.",
  },
  {
    question: "Will I get banned if I open a chargeback?",
    answer: "Opening a chargeback or dispute without contacting support first may result in account restrictions, suspension, or permanent ban to prevent fraud and protect the server economy.",
  },
  {
    question: "How can I contact support?",
    answer: "Join our Discord server and open a support ticket, or email us at support@woiendgame.com.",
  },
];

export const StoreFAQ = () => {
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": storeFaqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqStructuredData)}
        </script>
      </Helmet>
      <section id="store-faq" className="py-16 md:py-24 px-4 scroll-mt-20">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <span className="text-primary text-xs md:text-sm font-display uppercase tracking-widest mb-4 block">
              Store Help
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display">
              Store FAQ
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Common questions about purchases, delivery, and refunds.{" "}
              <Link to="/refund" className="text-primary hover:underline">
                View full policy
              </Link>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {storeFaqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="glass-card px-4 md:px-6 border-border/50 data-[state=open]:border-primary/50 transition-colors"
                >
                  <AccordionTrigger className="text-left font-display text-sm md:text-base hover:text-primary transition-colors py-4 md:py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm pb-4 md:pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Support CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-10 text-center"
          >
            <p className="text-muted-foreground text-sm">
              Still have questions?{" "}
              <a 
                href="https://discord.gg/UezDH3aaYt" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Join our Discord
              </a>{" "}
              or{" "}
              <Link to="/support" className="text-primary hover:underline">
                contact support
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
};
