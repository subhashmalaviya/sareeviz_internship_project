"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "Free",
    priceNote: "20 credits included",
    description: "Perfect to try SareeViz and see the quality of our AI models.",
    features: [
      "20 free generation credits",
      "Standard model quality",
      "3 pose options",
      "Download in HD",
      "Email support",
    ],
    cta: "Get Started Free",
    href: "/dashboard",
    popular: false,
  },
  {
    name: "Pro",
    price: "₹99",
    priceNote: "for 50 credits",
    description: "For active boutiques and designers who need regular model photos.",
    features: [
      "50 generation credits",
      "Premium model quality",
      "All pose & skin tone options",
      "Batch generation (4 at once)",
      "Priority processing",
      "Before/after comparisons",
    ],
    cta: "Buy Credits",
    href: "/dashboard",
    popular: true,
  },
  {
    name: "Business",
    price: "₹399",
    priceNote: "for 250 credits",
    description: "For manufacturers and brands with high-volume catalog needs.",
    features: [
      "250 generation credits",
      "Premium model quality",
      "All pose & skin tone options",
      "Batch generation (4 at once)",
      "Priority processing",
      "Dedicated support",
      "Custom branding options",
    ],
    cta: "Buy Credits",
    href: "/dashboard",
    popular: false,
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-4">
            Pricing
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Simple, credit-based{" "}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Pay only for what you use. No monthly subscriptions. Credits never expire.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={`relative rounded-2xl border p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.popular
                  ? "border-brand-300 bg-gradient-to-b from-brand-50/50 to-card shadow-lg scale-[1.02]"
                  : "border-border bg-card"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 px-4 py-1 text-xs font-semibold text-white shadow-md">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {plan.priceNote}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-md hover:shadow-lg"
                    : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
