import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Client, handle_file } from "@gradio/client";
import { generateViaOpenRouter, enhanceImageWithGemini, fetchImageAsBase64, restoreFaceWithCodeformer, processImageBuffer, generatePosedModel } from "@/utils/ai";
import { applyBrandingToImageBuffer, applyBrandingToUrl } from "@/utils/branding";
import sharp from "sharp";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to emit real-time updates over Socket.io
function emitSocketUpdate(userId: string, data: any) {
  if (typeof global !== "undefined" && (global as any).io) {
    (global as any).io.to(userId).emit("generation-updated", data);
    console.log(`[Socket.io] Emitted update to user room ${userId} for generation ${data.id}`);
  }
}

// Create a Supabase admin client for background execution
function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Helper to upload base64 image to Supabase Storage
async function uploadBase64ToStorage(
  supabase: any,
  base64Data: string,
  mimeType: string,
  userId: string,
  genId: string,
  outputFormat?: string,
  resolution?: string,
  aspectRatio?: string
) {
  try {
    let buffer: any = Buffer.from(base64Data, "base64");
    let finalMimeType = mimeType;

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

    const {
      data: { publicUrl },
    } = supabase.storage.from("designs").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Supabase storage upload error:", error);
    return null;
  }
}

// Helper function to handle flat lay compositing of clothing over AI generated background
async function handleFlatLayAndUpload(
  supabase: any,
  generatedBase64: string,
  mimeType: string,
  photographyStyle: string,
  original_image_url: string,
  userId: string,
  tempId: string,
  outputFormat?: string,
  resolution?: string,
  aspectRatio?: string
): Promise<string | null> {
  try {
    if (photographyStyle === "flat_lay") {
      console.log("Compositing garment onto generated flat lay background...");
      
      const garmentRes = await fetch(original_image_url);
      if (!garmentRes.ok) throw new Error("Failed to fetch garment image for composite");
      const garmentBuffer = Buffer.from(await garmentRes.arrayBuffer());

      const bgBuffer = Buffer.from(generatedBase64, "base64");
      const bgImage = sharp(bgBuffer);
      const bgMetadata = await bgImage.metadata();
      const bgWidth = bgMetadata.width || 1024;
      const bgHeight = bgMetadata.height || 1024;

      const targetGarmentWidth = Math.round(bgWidth * 0.50);
      const processedGarmentBuffer = await sharp(garmentBuffer)
        .resize(targetGarmentWidth)
        .toBuffer();

      const garmentMetadata = await sharp(processedGarmentBuffer).metadata();
      const garmentWidth = garmentMetadata.width || targetGarmentWidth;
      const garmentHeight = garmentMetadata.height || targetGarmentWidth;

      const left = Math.round((bgWidth - garmentWidth) / 2);
      const top = Math.round((bgHeight - garmentHeight) / 2);

      const compositeBuffer = await bgImage
        .composite([
          {
            input: processedGarmentBuffer,
            top: top,
            left: left,
          },
        ])
        .toBuffer();

      return await uploadBase64ToStorage(
        supabase,
        compositeBuffer.toString("base64"),
        "image/png",
        userId,
        tempId,
        outputFormat,
        resolution,
        aspectRatio
      );
    }
  } catch (err) {
    console.error("Flat lay composite generation failed, falling back to raw generated image:", err);
  }

  return await uploadBase64ToStorage(
    supabase,
    generatedBase64,
    mimeType,
    userId,
    tempId,
    outputFormat,
    resolution,
    aspectRatio
  );
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

    const bgImage = sharp(styleBuffer);
    const bgMetadata = await bgImage.metadata();
    const bgWidth = bgMetadata.width || 1024;
    const bgHeight = bgMetadata.height || 1024;

    const targetGarmentWidth = Math.round(bgWidth * 0.50);
    const processedGarmentBuffer = await sharp(garmentBuffer)
      .resize(targetGarmentWidth)
      .toBuffer();

    const garmentMetadata = await sharp(processedGarmentBuffer).metadata();
    const garmentWidth = garmentMetadata.width || targetGarmentWidth;
    const garmentHeight = garmentMetadata.height || targetGarmentWidth;

    const left = Math.round((bgWidth - garmentWidth) / 2);
    const top = Math.round((bgHeight - garmentHeight) / 2);

    const compositeBuffer = await bgImage
      .composite([
        {
          input: processedGarmentBuffer,
          top: top,
          left: left,
        },
      ])
      .toBuffer();

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

async function segmentImageWithReplicate(imageUrl: string, replicateToken: string): Promise<string> {
  console.log(`[Segmentation] Starting rembg for: ${imageUrl}`);
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${replicateToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      input: {
        image: imageUrl
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Replicate segmentation failed: ${errText}`);
  }

  let prediction = await response.json();
  const predictionId = prediction.id;
  let status = prediction.status;
  let attempts = 0;
  
  while (status !== "succeeded" && status !== "failed" && status !== "canceled" && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        "Authorization": `Token ${replicateToken}`,
      },
    });

    if (pollRes.ok) {
      prediction = await pollRes.json();
      status = prediction.status;
    }
    attempts++;
  }

  if (status !== "succeeded") {
    throw new Error(`Segmentation timed out or failed with status: ${status}`);
  }

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!outputUrl) {
    throw new Error("No output URL returned from Replicate segmentation");
  }
  return outputUrl;
}

async function createCombineCollage(
  supabase: any,
  combineImages: string[],
  backgroundImageUrl: string | null,
  userId: string,
  genId: string,
  isMock: boolean,
  outputFormat?: string,
  resolution?: string,
  aspectRatio?: string
): Promise<string | null> {
  try {
    console.log(`[Combine] Starting collage creation for user ${userId}. Images count: ${combineImages.length}`);
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    // 1. Process background image or create default one
    let bgWidth = 1200;
    let bgHeight = 800;
    let bgImage: any;
    let bgBuffer: Buffer;

    if (backgroundImageUrl) {
      try {
        bgBuffer = await loadImageBuffer(backgroundImageUrl);
        const bgMetadata = await sharp(bgBuffer).metadata();
        bgWidth = bgMetadata.width || 1200;
        bgHeight = bgMetadata.height || 800;
        bgImage = sharp(bgBuffer);
      } catch (bgErr) {
        console.error("[Combine] Failed to load background image, falling back to neutral canvas:", bgErr);
        bgBuffer = await sharp({
          create: {
            width: bgWidth,
            height: bgHeight,
            channels: 4,
            background: { r: 243, g: 244, b: 246, alpha: 1 }
          }
        }).png().toBuffer();
        bgImage = sharp(bgBuffer);
      }
    } else {
      bgBuffer = await sharp({
        create: {
          width: bgWidth,
          height: bgHeight,
          channels: 4,
          background: { r: 243, g: 244, b: 246, alpha: 1 }
        }
      }).png().toBuffer();
      bgImage = sharp(bgBuffer);
    }

    // 2. Fetch and segment model images
    const processedModelBuffers: Buffer[] = [];
    const modelMetadatas: { width: number; height: number }[] = [];

    for (const imgUrl of combineImages) {
      try {
        let activeUrl = imgUrl;
        if (!isMock && replicateToken) {
          try {
            activeUrl = await segmentImageWithReplicate(imgUrl, replicateToken);
          } catch (segErr) {
            console.error(`[Combine] Segmentation failed for ${imgUrl}, using original image:`, segErr);
          }
        }

        const modelBuf = await loadImageBuffer(activeUrl);
        const metadata = await sharp(modelBuf).metadata();
        processedModelBuffers.push(modelBuf);
        modelMetadatas.push({
          width: metadata.width || 800,
          height: metadata.height || 1200
        });
      } catch (imgErr) {
        console.error(`[Combine] Failed to process image ${imgUrl}:`, imgErr);
      }
    }

    if (processedModelBuffers.length === 0) {
      throw new Error("No model images could be loaded/processed");
    }

    // 3. Layout models based on Grid logic
    let rows = 1;
    let rowLayout: number[][] = []; // indices of images in each row

    if (processedModelBuffers.length <= 3) {
      rows = 1;
      rowLayout = [Array.from({ length: processedModelBuffers.length }, (_, i) => i)];
    } else if (processedModelBuffers.length === 4) {
      rows = 2;
      rowLayout = [[0, 1], [2, 3]];
    } else if (processedModelBuffers.length === 5) {
      rows = 2;
      rowLayout = [[0, 1, 2], [3, 4]];
    } else if (processedModelBuffers.length === 6) {
      rows = 2;
      rowLayout = [[0, 1, 2], [3, 4, 5]];
    }

    const rowHeight = Math.round(bgHeight / rows);
    const composites: any[] = [];

    for (let r = 0; r < rowLayout.length; r++) {
      const itemIndices = rowLayout[r];
      const targetModelHeightInRow = Math.round(rowHeight * 0.9);
      
      const scaledWidths: number[] = [];
      for (const idx of itemIndices) {
        const meta = modelMetadatas[idx];
        const scaledWidth = Math.round(meta.width * (targetModelHeightInRow / meta.height));
        scaledWidths.push(scaledWidth);
      }

      const totalWidth = scaledWidths.reduce((sum, w) => sum + w, 0);

      let finalModelHeight = targetModelHeightInRow;
      let finalWidths = [...scaledWidths];
      if (totalWidth > bgWidth * 0.95) {
        const scaleFactor = (bgWidth * 0.95) / totalWidth;
        finalModelHeight = Math.round(targetModelHeightInRow * scaleFactor);
        finalWidths = scaledWidths.map(w => Math.round(w * scaleFactor));
      }

      const finalTotalWidth = finalWidths.reduce((sum, w) => sum + w, 0);
      let currentX = Math.round((bgWidth - finalTotalWidth) / 2);
      const bottomY = (r + 1) * rowHeight;
      const topOffset = bottomY - finalModelHeight - Math.round(rowHeight * 0.05);

      for (let i = 0; i < itemIndices.length; i++) {
        const idx = itemIndices[i];
        const resizedModel = await sharp(processedModelBuffers[idx])
          .resize({ height: finalModelHeight })
          .toBuffer();

        composites.push({
          input: resizedModel,
          top: topOffset,
          left: currentX
        });

        currentX += finalWidths[i];
      }
    }

    // 4. Perform composition
    const compositeBuffer = await bgImage
      .composite(composites)
      .toBuffer();

    // 5. Upload to Supabase Storage
    const publicUrl = await uploadBufferToStorage(
      supabase,
      compositeBuffer,
      userId,
      genId,
      outputFormat,
      resolution,
      aspectRatio,
      "image/png"
    );

    return publicUrl;
  } catch (err: any) {
    console.error("[Combine] createCombineCollage failed:", err);
    return null;
  }
}

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
    return imageUrl;
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

// Server-side Background Image Generation Worker
async function runImageBackground(
  genId: string,
  userId: string,
  prompt: string,
  textToImagePrompt: string,
  body: any
) {
  console.log(`[Background-Image] Starting generation for genId=${genId}, user=${userId}`);
  const supabase = getSupabaseAdmin();
  let generatedImageUrl = "";
  let generationStatus = "failed";
  let generationProvider = "mock";
  let isMockMode = body.useMockMode || false;

  const {
    generateFor,
    photographyStyle,
    outputFormat,
    aspectRatio,
    resolution,
    modelPose,
    skinTone,
    backgroundStyle,
    sareeColourHint,
    original_image_url,
    pose_model_bg,
    aiPipeline = "auto",
    additional_designs = {},
    catalogueOption = "display_rack",
    branding,
    generation_type,
    combine_images,
    background_image,
  } = body;

  try {
    if (generation_type === "combine") {
      if (isMockMode) {
        await new Promise((r) => setTimeout(r, 6000));
      }
      const compositeUrl = await createCombineCollage(
        supabase,
        combine_images || [],
        background_image || null,
        userId,
        genId,
        isMockMode,
        outputFormat,
        resolution,
        aspectRatio
      );

      if (!compositeUrl) {
        throw new Error("Failed to create combine collage image");
      }

      let finalImageUrl = compositeUrl;
      // Apply branding
      if (branding && (branding.brandLogo || branding.brandName || branding.designNumber)) {
        try {
          const finalBuffer = await applyBrandingToUrl(finalImageUrl, branding);
          const brandedUrl = await uploadBufferToStorage(supabase, finalBuffer, userId, `combine_branded_${Date.now()}`, outputFormat, resolution, aspectRatio);
          if (brandedUrl) finalImageUrl = brandedUrl;
        } catch (e) {
          console.error("Combine branding failed:", e);
        }
      }

      generatedImageUrl = finalImageUrl;
      generationStatus = "done";
      generationProvider = isMockMode ? "mock" : "replicate_combine";
    } else if (isMockMode) {
      // Wait for mock delay
      await new Promise((r) => setTimeout(r, 8000));
      
      let mockImageUrl = pose_model_bg || original_image_url;
      if (photographyStyle === "flat_lay") {
        const flatLayStyleRef = additional_designs?.flat_lay_style_ref;
        if (flatLayStyleRef) {
          const compositeUrl = await createMockFlatLay(
            supabase,
            original_image_url,
            flatLayStyleRef,
            userId,
            genId
          );
          if (compositeUrl) {
            mockImageUrl = compositeUrl;
          }
        }
      }

      // Apply branding
      if (branding && (branding.brandLogo || branding.brandName || branding.designNumber)) {
        try {
          const finalBuffer = await applyBrandingToUrl(mockImageUrl, branding);
          const brandedUrl = await uploadBufferToStorage(supabase, finalBuffer, userId, `mock_branded_${Date.now()}`, outputFormat, resolution, aspectRatio);
          if (brandedUrl) mockImageUrl = brandedUrl;
        } catch (e) {
          console.error("Mock branding failed:", e);
        }
      }

      generatedImageUrl = mockImageUrl;
      generationStatus = "done";
      generationProvider = "mock";
    } else {
      let togetherErrorMsg = "";
      let huggingfaceErrorMsg = "";
      let geminiErrorMsg = "";
      let replicateErrorMsg = "";
      let pollinationsErrorMsg = "";
      let kaggleErrorMsg = "";
      let openrouterErrorMsg = "";
      let vtonBase64 = "";
      let vtonMime = "";

      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      const geminiApiKey = process.env.GEMINI_API_KEY;
      const togetherApiKey = process.env.TOGETHER_API_KEY;
      const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
      const replicateToken = process.env.REPLICATE_API_TOKEN;

      const additionalUrls = additional_designs 
        ? Object.entries(additional_designs)
            .filter(([key, val]) => val && typeof val === "string" && val.startsWith("http") && key !== `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`)
            .map(([_, val]) => val as string)
        : [];

      // ─── STRATEGY OPENROUTER ───
      const isDirectOpenRouter = ["openrouter_gemini", "openrouter_flux_pro", "openrouter_flux_flex"].includes(aiPipeline);
      if (generationStatus !== "done" && isDirectOpenRouter && openRouterApiKey) {
        try {
          let model = "google/gemini-2.5-flash-image";
          if (aiPipeline === "openrouter_flux_pro") model = "black-forest-labs/flux-2-pro";
          else if (aiPipeline === "openrouter_flux_flex") model = "black-forest-labs/flux-2-flex";

          const flatLayMode = photographyStyle === "flat_lay" && textToImagePrompt;
          const orPrompt = flatLayMode ? textToImagePrompt : prompt;
          const orImageUrl = flatLayMode ? undefined : original_image_url;
          const orAdditionalUrls = flatLayMode ? [] : additionalUrls;

          const { base64Data, mimeType } = await generateViaOpenRouter(
            openRouterApiKey,
            model,
            orPrompt,
            orImageUrl as any,
            aspectRatio,
            orAdditionalUrls
          );

          const tempId = `openrouter_${Date.now()}`;
          const publicUrl = await handleFlatLayAndUpload(supabase, base64Data, mimeType, photographyStyle, original_image_url, userId, tempId, outputFormat, resolution, aspectRatio);
          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = `openrouter_${model.split("/")[1] || model}`;
          }
        } catch (err: any) {
          openrouterErrorMsg = err?.message || String(err);
        }
      }

      // ─── RESOLVE POSE REFERENCE ───
      const poseMapping: Record<string, number> = {
        "Front Standing": 1, "Left Profile": 2, "Back View": 3,
        "Leaning on Wall": 4, "Seated": 5, "Walking": 6,
        "Close-up Portrait": 7, "Right Profile": 8,
      };
      const poseNum = poseMapping[modelPose] || 1;
      const isMaleCategoryForPose = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
      const posePrefix = isMaleCategoryForPose ? "male_pose" : "pose";
      const poseExt = isMaleCategoryForPose ? "png" : "webp";
      const defaultHumanImgUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/${posePrefix}${poseNum}.${poseExt}`;
      let humanImgUrl = pose_model_bg || defaultHumanImgUrl;

      if (humanImgUrl.startsWith("/")) {
        try {
          const fs = require("fs");
          const path = require("path");
          const filePath = path.join(process.cwd(), "public", humanImgUrl);
          const buffer = fs.readFileSync(filePath);
          const publicUrl = await uploadBase64ToStorage(supabase, buffer.toString("base64"), humanImgUrl.endsWith(".png") ? "image/png" : "image/webp", userId, `temp_pose_${Date.now()}`);
          if (publicUrl) humanImgUrl = publicUrl;
        } catch (e) {
          console.error("Local pose upload error:", e);
        }
      }

      let resolvedPoseModelBg = pose_model_bg;
      if (resolvedPoseModelBg && resolvedPoseModelBg.startsWith("/")) {
        try {
          const fs = require("fs");
          const path = require("path");
          const filePath = path.join(process.cwd(), "public", resolvedPoseModelBg);
          const buffer = fs.readFileSync(filePath);
          const publicUrl = await uploadBase64ToStorage(supabase, buffer.toString("base64"), resolvedPoseModelBg.endsWith(".png") ? "image/png" : "image/webp", userId, `temp_model_${Date.now()}`);
          if (publicUrl) resolvedPoseModelBg = publicUrl;
        } catch (e) {
          console.error("Local model bg upload error:", e);
        }
      }

      let resolvedPoseRef = additional_designs.pose_ref || defaultHumanImgUrl;
      if (resolvedPoseRef && resolvedPoseRef.startsWith("/")) {
        try {
          const fs = require("fs");
          const path = require("path");
          const filePath = path.join(process.cwd(), "public", resolvedPoseRef);
          const buffer = fs.readFileSync(filePath);
          const publicUrl = await uploadBase64ToStorage(supabase, buffer.toString("base64"), resolvedPoseRef.endsWith(".png") ? "image/png" : "image/webp", userId, `temp_poseref_${Date.now()}`);
          if (publicUrl) resolvedPoseRef = publicUrl;
        } catch (e) {
          console.error("Local pose ref upload error:", e);
        }
      }

      if (resolvedPoseModelBg && photographyStyle !== "flat_lay") {
        try {
          const posedModelUrl = await generatePosedModel({
            modelUrl: resolvedPoseModelBg,
            poseUrl: resolvedPoseRef,
            userId,
            isMale: isMaleCategoryForPose,
            geminiApiKey,
            openRouterApiKey,
            supabase
          });
          if (posedModelUrl) humanImgUrl = posedModelUrl;
        } catch (err) {
          console.error("Posed model gen failed:", err);
        }
      }

      // ─── STRATEGY KAGGLE VTON ───
      const kaggleVtonUrl = process.env.KAGGLE_VTON_URL;
      if (generationStatus !== "done" && kaggleVtonUrl && photographyStyle !== "flat_lay") {
        try {
          const hfToken = process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined;
          const app = await Client.connect(kaggleVtonUrl, hfToken ? { token: hfToken } : {});
          const result = await app.predict("/tryon", [
            { background: handle_file(humanImgUrl), layers: [], composite: null },
            handle_file(original_image_url),
            `${sareeColourHint || "beautiful"} ${generateFor || "garment"}`,
            true, false, 30, 42
          ]) as any;

          if (result && result.data && result.data[0]) {
            const genRes = await fetch(result.data[0].url);
            const base64Data = Buffer.from(await genRes.arrayBuffer()).toString("base64");
            const publicUrl = await uploadBase64ToStorage(supabase, base64Data, "image/png", userId, `kaggle_${Date.now()}`, outputFormat, resolution, aspectRatio);
            if (publicUrl) {
              generatedImageUrl = publicUrl;
              generationStatus = "done";
              generationProvider = "kaggle_vton";
              vtonBase64 = base64Data;
              vtonMime = "image/png";
            }
          }
        } catch (err: any) {
          kaggleErrorMsg = err?.message || String(err);
        }
      }

      // ─── STRATEGY KOLORS VTON ───
      if (generationStatus !== "done" && photographyStyle !== "flat_lay") {
        try {
          const hfToken = process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined;
          const app = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", hfToken ? { token: hfToken } : {});
          const result = await app.predict(2, [handle_file(humanImgUrl), handle_file(original_image_url), 42, true]) as any;

          if (result && result.data && result.data[0]) {
            const genRes = await fetch(result.data[0].url);
            const base64Data = Buffer.from(await genRes.arrayBuffer()).toString("base64");
            const publicUrl = await uploadBase64ToStorage(supabase, base64Data, "image/png", userId, `kolors_${Date.now()}`, outputFormat, resolution, aspectRatio);
            if (publicUrl) {
              generatedImageUrl = publicUrl;
              generationStatus = "done";
              generationProvider = "kolors_vton";
              vtonBase64 = base64Data;
              vtonMime = "image/png";
            }
          }
        } catch (err: any) {
          console.error("Kolors VTON failed:", err);
        }
      }

      // ─── STRATEGY TOGETHER AI ───
      if (generationStatus !== "done" && togetherApiKey) {
        try {
          let width = 1024; let height = 1024;
          const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
          if (cleanAspectRatio === "9:16") { width = 768; height = 1344; }
          else if (cleanAspectRatio === "16:9") { width = 1344; height = 768; }
          else if (cleanAspectRatio === "4:3") { width = 1024; height = 768; }
          else if (cleanAspectRatio === "3:4") { width = 768; height = 1024; }
          else if (cleanAspectRatio === "4:5") { width = 896; height = 1152; }

          const response = await fetch("https://api.together.xyz/v1/images/generations", {
            method: "POST",
            headers: { "Authorization": `Bearer ${togetherApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "black-forest-labs/FLUX.1-dev",
              prompt: textToImagePrompt || prompt,
              width, height, steps: 28, n: 1, response_format: "b64_json"
            })
          });

          if (response.ok) {
            const togetherData = await response.json();
            if (togetherData.data && togetherData.data[0]?.b64_json) {
              const publicUrl = await handleFlatLayAndUpload(supabase, togetherData.data[0].b64_json, "image/png", photographyStyle, original_image_url, userId, `together_${Date.now()}`, outputFormat, resolution, aspectRatio);
              if (publicUrl) {
                generatedImageUrl = publicUrl;
                generationStatus = "done";
                generationProvider = "together";
              }
            }
          }
        } catch (err: any) {
          togetherErrorMsg = err?.message || String(err);
        }
      }

      // ─── STRATEGY HUGGING FACE SERVERLESS ───
      if (generationStatus !== "done" && huggingfaceApiKey) {
        try {
          let width = 1024; let height = 1024;
          const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
          if (cleanAspectRatio === "9:16") { width = 768; height = 1344; }
          else if (cleanAspectRatio === "16:9") { width = 1344; height = 768; }
          else if (cleanAspectRatio === "4:3") { width = 1024; height = 768; }
          else if (cleanAspectRatio === "3:4") { width = 768; height = 1024; }
          else if (cleanAspectRatio === "4:5") { width = 896; height = 1152; }

          const response = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev", {
            headers: { Authorization: `Bearer ${huggingfaceApiKey}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ inputs: textToImagePrompt || prompt, parameters: { width, height } })
          });

          if (response.ok) {
            const base64Data = Buffer.from(await response.arrayBuffer()).toString("base64");
            const publicUrl = await handleFlatLayAndUpload(supabase, base64Data, "image/jpeg", photographyStyle, original_image_url, userId, `hf_${Date.now()}`, outputFormat, resolution, aspectRatio);
            if (publicUrl) {
              generatedImageUrl = publicUrl;
              generationStatus = "done";
              generationProvider = "huggingface";
            }
          }
        } catch (err: any) {
          huggingfaceErrorMsg = err?.message || String(err);
        }
      }

      // ─── STRATEGY GEMINI ───
      if (generationStatus !== "done" && (geminiApiKey || openRouterApiKey)) {
        try {
          const isFlatLayGemini = photographyStyle === "flat_lay" && textToImagePrompt;

          if (geminiApiKey) {
            try {
              const ai = new GoogleGenAI({ apiKey: geminiApiKey });
              const contents: any[] = [];

              if (isFlatLayGemini) {
                contents.push({ text: textToImagePrompt });
                if (additional_designs?.flat_lay_style_ref) {
                  try {
                    const styleRefImg = await fetchImageAsBase64(additional_designs.flat_lay_style_ref);
                    if (styleRefImg) contents.push({ inlineData: { mimeType: styleRefImg.mimeType, data: styleRefImg.data } });
                  } catch (e) {
                    console.error("Flat lay style ref fetch failed:", e);
                  }
                }
              } else {
                const garmentImage = await fetchImageAsBase64(original_image_url);
                if (garmentImage) {
                  contents.push({ text: prompt }, { inlineData: { mimeType: garmentImage.mimeType, data: garmentImage.data } });
                }

                if (additional_designs) {
                  for (const [key, value] of Object.entries(additional_designs)) {
                    if (value && typeof value === "string" && value.startsWith("http") && key !== `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`) {
                      try {
                        const img = await fetchImageAsBase64(value);
                        if (img) contents.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
                      } catch (e) {
                        console.error(`Gemini additional fetch failed [${key}]:`, e);
                      }
                    }
                  }
                }
              }

              const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents,
                config: { responseModalities: ["TEXT", "IMAGE"] }
              });

              if (response.candidates && response.candidates[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData && part.inlineData.data) {
                    const publicUrl = await handleFlatLayAndUpload(supabase, part.inlineData.data, part.inlineData.mimeType || "image/png", photographyStyle, original_image_url, userId, `gemini_${Date.now()}`, outputFormat, resolution, aspectRatio);
                    if (publicUrl) {
                      generatedImageUrl = publicUrl;
                      generationStatus = "done";
                      generationProvider = "gemini";
                    }
                    break;
                  }
                }
              }
            } catch (directErr: any) {
              geminiErrorMsg = directErr?.message || String(directErr);
            }
          }

          if (generationStatus !== "done" && openRouterApiKey) {
            const orFallbackPrompt = isFlatLayGemini ? textToImagePrompt : prompt;
            const orFallbackImageUrl = isFlatLayGemini ? undefined : original_image_url;
            const orFallbackAdditionalUrls = isFlatLayGemini ? [] : additionalUrls;

            const { base64Data, mimeType } = await generateViaOpenRouter(
              openRouterApiKey, "google/gemini-2.5-flash-image", orFallbackPrompt, orFallbackImageUrl as any, aspectRatio, orFallbackAdditionalUrls
            );

            const publicUrl = await handleFlatLayAndUpload(supabase, base64Data, mimeType, photographyStyle, original_image_url, userId, `gemini_or_${Date.now()}`, outputFormat, resolution, aspectRatio);
            if (publicUrl) {
              generatedImageUrl = publicUrl;
              generationStatus = "done";
              generationProvider = "openrouter_gemini";
            }
          }
        } catch (err: any) {
          geminiErrorMsg = err?.message || String(err);
        }
      }

      // ─── STRATEGY REPLICATE ───
      if (generationStatus !== "done" && replicateToken && photographyStyle !== "flat_lay") {
        try {
          const getVtonCategory = (cat: string): string => {
            const n = (cat || "").toLowerCase().trim();
            if (n.includes("saree") || n.includes("lehenga") || n.includes("suit") || n.includes("dress") || n.includes("kurta") || n.includes("kurti")) return "dresses";
            if (n.includes("bottom") || n.includes("skirt") || n.includes("pants") || n.includes("salwar")) return "bottoms";
            return "tops";
          };
          const vtonCategory = getVtonCategory(generateFor);

          const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: { "Authorization": `Token ${replicateToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              version: "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
              input: { garm_img: original_image_url, human_img: humanImgUrl, garment_des: `${sareeColourHint || "beautiful"} ${generateFor}`, category: vtonCategory, crop: false, steps: 30 }
            })
          });

          if (response.ok) {
            const prediction = await response.json();
            const predictionId = prediction.id;

            // Update row with replicate_id
            await supabase
              .from("generations")
              .update({ model_settings: { ...body, replicate_id: predictionId, provider: "replicate" } })
              .eq("id", genId);

            // Server-side polling loop for Replicate
            const maxWaitMs = 5 * 60 * 1000;
            const pollIntervalMs = 4000;
            const startTime = Date.now();
            let replicateDone = false;

            while (Date.now() - startTime < maxWaitMs) {
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
              const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${replicateToken}` }
              });
              if (!pollRes.ok) continue;
              const pollData = await pollRes.json();
              const replicateStatus = pollData.status;

              if (replicateStatus === "succeeded") {
                let outputUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
                if (outputUrl) {
                  let publicUrl = await uploadToStorage(supabase, outputUrl, userId, genId, outputFormat, resolution, aspectRatio);

                  // Face restoration
                  if (aiPipeline === "multi_garment") {
                    try {
                      const restoredUrl = await restoreFaceWithCodeformer(replicateToken, publicUrl);
                      if (restoredUrl) {
                        const uploadUrl = await uploadToStorage(supabase, restoredUrl, userId, `${genId}_restored`, outputFormat, resolution, aspectRatio);
                        publicUrl = uploadUrl;
                      }
                    } catch (e) {
                      console.error("Codeformer failed:", e);
                    }
                  }

                  // Hybrid Gemini
                  const mainDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
                  const hasAdditionalClothing = additional_designs ? Object.entries(additional_designs).some(([k, v]) => v && typeof v === "string" && v.startsWith("http") && k !== mainDesignKey) : false;
                  const shouldEnhance = aiPipeline === "hybrid" || (aiPipeline === "auto" && hasAdditionalClothing);

                  if (shouldEnhance && (openRouterApiKey || geminiApiKey)) {
                    try {
                      const responseVton = await fetch(publicUrl);
                      const base64Vton = Buffer.from(await responseVton.arrayBuffer()).toString("base64");
                      const mimeTypeVton = responseVton.headers.get("content-type") || "image/png";

                      const { base64Data: enhancedBase64, mimeType: enhancedMime } = await enhanceImageWithGemini({
                        base64Image: base64Vton, mimeType: mimeTypeVton, prompt, openRouterApiKey, geminiApiKey, generateFor, additionalImageUrls: additionalUrls
                      });

                      const ext = enhancedMime === "image/png" ? "png" : "jpg";
                      const filePath = `${userId}/${genId}_enhanced.${ext}`;
                      const { error: uploadError } = await supabase.storage.from("designs").upload(filePath, Buffer.from(enhancedBase64, "base64"), { contentType: enhancedMime, upsert: true });

                      if (!uploadError) {
                        const { data: { publicUrl: enhancedUrl } } = supabase.storage.from("designs").getPublicUrl(filePath);
                        publicUrl = enhancedUrl;
                      }
                    } catch (e) {
                      console.error("Hybrid enhancement failed:", e);
                    }
                  }

                  // Branding
                  if (branding && (branding.brandLogo || branding.brandName || branding.designNumber)) {
                    try {
                      const finalBuffer = await applyBrandingToUrl(publicUrl, branding);
                      const brandedUrl = await uploadBufferToStorage(supabase, finalBuffer, userId, `replicate_branded_${Date.now()}`, outputFormat, resolution, aspectRatio);
                      if (brandedUrl) publicUrl = brandedUrl;
                    } catch (e) {
                      console.error("Replicate branding failed:", e);
                    }
                  }

                  generatedImageUrl = publicUrl;
                  generationStatus = "done";
                  generationProvider = "replicate";
                  replicateDone = true;
                  break;
                }
              } else if (replicateStatus === "failed" || replicateStatus === "canceled") {
                replicateErrorMsg = "Replicate task failed or cancelled.";
                break;
              }
            }

            if (replicateDone) {
              // Successfully handled in replication loop
            }
          }
        } catch (err: any) {
          replicateErrorMsg = err?.message || String(err);
        }
      }

      // ─── STRATEGY POLLINATIONS FLUX ───
      if (generationStatus !== "done") {
        try {
          let width = 1024; let height = 1024;
          const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
          if (cleanAspectRatio === "9:16") { width = 768; height = 1344; }
          else if (cleanAspectRatio === "16:9") { width = 1344; height = 768; }
          else if (cleanAspectRatio === "4:3") { width = 1024; height = 768; }
          else if (cleanAspectRatio === "3:4") { width = 768; height = 1024; }
          else if (cleanAspectRatio === "4:5") { width = 896; height = 1152; }

          const encodedPrompt = encodeURIComponent(textToImagePrompt || prompt);
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

          const pollinationsRes = await fetch(pollinationsUrl);
          if (pollinationsRes.ok) {
            const base64Data = Buffer.from(await pollinationsRes.arrayBuffer()).toString("base64");
            const publicUrl = await handleFlatLayAndUpload(supabase, base64Data, "image/png", photographyStyle, original_image_url, userId, `pollinations_${Date.now()}`, outputFormat, resolution, aspectRatio);
            if (publicUrl) {
              generatedImageUrl = publicUrl;
              generationStatus = "done";
              generationProvider = "pollinations";
            }
          }
        } catch (err: any) {
          pollinationsErrorMsg = err?.message || String(err);
        }
      }
    }

    // Apply CodeFormer and hybrid branding to other synchronous pipelines
    if (generationStatus === "done" && generatedImageUrl) {
      // CodeFormer
      if (aiPipeline === "multi_garment" && !isMockMode) {
        try {
          const replicateToken = process.env.REPLICATE_API_TOKEN;
          if (replicateToken) {
            const restoredUrl = await restoreFaceWithCodeformer(replicateToken, generatedImageUrl);
            if (restoredUrl) {
              const fetched = await fetchImageAsBase64(restoredUrl);
              if (fetched) {
                const publicUrl = await uploadBase64ToStorage(supabase, fetched.data, fetched.mimeType, userId, `restored_${Date.now()}`, outputFormat, resolution, aspectRatio);
                if (publicUrl) generatedImageUrl = publicUrl;
              }
            }
          }
        } catch (e) {
          console.error("Post-Codeformer restoration failed:", e);
        }
      }

      // Branding (general fallback if not applied in strategies)
      if (branding && (branding.brandLogo || branding.brandName || branding.designNumber)) {
        try {
          const finalBuffer = await applyBrandingToUrl(generatedImageUrl, branding);
          const brandedUrl = await uploadBase64ToStorage(supabase, finalBuffer.toString("base64"), "image/png", userId, `branded_${Date.now()}`, outputFormat, resolution, aspectRatio);
          if (brandedUrl) generatedImageUrl = brandedUrl;
        } catch (e) {
          console.error("Post branding failed:", e);
        }
      }
    }

    if (generationStatus === "done") {
      const { data: finalData } = await supabase
        .from("generations")
        .update({
          status: "done",
          generated_image_url: generatedImageUrl,
          completed_at: new Date().toISOString(),
          model_settings: {
            ...body,
            provider: generationProvider,
            is_mock: isMockMode
          }
        })
        .eq("id", genId)
        .select()
        .single();

      if (finalData) {
        emitSocketUpdate(userId, finalData);
      }
    } else {
      throw new Error("All image generation strategies failed.");
    }

  } catch (error: any) {
    console.error(`[Background-Image Error] failed:`, error);
    
    // Update status to failed
    const { data: finalData } = await supabase
      .from("generations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString()
      })
      .eq("id", genId)
      .select()
      .single();

    if (finalData) {
      emitSocketUpdate(userId, finalData);
    }

    // Refund credit
    if (!isMockMode) {
      const { data: currentCredits } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .single();
      
      if (currentCredits) {
        await supabase
          .from("credits")
          .update({ balance: currentCredits.balance + 1 })
          .eq("user_id", userId);
      }
    }
  }
}

// Server-side Background Video Generation Worker
async function runVideoBackground(
  genId: string,
  userId: string,
  prompt: string,
  body: any
) {
  console.log(`[Background-Video] Starting generation for genId=${genId}, user=${userId}`);
  const supabase = getSupabaseAdmin();
  let isMockMode = body.useMockMode || false;

  const {
    original_image_url,
    additional_designs = {},
    generateFor,
    aiPipeline,
  } = body;

  const videoMode = additional_designs.video_mode || "direct";
  const videoEngine = additional_designs.video_engine || "wan2.1";

  try {
    if (isMockMode) {
      // Mock video generation delay
      await new Promise((r) => setTimeout(r, 8000));
      const mockVideoUrl = "/videos/video1-simple-15.mp4";

      const { data: finalData } = await supabase
        .from("generations")
        .update({
          status: "done",
          generated_image_url: mockVideoUrl,
          completed_at: new Date().toISOString()
        })
        .eq("id", genId)
        .select()
        .single();

      if (finalData) {
        emitSocketUpdate(userId, finalData);
      }
    } else {
      console.log(`Starting video generation pipeline (Engine: ${videoEngine}, Mode: ${videoMode})...`);
      const hfToken = process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined;
      let modelImgUrl = original_image_url;

      // 1. Run VTON if try-on mode
      if (videoMode === "tryon") {
        try {
          let humanImgUrl = body.pose_model_bg;
          if (!humanImgUrl) {
            const videoPoseNum = additional_designs?.video_pose || 1;
            humanImgUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${videoPoseNum}.webp`;
          }

          const kaggleVtonUrl = process.env.KAGGLE_VTON_URL;
          let vtonResultUrl = null;

          if (kaggleVtonUrl) {
            try {
              const client = await Client.connect(kaggleVtonUrl, hfToken ? { token: hfToken } : {});
              const result = await client.predict("/tryon", [
                { background: handle_file(humanImgUrl), layers: [], composite: null },
                handle_file(original_image_url),
                generateFor || "garment",
                true, false, 30, 42
              ]) as any;
              if (result && result.data && result.data[0]) vtonResultUrl = result.data[0].url;
            } catch (kaggleErr) {
              console.error("Kaggle VTON with token failed:", kaggleErr);
              if (hfToken) {
                try {
                  const client = await Client.connect(kaggleVtonUrl);
                  const result = await client.predict("/tryon", [
                    { background: handle_file(humanImgUrl), layers: [], composite: null },
                    handle_file(original_image_url),
                    generateFor || "garment",
                    true, false, 30, 42
                  ]) as any;
                  if (result && result.data && result.data[0]) vtonResultUrl = result.data[0].url;
                } catch (e) {
                  console.error("Kaggle VTON anon failed:", e);
                }
              }
            }
          }

          if (!vtonResultUrl) {
            try {
              const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", hfToken ? { token: hfToken } : {});
              const result = await client.predict(2, [handle_file(humanImgUrl), handle_file(original_image_url), 42, true]) as any;
              if (result && result.data && result.data[0]) vtonResultUrl = result.data[0].url;
            } catch (kolorsErr) {
              console.error("Kwai-Kolors VTON failed:", kolorsErr);
              if (hfToken) {
                try {
                  const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On");
                  const result = await client.predict(2, [handle_file(humanImgUrl), handle_file(original_image_url), 42, true]) as any;
                  if (result && result.data && result.data[0]) vtonResultUrl = result.data[0].url;
                } catch (e) {
                  console.error("Kwai-Kolors VTON anon failed:", e);
                }
              }
            }
          }

          const replicateToken = process.env.REPLICATE_API_TOKEN;
          if (!vtonResultUrl && replicateToken) {
            try {
              vtonResultUrl = await runReplicateVton(original_image_url, humanImgUrl, replicateToken);
            } catch (e) {
              console.error("Replicate IDM-VTON in video pipeline failed:", e);
            }
          }

          if (!vtonResultUrl) {
            const openRouterApiKey = process.env.OPENROUTER_API_KEY;
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (openRouterApiKey || geminiApiKey) {
              try {
                const skinTone = body.skinTone || "Wheatish";
                const modelPose = body.modelPose || "Front Standing";
                const bgStyle = body.backgroundStyle || "Studio";
                const fallbackPrompt = `Generate a photorealistic image of an Indian female model wearing the EXACT garment shown in the attached reference image. The model should have ${skinTone} skin tone, be in a ${modelPose} pose, and stand against a ${bgStyle} background. Full body, head to toe, professional fashion photography. The garment design, colors, patterns, and all textile details MUST match the reference image exactly.`;
                
                if (openRouterApiKey) {
                  const { base64Data, mimeType } = await generateViaOpenRouter(
                    openRouterApiKey, "google/gemini-2.5-flash-image", fallbackPrompt, original_image_url, "3:4", []
                  );
                  const uploadUrl = await uploadBase64ToStorage(supabase, base64Data, mimeType, userId, `${genId}_ai_model`);
                  if (uploadUrl) vtonResultUrl = uploadUrl;
                }
              } catch (e) {
                console.error("AI model fallback failed:", e);
              }
            }
          }

          if (vtonResultUrl) {
            const uploadUrl = await uploadToStorage(supabase, vtonResultUrl, userId, `${genId}_vton_temp`);
            if (uploadUrl) modelImgUrl = uploadUrl;
          }
        } catch (vtonErr) {
          console.error("VTON step failed:", vtonErr);
        }
      }

      // 2. Generate video
      let videoTempUrl = null;
      if (videoEngine === "wan2.1") {
        videoTempUrl = await generateVideoViaWan21(modelImgUrl, prompt || undefined, body.aspectRatio || undefined, hfToken);
      } else {
        videoTempUrl = await generateVideoViaSVD(modelImgUrl, hfToken);
      }

      if (!videoTempUrl) throw new Error(`Video generation via ${videoEngine} failed.`);

      // 3. Upload to designs bucket
      const publicVideoUrl = await uploadVideoToStorage(supabase, videoTempUrl, userId, genId);
      if (!publicVideoUrl) throw new Error("Failed to upload video to storage.");

      // 4. Update status to done
      const { data: finalData } = await supabase
        .from("generations")
        .update({
          status: "done",
          generated_image_url: publicVideoUrl,
          completed_at: new Date().toISOString()
        })
        .eq("id", genId)
        .select()
        .single();

      if (finalData) {
        emitSocketUpdate(userId, finalData);
      }
    }
  } catch (error: any) {
    console.error(`[Background-Video Error] failed:`, error);

    // Update status to failed
    const { data: finalData } = await supabase
      .from("generations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString()
      })
      .eq("id", genId)
      .select()
      .single();

    if (finalData) {
      emitSocketUpdate(userId, finalData);
    }

    // Refund credit
    if (!isMockMode) {
      const { data: currentCredits } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (currentCredits) {
        await supabase
          .from("credits")
          .update({ balance: currentCredits.balance + 1 })
          .eq("user_id", userId);
      }
    }
  }
}

// ─── POST API HANDLER ───
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      generateFor,
      photographyStyle,
      outputFormat,
      aspectRatio,
      resolution,
      modelPose,
      skinTone,
      backgroundStyle,
      sareeColourHint,
      original_image_url,
      pose_model_bg,
      useMockMode,
      aiPipeline = "auto",
      additional_designs = {},
      catalogueOption = "display_rack",
      branding,
      generation_type,
      combine_images,
      background_image,
    } = body;

    if (generation_type === "combine") {
      if (!combine_images || !Array.isArray(combine_images) || combine_images.length < 2) {
        return NextResponse.json(
          { error: "Please upload at least 2 model photos!" },
          { status: 400 }
        );
      }
    } else {
      if (!original_image_url) {
        return NextResponse.json(
          { error: "Please upload your main design first!" },
          { status: 400 }
        );
      }
    }

    let { data: credits, error: creditsErr } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      const { data: newCredits, error: createErr } = await supabase
        .from("credits")
        .insert({ user_id: user.id, balance: 20 })
        .select()
        .single();
      
      if (!createErr && newCredits) {
        credits = newCredits;
        creditsErr = null;
      }
    }

    if (creditsErr || !credits) {
      return NextResponse.json(
        { error: "Failed to fetch credit balance" },
        { status: 500 }
      );
    }

    if (!useMockMode && credits.balance < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    // Deduct credit immediately (if not mock)
    if (!useMockMode) {
      await supabase
        .from("credits")
        .update({ balance: Math.max(0, credits.balance - 1) })
        .eq("user_id", user.id);
    }

    // Build standard prompt logic
    let garmentDescription = `${sareeColourHint || "beautiful"} ${generateFor || "saree"}`;
    if (additional_designs) {
      if (additional_designs.saree_blouse_design) garmentDescription += " and matching blouse";
      if (additional_designs.lehenga_choli_design) garmentDescription += " and matching choli";
      const bottomDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
      if (additional_designs[bottomDesignKey] || additional_designs.dress_bottom_design) {
        garmentDescription = `beautiful full body outfit with ${generateFor} and matching bottom wear`;
      }
    }

    let additionalPromptDetails = "";
    if (additional_designs) {
      if (additional_designs.saree_blouse_design) additionalPromptDetails += `\n- BLOUSE DESIGN: The model should wear a blouse matching the design, pattern, and color shown in the blouse design reference image.`;
      if (additional_designs.saree_dupatta_design || additional_designs.lehenga_dupatta_design || additional_designs.salwar_dupatta_design) {
        additionalPromptDetails += `\n- DUPATTA DESIGN: The model should have a dupatta matching the design, pattern, and color shown in the dupatta design reference image.`;
      }
      if (additional_designs.saree_pallu_design) additionalPromptDetails += `\n- PALLU/DRAPE DESIGN: The pallu/drape of the saree must match the design, patterns, and borders shown in the pallu reference image.`;
      if (additional_designs.lehenga_choli_design) additionalPromptDetails += `\n- CHOLI DESIGN: The model should wear a choli matching the design, pattern, and color shown in the choli design reference image.`;
      
      const bottomDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
      if (additional_designs[bottomDesignKey] || additional_designs.dress_bottom_design) {
        additionalPromptDetails += `\n- BOTTOM WEAR DESIGN: The bottom wear (pants/skirt/salwar) must match the design, style, and pattern shown in the bottom wear design reference image.`;
      }
      if (additional_designs.salwar_back_design || additional_designs.dress_back_design || additional_designs.innerwear_back_design) {
        additionalPromptDetails += `\n- BACK DESIGN: The back design of the garment must match the design and pattern shown in the back design reference image.`;
      }
      if (additional_designs.salwar_sleeve_design) additionalPromptDetails += `\n- SLEEVE DESIGN: The sleeves of the garment must match the design, patterns, and borders shown in the sleeve design reference image.`;
      if (additional_designs.closeup_reference) additionalPromptDetails += `\n- FABRIC & TEXTURE DETAILS: Refer to the close-up design reference image for high-precision details of the embroidery, patterns, weave, and texture of the main garment.`;
      if (additional_designs.colour_matching) additionalPromptDetails += `\n- COLOR MATCHING: Incorporate the color matching options and color coordinates shown in the color matching reference image.`;
    }

    if (pose_model_bg && additional_designs.pose_ref) {
      additionalPromptDetails += `\n- MODEL FACE & IDENTITY: The model in the generated image MUST have the EXACT same face, facial features, hair, skin tone, and body structure as the person in the model reference image.`;
      additionalPromptDetails += `\n- MODEL POSE REFERENCE: The model in the generated image MUST mimic the EXACT pose, posture, and body orientation as the person in the pose reference image.`;
    } else if (pose_model_bg) {
      additionalPromptDetails += `\n- MODEL FACE & IDENTITY: The model in the generated image MUST have the EXACT same face, facial features, hair, skin tone, and body structure as the person in the model reference image.`;
    }

    if (photographyStyle === "model") {
      if (catalogueOption === "display_rack") additionalPromptDetails += `\n- CATALOGUE OPTIONS: Display the matching color options on an elegant display rack/hanger on the side of the main model in the background.`;
      else if (catalogueOption === "multiple_models") additionalPromptDetails += `\n- CATALOGUE OPTIONS: Show multiple models wearing the garment in different matching color options in a professional catalogue lineup.`;
    }

    const isMaleCategory = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
    const isJewelry = (generateFor || "").toLowerCase().trim() === "jewelry";
    const isStole = (generateFor || "").toLowerCase().trim() === "stole";
    const bottomDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
    const hasBottomWear = !!(additional_designs[bottomDesignKey] || additional_designs.dress_bottom_design);
    const modelGender = isMaleCategory ? "Indian man" : "Indian woman";
    const itemNoun = isJewelry ? "jewelry piece" : (isStole ? "stole" : "garment");

    const openingInstruction = hasBottomWear 
      ? `wearing the EXACT ${itemNoun} AND matching bottom wear shown in the attached reference images.`
      : `wearing the EXACT ${itemNoun} shown in the attached image.`;

    const criticalRequirements = hasBottomWear
      ? `- The model MUST be wearing the EXACT same ${itemNoun} AND bottom wear from the reference images — preserve the exact fabric/material patterns, colors, embroidery, borders, and all textile/material details of both pieces with pixel-level accuracy.\n- Do NOT change, simplify, or reinterpret the designs. Reproduce both faithfully.`
      : `- The model MUST be wearing the EXACT same ${itemNoun} from the reference image — preserve the exact fabric/material patterns, colors, embroidery, border design, and all textile/material details with pixel-level accuracy.\n- Do NOT change, simplify, or reinterpret the ${itemNoun} design. Reproduce it faithfully.`;

    const drapeInstruction = isJewelry 
      ? "The jewelry should be styled and worn elegantly on the model (neck, ears, or wrists as appropriate)." 
      : (isStole 
          ? "The stole should be draped elegantly around the model's neck or shoulders." 
          : (hasBottomWear 
              ? "The garment and bottom wear should be styled and worn elegantly as a complete outfit." 
              : "The garment should be draped/worn traditionally and elegantly"));

    let prompt = "";
    if (photographyStyle === "flat_lay") {
      let flatLayDetails = "";
      if (additional_designs && additional_designs.flat_lay_style_ref) {
        flatLayDetails += `\n- FLAT LAY STYLE REFERENCE: Refer to the uploaded flat lay style reference image. The generated image MUST replicate the exact environment, surface type (e.g., wooden table, marble countertop, plain fabric, concrete), studio lighting, shadows, color scheme, and props (like flowers, books, sunglasses, accessories) shown in that style reference image.`;
      }

      prompt = `You are an expert fashion product photographer. Generate a single, highly detailed, photorealistic flat lay product photograph of the ${itemNoun} shown in the main garment reference image.
CRITICAL REQUIREMENTS:
- The ${itemNoun} in the final image MUST have the exact same color, pattern, texture, fabric, and design details as the main garment reference image.
- Do NOT change or simplify the garment design. Re-create it with pixel-level precision.
- Strictly NO human models, faces, skin, hands, feet, or mannequins should be visible in the image. The garment should be laid flat or neatly folded on the surface.
- Place and arrange the garment beautifully at the center or elegantly framed on the surface.${flatLayDetails}
BACKGROUND & ENVIRONMENT:
- Surface/Background: ${backgroundStyle || "Wooden table / Marble surface"}
- Lighting: Professional product photography studio lighting, soft natural shadows.
PHOTOGRAPHY STYLE: Flat lay product photography, high-end e-commerce style.
OUTPUT: A single photorealistic product photograph, sharp focus, clean composition, professional lighting.`;
    } else {
      prompt = `You are a professional fashion photographer AI. Generate a single, high-quality, photorealistic image of an ${isMaleCategory ? "Indian male model" : "Indian female model"} ${openingInstruction}
CRITICAL REQUIREMENTS:
${criticalRequirements}${additionalPromptDetails}
MODEL DETAILS:
- Skin tone: ${skinTone || "Wheatish"} ${modelGender}
- Pose: ${modelPose || "Front Standing"} — full body, head to toe
- Expression: Warm, natural smile with confident posture
GARMENT/ITEM: ${garmentDescription}${hasBottomWear ? " paired with matching bottom wear" : ""}
- Category: ${generateFor || "saree"}
- ${drapeInstruction}
BACKGROUND: ${backgroundStyle || "Luxury Palace / Haveli"}
- Professional studio-quality lighting with soft shadows
PHOTOGRAPHY STYLE: High-end fashion editorial photography, professional model photoshoot
OUTPUT: A single photorealistic fashion photograph, sharp focus, professional lighting, magazine quality.`;
    }

    let textToImagePrompt = "";
    if (photographyStyle === "flat_lay") {
      let flatLayDetails = "";
      if (additional_designs && additional_designs.flat_lay_style_ref) {
        flatLayDetails = ` The surface background, materials, lighting direction, shadows, and surrounding decorative props (like flowers, accessories, books) must match the style shown in the flat lay style reference.`;
      }
      textToImagePrompt = `You are an expert fashion product photographer. Generate a single, highly detailed, photorealistic empty flat lay background surface for displaying clothing.
CRITICAL REQUIREMENTS:
- Strictly generate an EMPTY surface (e.g. table, floor, marble countertop, plain concrete, white studio floor) designed for product display.
- There must be NO clothing, shirts, dresses, kurtas, sarees, pants, or garments of any kind generated on the surface.
- The center area of the surface MUST be clean, flat, empty, and spacious to allow placing products later.
- Place elegant decorative props around the edges/borders of the frame (like flowers, leaves, small accessories, books, sunglasses, hangers) to style the frame beautifully.${flatLayDetails}
BACKGROUND & ENVIRONMENT:
- Surface/Background: ${backgroundStyle || "Wooden table / Marble surface"}
- Lighting: Professional product photography studio lighting, soft natural shadows.
PHOTOGRAPHY STYLE: Top-down flat lay product photography, clean composition, high-end e-commerce style.
OUTPUT: A single photorealistic empty background surface, sharp focus, clean composition, professional lighting.`;
    }

    // ─── DB INSERTION & BACKGROUND WORKER TRIGGER ───
    if (generation_type === "video") {
      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          status: "pending",
          prompt,
          original_image_url,
          generated_image_url: null,
          model_settings: {
            ...body,
            provider: useMockMode ? "mock" : "gradio_svd",
            is_mock: useMockMode || false,
            generation_type: "video"
          }
        })
        .select()
        .single();

      if (genError || !genData) {
        throw new Error("Failed to insert video generation record.");
      }

      // Trigger background video execution (non-blocking)
      runVideoBackground(genData.id, user.id, prompt, body);

      return NextResponse.json(genData);
    } else {
      // Normal Image or Combine Generation
      const { data: genData, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          status: "pending",
          prompt,
          original_image_url: generation_type === "combine" ? combine_images[0] : original_image_url,
          generated_image_url: null,
          model_settings: {
            ...body,
            provider: "pending",
            is_mock: useMockMode || false,
            generation_type: generation_type || "image"
          }
        })
        .select()
        .single();

      if (genError || !genData) {
        throw new Error("Failed to insert image generation record.");
      }

      // Trigger background image execution (non-blocking)
      runImageBackground(genData.id, user.id, prompt, textToImagePrompt, body);

      return NextResponse.json(genData);
    }

  } catch (error: any) {
    console.error("Generate API POST handler error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Keep modules imports resolved dynamically for video pipeline
async function generateVideoViaSVD(modelImgUrl: string, hfToken?: string): Promise<string | null> {
  const { generateVideoViaSVD: originalSVD } = await import("@/utils/ai");
  return originalSVD(modelImgUrl, hfToken as any);
}

async function generateVideoViaWan21(modelImgUrl: string, prompt?: string, aspectRatio?: string, hfToken?: string): Promise<string | null> {
  const { generateVideoViaWan21: originalWan } = await import("@/utils/ai");
  return originalWan(modelImgUrl, prompt, aspectRatio, hfToken as any);
}
