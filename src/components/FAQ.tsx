import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I create an account?",
    answer: "Simply download our launcher and click 'Register' to create your account. You'll need a valid email address to complete the registration process.",
  },
  {
    question: "Is the server Pay-to-Win?",
    answer: "No! Our server is completely free to play. All items can be obtained through gameplay. Donations only provide cosmetic items.",
  },
  {
    question: "I'm having trouble connecting. What should I do?",
    answer: "First, ensure your firewall isn't blocking the client. If issues persist, join our Discord server for real-time support from our team.",
  },
  {
    question: "What are the server rates and limits?",
    answer: "We offer x10 EXP rates, x5 drop rates, and x3 gold rates. Max level is 150 with custom endgame content available.",
  },
  {
    question: "Are there custom features not in the official game?",
    answer: "Yes! We've added custom dungeons, exclusive mounts, unique transmog options, and balanced class skills for enhanced gameplay.",
  },
];

export const FAQ = () => {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="text-primary text-xs md:text-sm font-display uppercase tracking-widest mb-4 block">
            Support
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
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
      </div>
    </section>
  );
};
