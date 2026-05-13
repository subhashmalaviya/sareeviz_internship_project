"use client";

import { motion, Variants } from "framer-motion";
import {
  Palette,
  Layers,
  Zap,
  Shield,
  Smartphone,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "Multiple Model Styles",
    description:
      "Choose from a variety of model poses, skin tones, and body types to match your brand's target audience.",
  },
  {
    icon: Layers,
    title: "Batch Generation",
    description:
      "Generate up to 4 variations of the same design in one click. Save time on catalog photography.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Get your AI-generated model photos in under 30 seconds. No waiting for studio bookings.",
  },
  {
    icon: Shield,
    title: "Commercial License",
    description:
      "All generated images are yours to use commercially — on your website, social media, or printed catalogs.",
  },
  {
    icon: Smartphone,
    title: "Works on Mobile",
    description:
      "Upload and generate directly from your phone. Perfect for quick catalog updates on the go.",
  },
  {
    icon: Globe,
    title: "Multi-Category Support",
    description:
      "Sarees, lehengas, kurtas, jewelry, watches — our AI handles all fashion and accessory categories.",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32 bg-muted/30">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_50%,rgba(219,39,119,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(219,39,119,0.03),transparent_50%)]" />

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
            Features
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need for{" "}
            <span className="gradient-text">AI fashion photography</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Professional model photos without the professional price tag. Built for boutiques, manufacturers, and fashion brands.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-brand-200 hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 transition-transform group-hover:scale-110">
                <feature.icon className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
