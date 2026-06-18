import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { enhanceImageWithGemini, restoreFaceWithCodeformer, processImageBuffer, generateVideoViaSVD, generateVideoViaWan21 } from "@/utils/ai";
import { applyBrandingToImageBuffer, applyBrandingToUrl } from "@/utils/branding";
import { Client, handle_file } from "@gradio/client";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// Helper to upload a branded buffer to Supabase Storage
async function uploadBufferToStorage(
  supabase: any,
  buffer: Buffer,
  userId: string,
  genId: string,
  outputFormat?: string,
  resolution?: string,
  aspectRatio?: string,
  mimeType: string = "image/png"
) {
  try {
    let finalBuffer = buffer;
    let finalMimeType = mimeType;

    if (outputFormat || resolution || aspectRatio) {
      const processed = await processImageBuffer(buffer, outputFormat, resolution, aspectRatio);
      finalBuffer = processed.buffer;
      finalMimeType = processed.mimeType;
    }

    const ext = finalMimeType === "image/png" ? "png" : "jpg";
    const filePath = `${userId}/${genId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(filePath, finalBuffer, {
        contentType: finalMimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("designs")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Supabase storage buffer upload error:", error);
    return null;
  }
}

// Helper to upload video to Supabase Storage
async function uploadVideoToStorage(
  supabase: any,
  videoUrl: string,
  userId: string,
  genId: string
) {
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    
    const buffer = Buffer.from(await res.arrayBuffer());
    const finalMimeType = res.headers.get("content-type") || "video/mp4";
    const filePath = `${userId}/${genId}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(filePath, buffer, {
        contentType: finalMimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("designs")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Supabase storage video upload error:", error);
    return null;
  }
}

// Helper to upload image to Supabase Storage
async function uploadToStorage(
  supabase: any,
  imageUrl: string,
  userId: string,
  genId: string,
  outputFormat?: string,
  resolution?: string,
  aspectRatio?: string
) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    
    let buffer: any = Buffer.from(await res.arrayBuffer());
    let finalMimeType = res.headers.get("content-type") || "image/png";

    if (outputFormat || resolution || aspectRatio) {
      const processed = await processImageBuffer(buffer, outputFormat, resolution, aspectRatio);
      buffer = processed.buffer;
      finalMimeType = processed.mimeType;
    }

    const ext = finalMimeType === "image/png" ? "png" : "jpg";
    const filePath = `${userId}/${genId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(filePath, buffer, {
        contentType: finalMimeType,
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

// Helper to fetch/load local path or remote HTTP image URL to Buffer
async function loadImageBuffer(urlOrPath: string): Promise<Buffer> {
  if (urlOrPath.startsWith("/")) {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(process.cwd(), "public", urlOrPath);
    return fs.readFileSync(filePath);
  } else if (urlOrPath.startsWith("http")) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } else {
    // Treat as relative path fallback
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(process.cwd(), "public", "/" + urlOrPath);
    return fs.readFileSync(filePath);
  }
}

// Helper function to create flat lay mock composite using sharp
async function createMockFlatLay(
  supabase: any,
  garmentUrl: string,
  styleRefUrl: string,
  userId: string,
  genId: string
): Promise<string | null> {
  try {
    console.log(`Creating mock flat lay composite: garment=${garmentUrl}, styleRef=${styleRefUrl}`);
    const garmentBuffer = await loadImageBuffer(garmentUrl);
    const styleBuffer = await loadImageBuffer(styleRefUrl);

    // Load background (styleRef) with sharp
    const bgImage = sharp(styleBuffer);
    const bgMetadata = await bgImage.metadata();
    const bgWidth = bgMetadata.width || 1024;
    const bgHeight = bgMetadata.height || 1024;

    // Process garment (resize to fit inside, say, 50% of background width)
    const targetGarmentWidth = Math.round(bgWidth * 0.50);
    const processedGarmentBuffer = await sharp(garmentBuffer)
      .resize(targetGarmentWidth)
      .toBuffer();

    // Get processed garment metadata to center it
    const garmentMetadata = await sharp(processedGarmentBuffer).metadata();
    const garmentWidth = garmentMetadata.width || targetGarmentWidth;
    const garmentHeight = garmentMetadata.height || targetGarmentWidth;

    const left = Math.round((bgWidth - garmentWidth) / 2);
    const top = Math.round((bgHeight - garmentHeight) / 2);

    // Composite garment onto background
    const compositeBuffer = await bgImage
      .composite([
        {
          input: processedGarmentBuffer,
          top: top,
          left: left,
        },
      ])
      .toBuffer();

    // Upload to Supabase storage
    const tempId = `mock_flat_lay_${Date.now()}`;
    const publicUrl = await uploadBufferToStorage(
      supabase,
      compositeBuffer,
      userId,
      tempId,
      undefined,
      undefined,
      undefined,
      "image/png"
    );

    return publicUrl;
  } catch (err) {
    console.error("Failed to create mock flat lay:", err);
    return null;
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
        let mockImageUrl = gen.model_settings?.pose_model_bg || gen.original_image_url;
        if (gen.model_settings?.generation_type === "video") {
          mockImageUrl = "/videos/video1-simple-15.mp4";
        } else if (gen.model_settings?.photographyStyle === "flat_lay") {
          const flatLayStyleRef = gen.model_settings?.additional_designs?.flat_lay_style_ref;
          if (flatLayStyleRef) {
            const compositeUrl = await createMockFlatLay(
              supabase,
              gen.original_image_url,
              flatLayStyleRef,
              gen.user_id,
              gen.id
            );
            if (compositeUrl) {
              mockImageUrl = compositeUrl;
            }
          }
        }
        
        // Apply branding if present in settings
        const branding = gen.model_settings?.branding;
        if (branding && (branding.brandLogo || branding.brandName || branding.designNumber)) {
          try {
            console.log("Applying branding to mock image:", mockImageUrl);
            const finalBuffer = await applyBrandingToUrl(mockImageUrl, branding);
            const tempId = `mock_branded_${Date.now()}`;
            const brandedUrl = await uploadBufferToStorage(
              supabase,
              finalBuffer,
              gen.user_id,
              tempId,
              gen.model_settings?.outputFormat,
              gen.model_settings?.resolution,
              gen.model_settings?.aspectRatio
            );
            if (brandedUrl) {
              mockImageUrl = brandedUrl;
              console.log("Branded mock image uploaded successfully:", mockImageUrl);
            }
          } catch (err) {
            console.error("Failed to apply branding to mock image:", err);
          }
        }
        
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
        let publicUrl = await uploadToStorage(supabase, outputUrl, gen.user_id, gen.id, gen.model_settings?.outputFormat, gen.model_settings?.resolution, gen.model_settings?.aspectRatio);

        const aiPipeline = gen.model_settings?.aiPipeline;

        // Run CodeFormer face restoration for multi-garment pipeline
        if (aiPipeline === "multi_garment") {
          try {
            console.log("VTON succeeded. Triggering face restoration with CodeFormer...");
            const restoredUrl = await restoreFaceWithCodeformer(replicateToken, publicUrl);
            if (restoredUrl) {
              const uploadUrl = await uploadToStorage(supabase, restoredUrl, gen.user_id, `${gen.id}_restored`, gen.model_settings?.outputFormat, gen.model_settings?.resolution, gen.model_settings?.aspectRatio);
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
            let buffer: any = Buffer.from(enhancedBase64, "base64");
            let finalMime = enhancedMime;

            if (gen.model_settings?.outputFormat || gen.model_settings?.resolution || gen.model_settings?.aspectRatio) {
              const processed = await processImageBuffer(buffer, gen.model_settings.outputFormat, gen.model_settings.resolution, gen.model_settings.aspectRatio);
              buffer = processed.buffer;
              finalMime = processed.mimeType;
            }

            const ext = finalMime === "image/png" ? "png" : "jpg";
            const filePath = `${gen.user_id}/${gen.id}_enhanced.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from("designs")
              .upload(filePath, buffer, {
                contentType: finalMime,
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

        // Apply branding if present in settings
        const branding = gen.model_settings?.branding;
        if (branding && (branding.brandLogo || branding.brandName || branding.designNumber)) {
          try {
            console.log("Applying branding to Replicate output image:", publicUrl);
            const finalBuffer = await applyBrandingToUrl(publicUrl, branding);
            const tempId = `replicate_branded_${Date.now()}`;
            const brandedUrl = await uploadBufferToStorage(
              supabase,
              finalBuffer,
              gen.user_id,
              tempId,
              gen.model_settings?.outputFormat,
              gen.model_settings?.resolution,
              gen.model_settings?.aspectRatio
            );
            if (brandedUrl) {
              publicUrl = brandedUrl;
              console.log("Branded Replicate image uploaded successfully:", publicUrl);
            }
          } catch (err) {
            console.error("Failed to apply branding to Replicate image:", err);
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

    // ─── Stable Video Diffusion: Gradio video generation pipeline ───
    if (provider === "gradio_svd") {
      // Prevent concurrent duplicate executions
      if (gen.status === "processing_running") {
        return NextResponse.json(gen);
      }

      // Lock status immediately in the database
      const { data: genLocked } = await supabase
        .from("generations")
        .update({ status: "processing_running" })
        .eq("id", id)
        .select()
        .single();
      
      const activeGen = genLocked || gen;

      // Run Video pipeline
      try {
        const videoMode = activeGen.model_settings?.video_mode || "direct";
        const videoEngine = activeGen.model_settings?.video_engine || "wan2.1";
        
        console.log(`Starting video generation pipeline (Engine: ${videoEngine}, Mode: ${videoMode})...`);
        const hfToken = process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined;
        const originalUrl = activeGen.original_image_url;

        // 1. If try-on mode is selected, run VTON first to generate static model try-on image
        let modelImgUrl = originalUrl;
        
        if (videoMode === "tryon") {
          try {
            console.log("Running VTON first to generate static model try-on image...");
            
            // Resolve human/pose image URL
            let humanImgUrl = activeGen.model_settings?.pose_model_bg;
            if (!humanImgUrl) {
              const videoPoseNum = activeGen.model_settings?.additional_designs?.video_pose || 1;
              humanImgUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${videoPoseNum}.webp`;
            }
            
            const kaggleVtonUrl = process.env.KAGGLE_VTON_URL;
            let vtonResultUrl = null;
            
            if (kaggleVtonUrl) {
              try {
                console.log("Attempting Kaggle VTON with token...");
                const client = await Client.connect(kaggleVtonUrl, hfToken ? { token: hfToken } : {});
                const result = await client.predict("/tryon", [
                  { background: handle_file(humanImgUrl), layers: [], composite: null },
                  handle_file(originalUrl),
                  activeGen.model_settings?.generateFor || "garment",
                  true,  // is_checked
                  false, // is_checked_crop
                  30,    // denoise_steps
                  42,    // seed
                ]) as any;
                if (result && result.data && result.data[0]) {
                  vtonResultUrl = result.data[0].url;
                }
              } catch (kaggleErr) {
                console.error("Kaggle VTON with token failed:", kaggleErr);
                if (hfToken) {
                  try {
                    console.log("Attempting Kaggle VTON anonymously...");
                    const client = await Client.connect(kaggleVtonUrl);
                    const result = await client.predict("/tryon", [
                      { background: handle_file(humanImgUrl), layers: [], composite: null },
                      handle_file(originalUrl),
                      activeGen.model_settings?.generateFor || "garment",
                      true,
                      false,
                      30,
                      42,
                    ]) as any;
                    if (result && result.data && result.data[0]) {
                      vtonResultUrl = result.data[0].url;
                    }
                  } catch (kaggleAnonErr) {
                    console.error("Kaggle VTON anonymously failed too:", kaggleAnonErr);
                  }
                }
              }
            }

            if (!vtonResultUrl) {
              try {
                console.log("Attempting Kwai-Kolors VTON with token...");
                const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", hfToken ? { token: hfToken } : {});
                const result = await client.predict(2, [
                  handle_file(humanImgUrl),
                  handle_file(originalUrl),
                  42,
                  true
                ]) as any;
                if (result && result.data && result.data[0]) {
                  vtonResultUrl = result.data[0].url;
                }
              } catch (kolorsErr) {
                console.error("Kwai-Kolors VTON with token failed:", kolorsErr);
                if (hfToken) {
                  try {
                    console.log("Attempting Kwai-Kolors VTON anonymously...");
                    const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On");
                    const result = await client.predict(2, [
                      handle_file(humanImgUrl),
                      handle_file(originalUrl),
                      42,
                      true
                    ]) as any;
                    if (result && result.data && result.data[0]) {
                      vtonResultUrl = result.data[0].url;
                    }
                  } catch (kolorsAnonErr) {
                    console.error("Kwai-Kolors VTON anonymously failed too:", kolorsAnonErr);
                  }
                }
              }
            }

            // Fallback: Replicate VTON
            const replicateToken = process.env.REPLICATE_API_TOKEN;
            if (!vtonResultUrl && replicateToken) {
              try {
                console.log("Attempting Replicate IDM-VTON...");
                vtonResultUrl = await runReplicateVton(originalUrl, humanImgUrl, replicateToken);
              } catch (replicateVtonErr) {
                console.error("Replicate IDM-VTON in video pipeline failed:", replicateVtonErr);
              }
            }

            // Fallback: Use OpenRouter/Gemini to generate a model image with the garment
            if (!vtonResultUrl) {
              const openRouterApiKey = process.env.OPENROUTER_API_KEY;
              const geminiApiKey = process.env.GEMINI_API_KEY;
              if (openRouterApiKey || geminiApiKey) {
                try {
                  console.log("VTON spaces exhausted. Falling back to AI image generation...");
                  const { generateViaOpenRouter } = await import("@/utils/ai");
                  const generateFor = activeGen.model_settings?.generateFor || "saree";
                  const skinTone = activeGen.model_settings?.skinTone || "Wheatish";
                  const modelPose = activeGen.model_settings?.modelPose || "Front Standing";
                  const bgStyle = activeGen.model_settings?.backgroundStyle || "Studio";
                  
                  const fallbackPrompt = `Generate a photorealistic image of an Indian female model wearing the EXACT garment shown in the attached reference image. The model should have ${skinTone} skin tone, be in a ${modelPose} pose, and stand against a ${bgStyle} background. Full body, head to toe, professional fashion photography. The garment design, colors, patterns, and all textile details MUST match the reference image exactly.`;
                  
                  if (openRouterApiKey) {
                    const { base64Data, mimeType } = await generateViaOpenRouter(
                      openRouterApiKey,
                      "google/gemini-2.5-flash-image",
                      fallbackPrompt,
                      originalUrl,
                      "3:4",
                      []
                    );
                    // Upload the generated image
                    const buffer = Buffer.from(base64Data, "base64");
                    const ext = mimeType === "image/png" ? "png" : "jpg";
                    const filePath = `${activeGen.user_id}/${activeGen.id}_ai_model.${ext}`;
                    const { error: uploadErr2 } = await supabase.storage
                      .from("designs")
                      .upload(filePath, buffer, { contentType: mimeType, upsert: true });
                    if (!uploadErr2) {
                      const { data: { publicUrl: aiModelUrl } } = supabase.storage
                        .from("designs")
                        .getPublicUrl(filePath);
                      vtonResultUrl = aiModelUrl;
                      console.log("AI model image generated as VTON fallback:", vtonResultUrl);
                    }
                  }
                } catch (aiErr) {
                  console.error("AI fallback for VTON also failed:", aiErr);
                }
              }
            }

            if (vtonResultUrl) {
              console.log("Uploading VTON result to Supabase Storage to get a stable public URL...");
              const uploadUrl = await uploadToStorage(
                supabase,
                vtonResultUrl,
                activeGen.user_id,
                `${activeGen.id}_vton_temp`
              );
              if (uploadUrl) {
                modelImgUrl = uploadUrl;
                console.log("VTON try-on image uploaded to Supabase:", modelImgUrl);
              } else {
                modelImgUrl = vtonResultUrl;
                console.log("Failed to upload VTON result to Supabase, using direct URL:", modelImgUrl);
              }
            } else {
              console.warn("All VTON pipelines failed, falling back to original clothing image for video animation.");
            }
          } catch (vtonErr) {
            console.error("VTON step failed:", vtonErr);
          }
        }

        // 2. Generate video based on selected video engine
        let videoTempUrl = null;
        if (videoEngine === "wan2.1") {
          videoTempUrl = await generateVideoViaWan21(
            modelImgUrl,
            activeGen.prompt || undefined,
            activeGen.model_settings?.aspectRatio || undefined,
            hfToken
          );
        } else {
          videoTempUrl = await generateVideoViaSVD(modelImgUrl, hfToken);
        }

        if (!videoTempUrl) {
          throw new Error(`Failed to generate video via ${videoEngine}`);
        }

        // 3. Upload the generated video (.mp4) to user's Supabase storage designs bucket
        const publicVideoUrl = await uploadVideoToStorage(
          supabase,
          videoTempUrl,
          activeGen.user_id,
          activeGen.id
        );

        if (!publicVideoUrl) {
          throw new Error("Failed to upload generated video to storage");
        }

        // 4. Update generation record to done
        const { data: completedGen, error: updateErr } = await supabase
          .from("generations")
          .update({
            status: "done",
            generated_image_url: publicVideoUrl,
            completed_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        console.log(`${videoEngine} Video Generation completed successfully! URL:`, publicVideoUrl);
        return NextResponse.json(completedGen);
      } catch (err: any) {
        console.error("Video generation pipeline failed:", err);
        
        // Reset status to failed and refund credit
        const { data: failedGen } = await supabase
          .from("generations")
          .update({
            status: "failed",
            completed_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        const { data: currentCredits } = await supabase
          .from("credits")
          .select("balance")
          .eq("user_id", activeGen.user_id)
          .single();

        if (currentCredits) {
          await supabase
            .from("credits")
            .update({ balance: currentCredits.balance + 1 })
            .eq("user_id", activeGen.user_id);
        }

        return NextResponse.json(failedGen || activeGen);
      }
    }

    // Helper function to run Replicate IDM-VTON synchronously
    async function runReplicateVton(
      garmentUrl: string,
      humanUrl: string,
      replicateToken: string
    ): Promise<string | null> {
      try {
        console.log("[VTON] Running Replicate IDM-VTON...");
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Token ${replicateToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
            input: {
              garm_img: garmentUrl,
              human_img: humanUrl,
              category: "dresses",
              crop: false,
              steps: 30,
            },
          }),
        });

        if (!response.ok) return null;
        const prediction = await response.json();
        const predictionId = prediction.id;

        // Poll for 3 minutes max
        const maxWaitMs = 3 * 60 * 1000;
        const pollIntervalMs = 4000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { Authorization: `Token ${replicateToken}` },
          });
          if (!pollRes.ok) continue;
          const pollData = await pollRes.json();
          if (pollData.status === "succeeded") {
            return Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
          } else if (pollData.status === "failed" || pollData.status === "canceled") {
            break;
          }
        }
        return null;
      } catch (err) {
        console.error("Replicate VTON helper failed:", err);
        return null;
      }
    }

    // Unknown provider — just return current state
    return NextResponse.json(gen);
  } catch (error: any) {
    console.error("Status API internal error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
