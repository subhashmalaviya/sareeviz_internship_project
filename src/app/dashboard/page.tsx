import { Button } from "@/components/ui/button";
import { PlusCircle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s an overview of your AI fashion studio.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Quick Action Card */}
        <div className="col-span-full md:col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center text-center h-48 group">
          <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="h-6 w-6 text-brand-600" />
          </div>
          <h3 className="font-semibold text-lg">New Generation</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create a new model photo
          </p>
          <Button className="w-full bg-brand-600 hover:bg-brand-700" asChild>
            <Link href="/dashboard/studio">Start Studio</Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between h-48">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <h3 className="font-medium text-sm">Total Generated</h3>
          </div>
          <div>
            <p className="text-4xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground mt-1">Photos created</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between h-48">
          <div className="flex items-center gap-2 text-muted-foreground">
            <h3 className="font-medium text-sm">Remaining Credits</h3>
          </div>
          <div>
            <p className="text-4xl font-bold text-brand-600">20</p>
            <p className="text-sm text-muted-foreground mt-1">Free plan limit</p>
          </div>
          <Button variant="outline" className="w-full mt-2" size="sm" asChild>
            <Link href="/dashboard/billing">Upgrade Plan</Link>
          </Button>
        </div>
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Generations</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/history">View all</Link>
          </Button>
        </div>
        
        <div className="rounded-xl border border-border bg-card/50 glass p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No photos yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            You haven&apos;t generated any model photos yet. Start your first generation in the studio.
          </p>
          <Button className="mt-6 bg-brand-600 hover:bg-brand-700" asChild>
            <Link href="/dashboard/studio">Go to Studio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
