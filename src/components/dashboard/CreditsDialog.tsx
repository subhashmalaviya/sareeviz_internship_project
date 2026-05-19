"use client";

import { useState, useEffect } from "react";
import { Sparkles, Info, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PACKAGES = [
  { id: "p1", price: 100, credits: 10, bonus: 0, priority: false, special: false },
  { id: "p2", price: 500, credits: 50, bonus: 0, priority: false, special: false },
  { id: "p3", price: 1000, credits: 100, bonus: 0, priority: false, special: false },
  { id: "p4", price: 5000, credits: 500, displayCredits: 515, bonus: 15, priority: true, special: false },
  { id: "p5", price: 10000, credits: 1000, displayCredits: 1030, bonus: 30, priority: true, special: true },
];

export function CreditsDialog() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [selectedId, setSelectedId] = useState("p3");
  const [balance, setBalance] = useState<number | null>(null);

  const selectedPkg = PACKAGES.find((p) => p.id === selectedId)!;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("credits")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setBalance(data.balance);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchBalance();

    // Subscribe to Postgres changes on 'credits' table for real-time updates
    const channel = supabase
      .channel("header-credits-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "credits" },
        (payload) => {
          if (payload.new && typeof payload.new.balance === "number") {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition-colors">
          <div className="w-3.5 h-3.5 rounded-full bg-pink-500/30 flex items-center justify-center">
            <Sparkles className="h-2.5 w-2.5 text-pink-400" />
          </div>
          <span className="text-sm font-semibold text-pink-400">
            {balance !== null ? `${balance} ${t("credits") || "credits"}` : "..."}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] p-0 border-0 bg-white shadow-2xl rounded-2xl [&>button]:right-4 [&>button]:top-4">
        <DialogHeader className="px-6 pt-6 pb-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 leading-none">
                {t("Buy Credits")}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">{t("Select a package")}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Info Banner */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-xs font-medium">
            <Info className="h-4 w-4 shrink-0" />
            {t("1 credit per image · 1 credit per second (video)")}
          </div>

          {/* Packages List */}
          <div className="space-y-3">
            {PACKAGES.map((pkg) => {
              const isSelected = selectedId === pkg.id;
              const displayCredits = pkg.displayCredits || pkg.credits;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedId(pkg.id)}
                  className={`relative flex flex-col justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "border-pink-500 bg-pink-50/10 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Floating Tag for Special */}
                  {pkg.special && (
                    <div className="absolute -top-2.5 right-4 flex items-center gap-1 bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      <Star className="h-3 w-3 fill-white" /> {t("Free Generation")}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-base font-bold ${
                        isSelected ? "text-gray-900" : "text-gray-900"
                      }`}
                    >
                      ₹{pkg.price.toLocaleString("en-IN")}
                    </span>
                    <span
                      className={`text-base font-bold ${
                        isSelected ? "text-pink-600" : "text-gray-800"
                      }`}
                    >
                      {displayCredits} {t("credits")}
                    </span>
                  </div>

                  {/* Pills row for bonuses */}
                  {(pkg.bonus > 0 || pkg.priority || pkg.special) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {pkg.special && (
                        <span className="bg-yellow-50 text-yellow-700 border border-yellow-200/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                          {t("Special User")}
                        </span>
                      )}
                      {pkg.priority && (
                        <span className="bg-blue-50 text-blue-600 border border-blue-100/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {t("Priority Support")}
                        </span>
                      )}
                      {pkg.bonus > 0 && (
                        <span className="bg-green-50 text-green-600 border border-green-100/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          +{pkg.bonus} {t("bonus credits")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Box */}
          <div className="flex items-center justify-between px-4 py-3 bg-pink-50 rounded-xl border border-pink-100">
            <span className="text-xs font-medium text-pink-700/70 w-1/3 leading-tight">
              {t("What you can generate")}
            </span>
            <span className="text-xs font-bold text-pink-700 text-right w-2/3">
              {selectedPkg.credits} {t("images or")} {selectedPkg.credits} {t("seconds of video")}
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button className="w-full h-12 bg-gradient-to-r from-purple-500 to-[#db2777] hover:from-purple-600 hover:to-[#be185d] text-white rounded-xl shadow-md text-sm font-bold transition-transform hover:scale-[1.02]">
              {t("Buy")} {selectedPkg.displayCredits || selectedPkg.credits} {t("Credits for ₹")}
              {selectedPkg.price.toLocaleString("en-IN")}
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">
              {t("Secure payment powered by Razorpay")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
