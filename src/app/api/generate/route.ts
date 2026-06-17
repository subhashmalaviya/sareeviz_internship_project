import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Client, handle_file } from "@gradio/client";
import { generateViaOpenRouter, enhanceImageWithGemini, fetchImageAsBase64, restoreFaceWithCodeformer, processImageBuffer, generatePosedModel } from "@/utils/ai";
import { applyBrandingToImageBuffer, applyBrandingToUrl } from "@/utils/branding";

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
    } = body;

    // Validate main design URL
    if (!original_image_url) {
      return NextResponse.json(
        { error: "Please upload your main design first!" },
        { status: 400 }
      );
    }

    // Retrieve user credits
    let { data: credits, error: creditsErr } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      // Auto-initialize credits for the user to 20 if it doesn't exist
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

    let garmentDescription = `${sareeColourHint || "beautiful"} ${generateFor || "saree"}`;
    if (additional_designs) {
      if (additional_designs.saree_blouse_design) {
        garmentDescription += " and matching blouse";
      }
      if (additional_designs.lehenga_choli_design) {
        garmentDescription += " and matching choli";
      }
      const bottomDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
      if (additional_designs[bottomDesignKey] || additional_designs.dress_bottom_design) {
        garmentDescription = `beautiful full body outfit with ${generateFor} and matching bottom wear`;
      }
    }

    let additionalPromptDetails = "";
    if (additional_designs) {
      if (additional_designs.saree_blouse_design) {
        additionalPromptDetails += `\n- BLOUSE DESIGN: The model should wear a blouse matching the design, pattern, and color shown in the blouse design reference image.`;
      }
      if (additional_designs.saree_dupatta_design || additional_designs.lehenga_dupatta_design || additional_designs.salwar_dupatta_design) {
        additionalPromptDetails += `\n- DUPATTA DESIGN: The model should have a dupatta matching the design, pattern, and color shown in the dupatta design reference image.`;
      }
      if (additional_designs.saree_pallu_design) {
        additionalPromptDetails += `\n- PALLU/DRAPE DESIGN: The pallu/drape of the saree must match the design, patterns, and borders shown in the pallu reference image.`;
      }
      if (additional_designs.lehenga_choli_design) {
        additionalPromptDetails += `\n- CHOLI DESIGN: The model should wear a choli matching the design, pattern, and color shown in the choli design reference image.`;
      }
      
      const bottomDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
      if (additional_designs[bottomDesignKey] || additional_designs.dress_bottom_design) {
        additionalPromptDetails += `\n- BOTTOM WEAR DESIGN: The bottom wear (pants/skirt/salwar) must match the design, style, and pattern shown in the bottom wear design reference image.`;
      }
      
      if (additional_designs.salwar_back_design || additional_designs.dress_back_design || additional_designs.innerwear_back_design) {
        additionalPromptDetails += `\n- BACK DESIGN: The back design of the garment must match the design and pattern shown in the back design reference image.`;
      }
      if (additional_designs.salwar_sleeve_design) {
        additionalPromptDetails += `\n- SLEEVE DESIGN: The sleeves of the garment must match the design, patterns, and borders shown in the sleeve design reference image.`;
      }
      if (additional_designs.closeup_reference) {
        additionalPromptDetails += `\n- FABRIC & TEXTURE DETAILS: Refer to the close-up design reference image for high-precision details of the embroidery, patterns, weave, and texture of the main garment.`;
      }
      if (additional_designs.colour_matching) {
        additionalPromptDetails += `\n- COLOR MATCHING: Incorporate the color matching options and color coordinates shown in the color matching reference image.`;
      }
    }

    if (pose_model_bg && additional_designs.pose_ref) {
      additionalPromptDetails += `\n- MODEL FACE & IDENTITY: The model in the generated image MUST have the EXACT same face, facial features, hair, skin tone, and body structure as the person in the model reference image.`;
      additionalPromptDetails += `\n- MODEL POSE REFERENCE: The model in the generated image MUST mimic the EXACT pose, posture, and body orientation as the person in the pose reference image.`;
    } else if (pose_model_bg) {
      additionalPromptDetails += `\n- MODEL FACE & IDENTITY: The model in the generated image MUST have the EXACT same face, facial features, hair, skin tone, and body structure as the person in the model reference image.`;
    }

    if (photographyStyle === "model") {
      if (catalogueOption === "display_rack") {
        additionalPromptDetails += `\n- CATALOGUE OPTIONS: Display the matching color options on an elegant display rack/hanger on the side of the main model in the background.`;
      } else if (catalogueOption === "multiple_models") {
        additionalPromptDetails += `\n- CATALOGUE OPTIONS: Show multiple models wearing the garment in different matching color options in a professional catalogue lineup.`;
      }
    }

    const isMaleCategory = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
    const isJewelry = (generateFor || "").toLowerCase().trim() === "jewelry";
    const isStole = (generateFor || "").toLowerCase().trim() === "stole";

    const bottomDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
    const hasBottomWear = !!(additional_designs[bottomDesignKey] || additional_designs.dress_bottom_design);

    const modelGender = isMaleCategory ? "Indian man" : "Indian woman";
    const itemNoun = isJewelry ? "jewelry piece" : (isStole ? "stole" : "garment");

    // Dynamic prompt phrasing based on presence of bottom wear
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

    // Build a detailed prompt for virtual try-on
    const prompt = `You are a professional fashion photographer AI. Generate a single, high-quality, photorealistic image of an ${isMaleCategory ? "Indian male model" : "Indian female model"} ${openingInstruction}

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

PHOTOGRAPHY STYLE: ${photographyStyle === "flat_lay" ? "Flat lay product photography on elegant surface" : "High-end fashion editorial photography, professional model photoshoot"}

OUTPUT: A single photorealistic fashion photograph, sharp focus, professional lighting, magazine quality.`;

    if (generation_type === "video") {
      const videoMode = additional_designs.video_mode || "direct";
      const videoEngine = additional_designs.video_engine || "wan2.1";

      if (useMockMode) {
        // Record mock video generation
        const { data: genData, error: genError } = await supabase
          .from("generations")
          .insert({
            user_id: user.id,
            status: "pending",
            prompt: prompt,
            original_image_url: original_image_url,
            generated_image_url: null,
            model_settings: {
              generateFor,
              photographyStyle,
              outputFormat,
              aspectRatio,
              resolution,
              modelPose,
              skinTone,
              backgroundStyle,
              sareeColourHint,
              provider: "mock",
              is_mock: true,
              aiPipeline,
              additional_designs,
              catalogueOption,
              branding: branding || null,
              generation_type: "video",
              pose_model_bg: pose_model_bg || null,
              video_mode: videoMode,
              video_engine: videoEngine,
            },
          })
          .select()
          .single();

        if (genError || !genData) {
          console.error("Database insert failed:", genError);
          return NextResponse.json(
            { error: "Failed to record generation in database" },
            { status: 500 }
          );
        }

        return NextResponse.json(genData);
      } else {
        // Record real video generation
        const { data: genData, error: genError } = await supabase
          .from("generations")
          .insert({
            user_id: user.id,
            status: "processing",
            prompt: prompt,
            original_image_url: original_image_url,
            generated_image_url: null,
            model_settings: {
              generateFor,
              photographyStyle,
              outputFormat,
              aspectRatio,
              resolution,
              modelPose,
              skinTone,
              backgroundStyle,
              sareeColourHint,
              provider: "gradio_svd",
              is_mock: false,
              aiPipeline,
              additional_designs,
              catalogueOption,
              branding: branding || null,
              generation_type: "video",
              pose_model_bg: pose_model_bg || null,
              video_mode: videoMode,
              video_engine: videoEngine,
            },
          })
          .select()
          .single();

        if (genError || !genData) {
          console.error("Database insert failed:", genError);
          return NextResponse.json(
            { error: "Failed to record generation in database" },
            { status: 500 }
          );
        }

        // Deduct 1 credit securely for starting video generation
        await supabase
          .from("credits")
          .update({ balance: Math.max(0, credits.balance - 1) })
          .eq("user_id", user.id);

        return NextResponse.json(genData);
      }
    }

    let generatedImageUrl = "";
    let generationStatus = "failed";
    let generationProvider = "mock";
    let isMockMode = false;
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

    // ─── STRATEGY OPENROUTER: Direct OpenRouter generation ───
    const additionalUrls = additional_designs 
      ? Object.entries(additional_designs)
          .filter(([key, val]) => val && typeof val === "string" && val.startsWith("http") && key !== `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`)
          .map(([_, val]) => val as string)
      : [];

    const isDirectOpenRouter = ["openrouter_gemini", "openrouter_flux_pro", "openrouter_flux_flex"].includes(aiPipeline);
    if (generationStatus !== "done" && isDirectOpenRouter && !useMockMode && openRouterApiKey) {
      try {
        console.log(`Attempting Direct OpenRouter generation with pipeline: ${aiPipeline}...`);
        let model = "google/gemini-2.5-flash-image";
        if (aiPipeline === "openrouter_flux_pro") {
          model = "black-forest-labs/flux-2-pro";
        } else if (aiPipeline === "openrouter_flux_flex") {
          model = "black-forest-labs/flux-2-flex";
        }

        const { base64Data, mimeType } = await generateViaOpenRouter(
          openRouterApiKey,
          model,
          prompt,
          original_image_url,
          aspectRatio,
          additionalUrls
        );

        const tempId = `openrouter_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const publicUrl = await uploadBase64ToStorage(
          supabase,
          base64Data,
          mimeType,
          user.id,
          tempId,
          outputFormat,
          resolution,
          aspectRatio
        );

        if (publicUrl) {
          generatedImageUrl = publicUrl;
          generationStatus = "done";
          generationProvider = `openrouter_${model.split("/")[1] || model}`;
          console.log(`Direct OpenRouter generation succeeded!`);
        } else {
          openrouterErrorMsg = "Failed to upload OpenRouter image to storage.";
        }
      } catch (err: any) {
        console.error("Direct OpenRouter generation error:", err?.message || err);
        openrouterErrorMsg = err?.message || String(err);
      }
    }

    // ─── RESOLVE POSE REFERENCE IMAGE ───
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
        const base64Data = buffer.toString("base64");
        const extType = humanImgUrl.endsWith(".png") ? "image/png" : "image/webp";
        const tempId = `temp_pose_${Date.now()}`;
        const publicUrl = await uploadBase64ToStorage(supabase, base64Data, extType, user.id, tempId);
        if (publicUrl) {
          humanImgUrl = publicUrl;
          console.log("Uploaded local pose image to Supabase for VTON:", humanImgUrl);
        }
      } catch (e) {
        console.error("Failed to upload local pose image:", e);
        humanImgUrl = defaultHumanImgUrl;
      }
    }

    // Resolve relative URLs for pose_model_bg and additional_designs.pose_ref if they start with "/"
    let resolvedPoseModelBg = pose_model_bg;
    if (resolvedPoseModelBg && resolvedPoseModelBg.startsWith("/")) {
      try {
        const fs = require("fs");
        const path = require("path");
        const filePath = path.join(process.cwd(), "public", resolvedPoseModelBg);
        const buffer = fs.readFileSync(filePath);
        const base64Data = buffer.toString("base64");
        const extType = resolvedPoseModelBg.endsWith(".png") ? "image/png" : "image/webp";
        const tempId = `temp_model_${Date.now()}`;
        const publicUrl = await uploadBase64ToStorage(supabase, base64Data, extType, user.id, tempId);
        if (publicUrl) {
          resolvedPoseModelBg = publicUrl;
          console.log("Uploaded local pose_model_bg image to Supabase:", resolvedPoseModelBg);
        }
      } catch (e) {
        console.error("Failed to upload local pose_model_bg image:", e);
      }
    }

    let resolvedPoseRef = additional_designs.pose_ref || defaultHumanImgUrl;
    if (resolvedPoseRef && resolvedPoseRef.startsWith("/")) {
      try {
        const fs = require("fs");
        const path = require("path");
        const filePath = path.join(process.cwd(), "public", resolvedPoseRef);
        const buffer = fs.readFileSync(filePath);
        const base64Data = buffer.toString("base64");
        const extType = resolvedPoseRef.endsWith(".png") ? "image/png" : "image/webp";
        const tempId = `temp_poseref_${Date.now()}`;
        const publicUrl = await uploadBase64ToStorage(supabase, base64Data, extType, user.id, tempId);
        if (publicUrl) {
          resolvedPoseRef = publicUrl;
          console.log("Uploaded local pose_ref image to Supabase:", resolvedPoseRef);
        }
      } catch (e) {
        console.error("Failed to upload local pose_ref image:", e);
      }
    }

    // If model face/image is provided, generate a posed model first using the pose reference (either uploaded or selected default pose)
    if (resolvedPoseModelBg && !useMockMode) {
      try {
        console.log("Generating posed model first with face/identity from resolvedPoseModelBg and pose from resolvedPoseRef...");
        const posedModelUrl = await generatePosedModel({
          modelUrl: resolvedPoseModelBg,
          poseUrl: resolvedPoseRef,
          userId: user.id,
          isMale: isMaleCategoryForPose,
          geminiApiKey,
          openRouterApiKey,
          supabase
        });
        if (posedModelUrl) {
          humanImgUrl = posedModelUrl;
          console.log("Generated posed model image successfully:", humanImgUrl);
        }
      } catch (err) {
        console.error("Failed to generate posed model image:", err);
      }
    }

    // ─── STRATEGY KAGGLE: Custom IDM-VTON Pipeline (Primary Free High-Fidelity) ───
    const kaggleVtonUrl = process.env.KAGGLE_VTON_URL;
    if (kaggleVtonUrl && !useMockMode) {
      try {
        console.log("Attempting Custom Kaggle IDM-VTON API generation...");

        const hfToken = process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined;
        const app = await Client.connect(kaggleVtonUrl, hfToken ? { token: hfToken } : {});
        
        const result = await app.predict("/tryon", [
          { background: handle_file(humanImgUrl), layers: [], composite: null },
          handle_file(original_image_url),
          garmentDescription,
          true,  // is_checked
          false, // is_checked_crop
          30,    // denoise_steps
          42,    // seed
        ]) as any;

        if (result && result.data && result.data[0]) {
          const generatedImageUrlFromGradio = result.data[0].url;

          // Fetch the generated image from Kaggle Gradio server
          const genRes = await fetch(generatedImageUrlFromGradio);
          const genArrayBuffer = await genRes.arrayBuffer();
          const base64Data = Buffer.from(genArrayBuffer).toString("base64");
          
          const tempId = `kaggle_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const publicUrl = await uploadBase64ToStorage(
            supabase,
            base64Data,
            "image/png",
            user.id,
            tempId,
            outputFormat,
            resolution,
            aspectRatio
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "kaggle_vton";
            vtonBase64 = base64Data;
            vtonMime = "image/png";
            console.log("Kaggle IDM-VTON generation succeeded!");
          } else {
            kaggleErrorMsg = "Failed to upload Kaggle image to storage.";
          }
        } else {
          kaggleErrorMsg = "No image data returned from Kaggle Gradio API.";
        }
      } catch (err: any) {
        console.error("Kaggle VTON error:", err?.message || err);
        kaggleErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY KOLORS: Kwai-Kolors Virtual Try-On (Secondary Free High-Fidelity) ───
    if (generationStatus !== "done" && !useMockMode) {
      try {
        console.log("Attempting Kwai-Kolors Virtual Try-On API generation...");

        const hfToken = process.env.HUGGINGFACE_API_KEY as `hf_${string}` | undefined;
        const app = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", hfToken ? { token: hfToken } : {});
        
        const result = await app.predict(2, [
          handle_file(humanImgUrl),
          handle_file(original_image_url),
          42,   // seed
          true, // random seed
        ]) as any;

        if (result && result.data && result.data[0]) {
          const generatedImageUrlFromGradio = result.data[0].url;

          // Fetch the generated image from Kwai-Kolors server
          const genRes = await fetch(generatedImageUrlFromGradio);
          const genArrayBuffer = await genRes.arrayBuffer();
          const base64Data = Buffer.from(genArrayBuffer).toString("base64");
          
          const tempId = `kolors_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const publicUrl = await uploadBase64ToStorage(
            supabase,
            base64Data,
            "image/png",
            user.id,
            tempId,
            outputFormat,
            resolution,
            aspectRatio
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "kolors_vton";
            vtonBase64 = base64Data;
            vtonMime = "image/png";
            console.log("Kwai-Kolors Virtual Try-On generation succeeded!");
          } else {
            console.error("Failed to upload Kwai-Kolors image to storage.");
          }
        } else {
          console.error("No image data returned from Kwai-Kolors Gradio API.");
        }
      } catch (err: any) {
        console.error("Kwai-Kolors VTON error:", err?.message || err);
      }
    }

    // ─── HYBRID PIPELINE STEP 2: Gemini Face/Background Refinement ───
    const mainDesignKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
    const hasAdditionalClothing = additional_designs 
      ? Object.entries(additional_designs).some(([key, val]) => 
          val && typeof val === "string" && val.startsWith("http") && key !== mainDesignKey
        )
      : false;
    const shouldEnhance = aiPipeline === "hybrid" || (aiPipeline === "auto" && hasAdditionalClothing);

    if (generationStatus === "done" && shouldEnhance && (openRouterApiKey || geminiApiKey) && vtonBase64) {
      try {
        console.log("VTON completed. Triggering Hybrid Step 2: Gemini Face/BG Enhancement...");
        const { base64Data: enhancedBase64, mimeType: enhancedMime } = await enhanceImageWithGemini({
          base64Image: vtonBase64,
          mimeType: vtonMime || "image/png",
          prompt: prompt,
          openRouterApiKey,
          geminiApiKey,
          generateFor: generateFor,
          additionalImageUrls: additionalUrls
        });

        const tempId = `enhanced_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const publicUrl = await uploadBase64ToStorage(
          supabase,
          enhancedBase64,
          enhancedMime,
          user.id,
          tempId,
          outputFormat,
          resolution,
          aspectRatio
        );

        if (publicUrl) {
          generatedImageUrl = publicUrl;
          generationProvider = `${generationProvider}_enhanced`;
          console.log("Hybrid enhancement step succeeded!");
        }
      } catch (err: any) {
        console.error("Hybrid enhancement step failed, using base VTON output:", err);
      }
    }

    // ─── FACE RESTORATION STEP: CodeFormer for Multi-Garment Try-On ───
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (generationStatus === "done" && aiPipeline === "multi_garment" && replicateToken && generatedImageUrl) {
      try {
        console.log("Multi-Garment pipeline: running CodeFormer face restoration...");
        const restoredUrl = await restoreFaceWithCodeformer(replicateToken, generatedImageUrl);
        if (restoredUrl) {
          const fetched = await fetchImageAsBase64(restoredUrl);
          if (fetched) {
            const publicUrl = await uploadBase64ToStorage(
              supabase,
              fetched.data,
              fetched.mimeType,
              user.id,
              `restored_${Date.now()}`,
              outputFormat,
              resolution,
              aspectRatio
            );
            if (publicUrl) {
              generatedImageUrl = publicUrl;
              console.log("CodeFormer face restoration succeeded! Image uploaded:", publicUrl);
            }
          }
        }
      } catch (err) {
        console.error("CodeFormer face restoration failed:", err);
      }
    }

    // ─── STRATEGY 0: Pollinations AI FLUX (Free, Keyless Primary) ───
    const forcePollinations = process.env.USE_POLLINATIONS === "true";
    if (generationStatus !== "done" && forcePollinations && !useMockMode) {
      try {
        console.log("Attempting primary Pollinations AI FLUX generation...");
        let width = 1024;
        let height = 1024;
        const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
        
        if (cleanAspectRatio === "9:16") {
          width = 768;
          height = 1344;
        } else if (cleanAspectRatio === "16:9") {
          width = 1344;
          height = 768;
        } else if (cleanAspectRatio === "4:3") {
          width = 1024;
          height = 768;
        } else if (cleanAspectRatio === "3:4") {
          width = 768;
          height = 1024;
        } else if (cleanAspectRatio === "4:5") {
          width = 896;
          height = 1152;
        }

        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=${width}&height=${height}&seed=${seed}&nologo=true`;

        const pollinationsRes = await fetch(pollinationsUrl);
        if (pollinationsRes.ok) {
          const arrayBuffer = await pollinationsRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          const tempId = `pollinations_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          const publicUrl = await uploadBase64ToStorage(
            supabase,
            base64Data,
            "image/png",
            user.id,
            tempId,
            outputFormat,
            resolution,
            aspectRatio
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "pollinations";
            console.log("Primary Pollinations AI generation succeeded!");
          } else {
            pollinationsErrorMsg = "Failed to upload Pollinations image to storage.";
          }
        } else {
          pollinationsErrorMsg = `Pollinations AI HTTP error ${pollinationsRes.status}`;
        }
      } catch (err: any) {
        console.error("Primary Pollinations AI error:", err?.message || err);
        pollinationsErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY 0.5: Together AI (FLUX.1 Dev) ───
    const togetherApiKey = process.env.TOGETHER_API_KEY;
    if (generationStatus !== "done" && togetherApiKey && !useMockMode) {
      try {
        console.log("Attempting Together AI FLUX.1 Dev generation...");

        // Parse aspect ratio into width/height for Together AI FLUX.1 Dev
        let width = 1024;
        let height = 1024;
        const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
        
        if (cleanAspectRatio === "9:16") {
          width = 768;
          height = 1344;
        } else if (cleanAspectRatio === "16:9") {
          width = 1344;
          height = 768;
        } else if (cleanAspectRatio === "4:3") {
          width = 1024;
          height = 768;
        } else if (cleanAspectRatio === "3:4") {
          width = 768;
          height = 1024;
        } else if (cleanAspectRatio === "4:5") {
          width = 896;
          height = 1152;
        }

        const togetherResponse = await fetch("https://api.together.xyz/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${togetherApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "black-forest-labs/FLUX.1-dev",
            prompt: prompt,
            width: width,
            height: height,
            steps: 28,
            n: 1,
            response_format: "b64_json",
          }),
        });

        if (togetherResponse.ok) {
          const togetherData = await togetherResponse.json();
          if (togetherData.data && togetherData.data[0]?.b64_json) {
            const base64Data = togetherData.data[0].b64_json;
            const tempId = `together_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

            // Upload to Supabase storage
            const publicUrl = await uploadBase64ToStorage(
              supabase,
              base64Data,
              "image/png",
              user.id,
              tempId,
              outputFormat,
              resolution,
              aspectRatio
            );

            if (publicUrl) {
              generatedImageUrl = publicUrl;
              generationStatus = "done";
              generationProvider = "together";
              console.log("Together AI generation succeeded!");
            }
          } else {
            togetherErrorMsg = "Together AI response did not contain image data.";
          }
        } else {
          const errText = await togetherResponse.text();
          console.error("Together AI API failed:", errText);
          togetherErrorMsg = errText || `HTTP ${togetherResponse.status}`;
        }
      } catch (err: any) {
        console.error("Together AI API error:", err?.message || err);
        togetherErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY 0.8: Hugging Face Serverless API (Free) ───
    const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    if (generationStatus !== "done" && huggingfaceApiKey && !useMockMode) {
      try {
        console.log("Attempting Hugging Face Serverless FLUX.1 Dev generation...");

        let width = 1024;
        let height = 1024;
        const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
        
        if (cleanAspectRatio === "9:16") { width = 768; height = 1344; } 
        else if (cleanAspectRatio === "16:9") { width = 1344; height = 768; } 
        else if (cleanAspectRatio === "4:3") { width = 1024; height = 768; } 
        else if (cleanAspectRatio === "3:4") { width = 768; height = 1024; } 
        else if (cleanAspectRatio === "4:5") { width = 896; height = 1152; }

        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
          {
            headers: {
              Authorization: `Bearer ${huggingfaceApiKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              inputs: prompt,
              parameters: { width, height },
            }),
          }
        );

        if (hfResponse.ok) {
          const arrayBuffer = await hfResponse.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          const tempId = `hf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          const publicUrl = await uploadBase64ToStorage(
            supabase,
            base64Data,
            "image/jpeg",
            user.id,
            tempId,
            outputFormat,
            resolution,
            aspectRatio
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "huggingface";
            console.log("Hugging Face generation succeeded!");
          } else {
            huggingfaceErrorMsg = "Failed to upload Hugging Face image to storage.";
          }
        } else {
          const errText = await hfResponse.text();
          console.error("Hugging Face API failed:", errText);
          huggingfaceErrorMsg = errText || `HTTP ${hfResponse.status}`;
        }
      } catch (err: any) {
        console.error("Hugging Face API error:", err?.message || err);
        huggingfaceErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY 1: Gemini API (Free, Primary) or OpenRouter Gemini fallback ───
    if (generationStatus !== "done" && !useMockMode && (geminiApiKey || openRouterApiKey)) {
      try {
        if (geminiApiKey) {
          console.log("Attempting direct Gemini API generation...");

          // Fetch the uploaded garment image as base64
          const garmentImage = await fetchImageAsBase64(original_image_url);
          if (!garmentImage) {
            throw new Error("Failed to fetch garment image for Gemini");
          }

          const ai = new GoogleGenAI({ apiKey: geminiApiKey });

          const contents: any[] = [
            { text: prompt },
            {
              inlineData: {
                mimeType: garmentImage.mimeType,
                data: garmentImage.data,
              },
            },
          ];

          // Fetch and append all other supplementary design images to contents for multi-modal context
          if (additional_designs) {
            for (const [key, value] of Object.entries(additional_designs)) {
              if (value && typeof value === "string" && value.startsWith("http") && key !== `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`) {
                try {
                  console.log(`Fetching additional design image [${key}] for Gemini input: ${value}`);
                  const img = await fetchImageAsBase64(value);
                  if (img) {
                    contents.push({
                      inlineData: {
                        mimeType: img.mimeType,
                        data: img.data
                      }
                    });
                  }
                } catch (e) {
                  console.error(`Failed to fetch additional design image [${key}] for Gemini:`, e);
                }
              }
            }
          }

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: contents,
            config: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          });

          // Extract the generated image from the response
          if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                // We got an image back from Gemini!
                const mimeType = part.inlineData.mimeType || "image/png";

                // Generate a temporary ID for storage
                const tempId = `gemini_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

                // Upload to Supabase storage
                const publicUrl = await uploadBase64ToStorage(
                  supabase,
                  part.inlineData.data,
                  mimeType,
                  user.id,
                  tempId,
                  outputFormat,
                  resolution,
                  aspectRatio
                );

                if (publicUrl) {
                  generatedImageUrl = publicUrl;
                  generationStatus = "done";
                  generationProvider = "gemini";
                  console.log("Gemini generation succeeded!");
                }
                break; // Use the first image
              }
            }
          }
        }

        // If direct Gemini wasn't attempted or failed, and OpenRouter is available, try OpenRouter Gemini
        if (generationStatus !== "done" && openRouterApiKey) {
          console.log("Attempting OpenRouter Gemini generation as fallback...");
          const { base64Data, mimeType } = await generateViaOpenRouter(
            openRouterApiKey,
            "google/gemini-2.5-flash-image",
            prompt,
            original_image_url,
            aspectRatio,
            additionalUrls
          );

          const tempId = `gemini_or_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const publicUrl = await uploadBase64ToStorage(
            supabase,
            base64Data,
            mimeType,
            user.id,
            tempId,
            outputFormat,
            resolution,
            aspectRatio
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "openrouter_gemini";
            console.log("OpenRouter Gemini generation succeeded!");
          }
        }

        if (generationStatus !== "done") {
          console.warn("Gemini/OpenRouter response did not contain an image. Falling back...");
          geminiErrorMsg = "Gemini/OpenRouter response did not contain an image part.";
        }
      } catch (err: any) {
        console.error("Gemini/OpenRouter API error:", err?.message || err);
        geminiErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY 2: Replicate IDM-VTON (Paid Fallback) ───
    if (generationStatus !== "done" && !useMockMode) {
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (replicateToken) {
        try {
          console.log("Falling back to Replicate API...");

          const getVtonCategory = (cat: string): string => {
            const normalized = (cat || "").toLowerCase().trim();
            if (normalized.includes("saree") || normalized.includes("lehenga") || normalized.includes("suit") || normalized.includes("dress") || normalized.includes("kurta") || normalized.includes("kurti")) {
              return "dresses";
            }
            if (normalized.includes("bottom") || normalized.includes("skirt") || normalized.includes("pants") || normalized.includes("salwar")) {
              return "bottoms";
            }
            return "tops";
          };
          const vtonCategory = getVtonCategory(generateFor);

          const response = await fetch(
            "https://api.replicate.com/v1/predictions",
            {
              method: "POST",
              headers: {
                Authorization: `Token ${replicateToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                version:
                  "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
                input: {
                  garm_img: original_image_url,
                  human_img: humanImgUrl,
                  garment_des: garmentDescription,
                  category: vtonCategory,
                  crop: false,
                  steps: 30,
                },
              }),
            }
          );

          if (response.ok) {
            const prediction = await response.json();
            generationProvider = "replicate";
            generationStatus = "processing";

            // Record the generation with replicate_id for polling
            const { data: genData, error: genError } = await supabase
              .from("generations")
              .insert({
                user_id: user.id,
                status: "processing",
                prompt: prompt,
                original_image_url: original_image_url,
                model_settings: {
                  generateFor,
                  photographyStyle,
                  outputFormat,
                  aspectRatio,
                  resolution,
                  modelPose,
                  skinTone,
                  backgroundStyle,
                  sareeColourHint,
                  replicate_id: prediction.id,
                  provider: "replicate",
                  is_mock: false,
                  aiPipeline,
                  additional_designs,
                  catalogueOption,
                  branding: branding || null,
                },
              })
              .select()
              .single();

            if (genError || !genData) {
              console.error("Database insert failed:", genError);
              return NextResponse.json(
                { error: "Failed to record generation in database" },
                { status: 500 }
              );
            }

            // Deduct 1 credit
            await supabase
              .from("credits")
              .update({ balance: Math.max(0, credits.balance - 1) })
              .eq("user_id", user.id);

            return NextResponse.json(genData);
          } else {
            const errText = await response.text();
            console.error("Replicate API failed:", errText);
            replicateErrorMsg = errText || `HTTP ${response.status}`;
          }
        } catch (err: any) {
          console.error("Replicate error:", err);
          replicateErrorMsg = err?.message || String(err);
        }
      }
    }

    // ─── STRATEGY 3: Mock Mode / Error Fallback ───
    if (generationStatus !== "done" && generationStatus !== "processing") {
      // If keys are configured but failed, and we did NOT request mock mode, return errors instead of running silent mock mode
      if (!useMockMode && (togetherApiKey || huggingfaceApiKey || geminiApiKey || process.env.REPLICATE_API_TOKEN || kaggleErrorMsg || openrouterErrorMsg)) {
        let errorDetails: string[] = [];
        if (openrouterErrorMsg) {
          errorDetails.push(`OpenRouter: ${openrouterErrorMsg}`);
        }
        if (togetherApiKey && togetherErrorMsg) {
          let cleanTogether = togetherErrorMsg;
          try {
            const parsed = JSON.parse(togetherErrorMsg);
            cleanTogether = parsed.error?.message || togetherErrorMsg;
          } catch(e) {}
          errorDetails.push(`Together AI: ${cleanTogether}`);
        }
        if (huggingfaceApiKey && huggingfaceErrorMsg) {
          let cleanHF = huggingfaceErrorMsg;
          try {
            const parsed = JSON.parse(huggingfaceErrorMsg);
            cleanHF = parsed.error || huggingfaceErrorMsg;
          } catch(e) {}
          errorDetails.push(`Hugging Face: ${cleanHF}`);
        }
        if (geminiApiKey && geminiErrorMsg) {
          // Clean up common long JSON errors for nicer display
          let cleanGemini = geminiErrorMsg;
          try {
            const parsed = JSON.parse(geminiErrorMsg);
            cleanGemini = parsed.error?.message || geminiErrorMsg;
          } catch(e) {}
          errorDetails.push(`Gemini: ${cleanGemini}`);
        }
        if (process.env.REPLICATE_API_TOKEN && replicateErrorMsg) {
          let cleanReplicate = replicateErrorMsg;
          try {
            const parsed = JSON.parse(replicateErrorMsg);
            cleanReplicate = parsed.detail || parsed.message || replicateErrorMsg;
          } catch(e) {}
          errorDetails.push(`Replicate: ${cleanReplicate}`);
        }
        if (pollinationsErrorMsg) {
          errorDetails.push(`Pollinations AI: ${pollinationsErrorMsg}`);
        }

        const combinedError = errorDetails.join(" | ");
        return NextResponse.json(
          { 
            error: combinedError || "API generation failed.", 
            errorCode: "APIS_FAILED",
            details: { together: togetherErrorMsg, huggingface: huggingfaceErrorMsg, gemini: geminiErrorMsg, replicate: replicateErrorMsg, pollinations: pollinationsErrorMsg }
          },
          { status: 400 }
        );
      }

      isMockMode = true;
      generationStatus = "pending";
      generationProvider = "mock";
      generatedImageUrl = ""; // Keep empty; status polling will resolve it to original_image_url
      console.warn("Running in Mock Mode — no AI provider available.");
    }

    // Apply branding to final synchronous generations
    if (
      generationStatus === "done" &&
      generatedImageUrl &&
      branding &&
      (branding.brandLogo || branding.brandName || branding.designNumber)
    ) {
      try {
        console.log("Applying branding to final synchronous image:", generatedImageUrl);
        const brandedBuffer = await applyBrandingToUrl(generatedImageUrl, branding);
        const tempId = `branded_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        const brandedUrl = await uploadBase64ToStorage(
          supabase,
          brandedBuffer.toString("base64"),
          "image/png",
          user.id,
          tempId,
          outputFormat,
          resolution,
          aspectRatio
        );

        if (brandedUrl) {
          generatedImageUrl = brandedUrl;
          console.log("Branded image uploaded successfully:", brandedUrl);
        }
      } catch (err) {
        console.error("Failed to apply branding to synchronous generation:", err);
      }
    }

    // Record the generation in Supabase (for Gemini or Mock — Replicate returns above)
    const { data: genData, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        status: generationStatus,
        prompt: prompt,
        original_image_url: original_image_url,
        generated_image_url: generatedImageUrl || null,
        completed_at:
          generationStatus === "done" ? new Date().toISOString() : null,
        model_settings: {
          generateFor,
          photographyStyle,
          outputFormat,
          aspectRatio,
          resolution,
          modelPose,
          skinTone,
          backgroundStyle,
          sareeColourHint,
          provider: generationProvider,
          is_mock: isMockMode,
          aiPipeline,
          additional_designs,
          catalogueOption,
          branding: branding || null,
        },
      })
      .select()
      .single();

    if (genError || !genData) {
      console.error("Database insert failed:", genError);
      return NextResponse.json(
        { error: "Failed to record generation in database" },
        { status: 500 }
      );
    }

    // Deduct 1 credit securely
    if (!isMockMode) {
      const { error: creditError } = await supabase
        .from("credits")
        .update({ balance: Math.max(0, credits.balance - 1) })
        .eq("user_id", user.id);

      if (creditError) {
        console.error("Deduct credits failed:", creditError);
      }
    }

    return NextResponse.json(genData);
  } catch (error: any) {
    console.error("Generate API internal error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
