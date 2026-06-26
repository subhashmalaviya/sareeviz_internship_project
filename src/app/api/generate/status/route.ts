import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing generation ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch generation record
    const { data: gen, error: fetchErr } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !gen) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Simply return the current database state
    return NextResponse.json(gen);
  } catch (error: any) {
    console.error("Status API internal error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
