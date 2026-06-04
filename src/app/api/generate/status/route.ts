import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { enhanceImageWithGemini, restoreFaceWithCodeformer } from "@/utils/ai";

export const dynamic = "force-dynamic";

// Helper to upload image to Supabase Storage
async function uploadToStorage(supabase: any, imageUrl: string, userId: string, genId: string) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const filePath = `${userId}/${genId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(filePath, arrayBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("designs")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Supabase storage upload error, returning original url:", error);
    return imageUrl; // Fallback to original URL on error
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing generation ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

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

    // If already complete (Gemini, or previously completed), return immediately
    if (gen.status === "done" || gen.status === "failed") {
      return NextResponse.json(gen);
    }

    const provider = gen.model_settings?.provider;
    const isMock = gen.model_settings?.is_mock;

    // ─── Gemini generations are synchronous, so they should already be done ───
    if (provider === "gemini") {
      // Gemini results are stored immediately in the generate route
      // If we reach here with pending/processing, something went wrong
      return NextResponse.json(gen);
    }

    // ─── Mock mode: simulate a delay then complete ───
    if (isMock) {
      const elapsed = Date.now() - new Date(gen.created_at).getTime();
      
      if (elapsed > 8000) {
        // Complete mock generation — use original image as placeholder
        const mockImageUrl = gen.original_image_url;
        
        const { data: updatedGen, error: updateErr } = await supabase
          .from("generations")
          .update({
            status: "done",
            generated_image_url: mockImageUrl,
            completed_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json(updatedGen);
      } else {
        // Keep as processing
        if (gen.status !== "processing") {
          const { data: updatedGen } = await supabase
            .from("generations")
            .update({ status: "processing" })
            .eq("id", id)
            .select()
            .single();
          return NextResponse.json(updatedGen || gen);
        }
        return NextResponse.json(gen);
      }
    }

    // ─── Replicate: Poll the prediction status ───
    if (provider === "replicate") {
      const replicateId = gen.model_settings?.replicate_id;
      const replicateToken = process.env.REPLICATE_API_TOKEN;

      if (!replicateId || !replicateToken) {
        return NextResponse.json({ error: "Invalid prediction state" }, { status: 500 });
      }

      const response = await fetch(`https://api.replicate.com/v1/predictions/${replicateId}`, {
        headers: {
          "Authorization": `Token ${replicateToken}`,
        }
      });

      if (!response.ok) {
        console.error(`Replicate API returned status ${response.status}`);
        return NextResponse.json({ error: "Failed to poll Replicate prediction" }, { status: 502 });
      }

      const prediction = await response.json();
      const replicateStatus = prediction.status;

      if (replicateStatus === "succeeded") {
        let outputUrl = "";
        if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          outputUrl = prediction.output[0];
        } else if (typeof prediction.output === "string") {
          outputUrl = prediction.output;
        }

        if (!outputUrl) {
          throw new Error("No output image returned from Replicate");
        }

        // Upload to user's storage bucket
        let publicUrl = await uploadToStorage(supabase, outputUrl, gen.user_id, gen.id);

        const aiPipeline = gen.model_settings?.aiPipeline;

        // Run CodeFormer face restoration for multi-garment pipeline
        if (aiPipeline === "multi_garment") {
          try {
            console.log("VTON succeeded. Triggering face restoration with CodeFormer...");
            const restoredUrl = await restoreFaceWithCodeformer(replicateToken, publicUrl);
            if (restoredUrl) {
              const uploadUrl = await uploadToStorage(supabase, restoredUrl, gen.user_id, `${gen.id}_restored`);
              publicUrl = uploadUrl;
              console.log("Async CodeFormer face restoration succeeded! Public URL:", publicUrl);
            }
          } catch (err) {
            console.error("Async CodeFormer face restoration failed, using base VTON output:", err);
          }
        }

        // Check if hybrid enhancement is requested (or needed because of additional uploaded clothes in auto mode)
        const additionalDesigns = gen.model_settings?.additional_designs || {};
        const generateFor = gen.model_settings?.generateFor || "saree";

        const mainDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
        const hasAdditionalClothing = additionalDesigns 
          ? Object.entries(additionalDesigns).some(([key, val]) => 
              val && typeof val === "string" && val.startsWith("http") && key !== mainDesignKey
            )
          : false;
        const shouldEnhance = aiPipeline === "hybrid" || (aiPipeline === "auto" && hasAdditionalClothing);

        const openRouterApiKey = process.env.OPENROUTER_API_KEY;
        const geminiApiKey = process.env.GEMINI_API_KEY;

        if (shouldEnhance && (openRouterApiKey || geminiApiKey)) {
          try {
            console.log("VTON succeeded. Triggering Hybrid Step 2 enhancement...");
            const responseVton = await fetch(publicUrl);
            const arrayBufferVton = await responseVton.arrayBuffer();
            const base64Vton = Buffer.from(arrayBufferVton).toString("base64");
            const mimeTypeVton = responseVton.headers.get("content-type") || "image/png";

            const additionalUrls = additionalDesigns
              ? Object.entries(additionalDesigns)
                  .filter(([key, val]) => val && typeof val === "string" && val.startsWith("http") && key !== mainDesignKey)
                  .map(([_, val]) => val as string)
              : [];

            const { base64Data: enhancedBase64, mimeType: enhancedMime } = await enhanceImageWithGemini({
              base64Image: base64Vton,
              mimeType: mimeTypeVton,
              prompt: gen.prompt,
              openRouterApiKey,
              geminiApiKey,
              generateFor: generateFor,
              additionalImageUrls: additionalUrls
            });

            // Upload the enhanced image to storage
            const buffer = Buffer.from(enhancedBase64, "base64");
            const filePath = `${gen.user_id}/${gen.id}_enhanced.png`;

            const { error: uploadError } = await supabase.storage
              .from("designs")
              .upload(filePath, buffer, {
                contentType: enhancedMime,
                upsert: true,
              });

            if (!uploadError) {
              const { data: { publicUrl: enhancedUrl } } = supabase.storage
                .from("designs")
                .getPublicUrl(filePath);
              publicUrl = enhancedUrl;
              console.log("Async Hybrid Enhancement succeeded!");
            } else {
              console.error("Async Hybrid upload error:", uploadError);
            }
          } catch (enhanceErr) {
            console.error("Async Hybrid Enhancement failed, keeping base Replicate image:", enhanceErr);
          }
        }

        const { data: updatedGen, error: updateErr } = await supabase
          .from("generations")
          .update({
            status: "done",
            generated_image_url: publicUrl,
            completed_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json(updatedGen);
      } else if (replicateStatus === "failed" || replicateStatus === "canceled") {
        const { data: updatedGen, error: updateErr } = await supabase
          .from("generations")
          .update({
            status: "failed",
            completed_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        // Refund credit
        const { data: currentCredits } = await supabase
          .from("credits")
          .select("balance")
          .eq("user_id", gen.user_id)
          .single();

        if (currentCredits) {
          await supabase
            .from("credits")
            .update({ balance: currentCredits.balance + 1 })
            .eq("user_id", gen.user_id);
        }

        return NextResponse.json(updatedGen);
      } else {
        // Still starting/processing
        const newStatus = (replicateStatus === "starting") ? "pending" : "processing";
        if (gen.status !== newStatus) {
          const { data: updatedGen } = await supabase
            .from("generations")
            .update({ status: newStatus })
            .eq("id", id)
            .select()
            .single();
          return NextResponse.json(updatedGen || gen);
        }
        return NextResponse.json(gen);
      }
    }

    // Unknown provider — just return current state
    return NextResponse.json(gen);
  } catch (error: any) {
    console.error("Status API internal error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
