"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Languages, MessageCircle, Smartphone, User, ChevronRight } from "lucide-react";
import { CreditsDialog } from "@/components/dashboard/CreditsDialog";
import { useLanguage } from "@/contexts/LanguageContext";

export function TopNavbar({ displayId }: { displayId: string }) {
  const { language, toggleLanguage, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => console.log("Service Worker registered on scope:", reg.scope))
          .catch((err) => console.error("Service Worker registration failed:", err));
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(t("To install this app, click the install icon in your browser's address bar or menu."));
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  return (
    <header className="sticky top-0 z-50 h-14 bg-[#1a1625] flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 ml-10 md:ml-0">
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
          className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm"
          title={language === "en" ? "हिंदी" : "English"}
        >
          <Languages className="h-4.5 w-4.5" />
          <span className="hidden sm:inline">{language === "en" ? "हिंदी" : "English"}</span>
        </button>

        {/* Help */}
        <button 
          className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm"
          title={t("Help")}
        >
          <MessageCircle className="h-4.5 w-4.5 text-green-400" />
          <span className="hidden md:inline">{t("Help")}</span>
        </button>

        {/* Install */}
        {!isInstalled && (
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm"
            title={t("Install")}
          >
            <Smartphone className="h-4.5 w-4.5 text-pink-400" />
            <span className="hidden sm:inline">{t("Install")}</span>
          </button>
        )}

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
