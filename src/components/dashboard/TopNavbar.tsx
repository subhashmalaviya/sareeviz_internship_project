"use client";

import Link from "next/link";
import { Languages, MessageCircle, Smartphone, User, ChevronRight } from "lucide-react";
import { CreditsDialog } from "@/components/dashboard/CreditsDialog";
import { useLanguage } from "@/contexts/LanguageContext";

export function TopNavbar({ displayId }: { displayId: string }) {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 h-14 bg-[#1a1625] flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-pink-600">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          SareeViz
        </span>
      </Link>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Language Switcher */}
        <button 
          onClick={toggleLanguage}
          className="hidden sm:flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm"
        >
          <Languages className="h-4 w-4" />
          <span>{language === "en" ? "हिंदी" : "English"}</span>
        </button>

        {/* Help */}
        <button className="hidden md:flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm">
          <MessageCircle className="h-4 w-4 text-green-400" />
          <span>{t("Help")}</span>
        </button>

        {/* Install */}
        <button className="hidden lg:flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm">
          <Smartphone className="h-4 w-4" />
          <span>{t("Install")}</span>
        </button>

        {/* Credits Pill */}
        <CreditsDialog />

        {/* User Profile */}
        <div className="flex items-center gap-1.5 text-gray-300 text-sm">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{displayId}</span>
          <form action="/auth/signout" method="post" className="flex items-center">
            <button title="Sign Out" className="flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors ml-1">
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
