import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CreditsProvider } from "@/contexts/CreditsContext";

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
      <CreditsProvider>
        <div className="flex flex-col h-dvh overflow-hidden bg-[#F8F9FB]">
          {/* Top Navbar Header */}
          <TopNavbar displayId={displayId} />

          {/* Outer Dashboard Wrapper */}
          <div className="flex flex-1 flex-row relative overflow-hidden">
            {/* Collapsible Responsive Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </CreditsProvider>
    </LanguageProvider>
  );
}
