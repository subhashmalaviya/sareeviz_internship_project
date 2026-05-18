"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  Sparkles, 
  FolderOpen, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    {
      name: t("Studio"),
      href: "/dashboard",
      icon: Sparkles,
      color: "text-pink-500",
    },
    {
      name: t("Projects & Gallery") || "Projects & Gallery",
      href: "/dashboard/projects",
      icon: FolderOpen,
      color: "text-blue-500",
    },
    {
      name: t("Settings") || "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      color: "text-purple-500",
    },
  ];

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMobileToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed at top-left of inner screen just under header */}
      <button
        onClick={handleMobileToggle}
        className="md:hidden fixed top-[11px] left-4 z-[60] p-1.5 rounded-lg bg-gray-900 text-white shadow-md border border-gray-800 hover:bg-gray-800 transition-colors"
        aria-label="Toggle Navigation Menu"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop & Mobile Sidebar Container */}
      <aside
        className={`fixed md:sticky top-14 h-[calc(100vh-56px)] left-0 z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-16" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shrink-0 shadow-sm
        `}
      >
        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`group flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? "bg-pink-50/75 text-pink-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-[#db2777] rounded-r-md" />
                )}

                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-[#db2777]" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                
                <span
                  className={`transition-opacity duration-200 ${
                    isCollapsed ? "opacity-0 md:hidden" : "opacity-100"
                  }`}
                >
                  {item.name}
                </span>

                {/* Tooltip for Collapsed Sidebar */}
                {isCollapsed && (
                  <div className="absolute left-16 hidden md:group-hover:block bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap shadow-lg z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Collapse Toggle Footer */}
        <div className="hidden md:flex p-4 border-t border-gray-100 items-center justify-between">
          {!isCollapsed && (
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {t("Sidebar") || "Sidebar"}
            </span>
          )}
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors ml-auto shadow-sm"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile Sign Out Option */}
        <div className="md:hidden p-4 border-t border-gray-100">
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-3 w-full text-red-500 hover:bg-red-50/50 rounded-xl text-sm font-semibold transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>{t("Sign Out") || "Sign Out"}</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Overlay Background */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        />
      )}
    </>
  );
}
