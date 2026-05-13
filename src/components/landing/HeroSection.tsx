"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-brand-100/20 to-brand-300/10 blur-3xl" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              AI-Powered Fashion Photography
            </motion.div>

            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn your designs into{" "}
              <span className="gradient-text">stunning model photos</span>
            </h1>

            <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
              Upload your saree, ethnic wear, or jewelry design and get
              studio-quality model photos in minutes — no photoshoot needed.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                size="lg"
                className="bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] glow-hover px-8"
                asChild
              >
                <Link href="/dashboard">
                  Start Creating Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="group"
              >
                <Play className="mr-2 h-4 w-4 text-brand-600 transition-transform group-hover:scale-110" />
                Watch Demo
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-brand-300 to-brand-500"
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">2,000+</span>{" "}
                designers already creating
              </div>
            </div>
          </motion.div>

          {/* Right: Hero visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main showcase card */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 glow-hover">
                <div className="aspect-[4/5] relative bg-gradient-to-br from-brand-100 via-brand-50 to-white flex items-center justify-center">
                  <Image src="/saree.png" alt="AI Generated Fashion Model in Saree" fill className="object-cover" priority />
                </div>
                {/* Floating overlay badge */}
                <div className="absolute top-4 right-4 glass rounded-lg px-3 py-1.5 text-xs font-medium text-brand-700 shadow-md">
                  ✨ AI Generated
                </div>
              </div>

              {/* Floating stats card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 -left-6 glass rounded-xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                    <span className="text-lg">📸</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">50,000+</p>
                    <p className="text-xs text-muted-foreground">Photos generated</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating speed card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute -top-4 -right-4 glass rounded-xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">~30 sec</p>
                    <p className="text-xs text-muted-foreground">Per generation</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
