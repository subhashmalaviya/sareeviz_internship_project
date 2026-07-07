"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface CreditsContextType {
  balance: number | null;
  setBalance: React.Dispatch<React.SetStateAction<number | null>>;
  decrementBalance: (amount?: number) => void;
  refreshCredits: () => Promise<number | null>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const supabase = createClient();

  const fetchBalance = useCallback(async (): Promise<number | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching credits:", error);
        return null;
      }

      if (data && typeof data.balance === "number") {
        setBalance(data.balance);
        return data.balance;
      }
    } catch (err) {
      console.error("Failed to fetch credits balance:", err);
    }
    return null;
  }, [supabase]);

  const decrementBalance = useCallback((amount: number = 1) => {
    setBalance((prev) => (prev !== null ? Math.max(0, prev - amount) : 0));
  }, []);

  const refreshCredits = useCallback(async () => {
    return await fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    fetchBalance();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const channelName = `global-credits-realtime-${user.id}-${Math.random().toString(36).substring(7)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "credits",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new && typeof payload.new.balance === "number") {
              setBalance(payload.new.balance);
            }
          }
        );

      if (isMounted) {
        channel.subscribe();
      } else {
        supabase.removeChannel(channel);
      }
    };

    setupRealtime();

    const handleCustomRefresh = () => {
      fetchBalance();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("credits:refresh", handleCustomRefresh);
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("credits:refresh", handleCustomRefresh);
      }
    };
  }, [fetchBalance, supabase]);

  return (
    <CreditsContext.Provider
      value={{
        balance,
        setBalance,
        decrementBalance,
        refreshCredits,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
