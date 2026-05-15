import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const identifier = user?.phone || user?.email || "User";
  const displayId = identifier.length > 15 ? `${identifier.substring(0, 15)}...` : identifier;

  return (
    <LanguageProvider>
      <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
        <TopNavbar displayId={displayId} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}
