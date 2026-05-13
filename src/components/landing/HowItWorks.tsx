"use client";

import { motion, Variants } from "framer-motion";
import { Upload, Wand2, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Design",
    description:
      "Upload a flat-lay photo of your saree, lehenga, jewelry, or any apparel design. We accept all common image formats.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Wand2,
    step: "02",
    title: "AI Generates Model",
    description:
      "Our AI creates a realistic model wearing your design with the pose, background, and skin tone you choose.",
    color: "from-brand-500 to-brand-700",
    bgColor: "bg-brand-50",
  },
  {
    icon: Download,
    step: "03",
    title: "Download & Use",
    description:
      "Download your studio-quality model photos in high resolution. Use them for your website, social media, or catalog.",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-50",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
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
            How It Works
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Three simple steps to{" "}
            <span className="gradient-text">stunning photos</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            No studio, no models, no photographer. Just upload your design and let AI do the magic.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 md:grid-cols-3"
        >
          {steps.map((item) => (
            <motion.div
              key={item.step}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                {/* Step number */}
                <div className="absolute -top-4 left-8">
                  <div className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${item.color} px-4 py-1 text-xs font-bold text-white shadow-md`}>
                    Step {item.step}
                  </div>
                </div>

                {/* Icon */}
                <div className={`mt-4 mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${item.bgColor} transition-transform group-hover:scale-110`}>
                  <item.icon className="h-7 w-7 text-brand-600" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Connector line (hidden on last) */}
              {item.step !== "03" && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-brand-200" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
