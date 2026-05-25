import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Client, handle_file } from "@gradio/client";

// Helper to upload base64 image to Supabase Storage
async function uploadBase64ToStorage(
  supabase: any,
  base64Data: string,
  mimeType: string,
  userId: string,
  genId: string
) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const filePath = `${userId}/${genId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(filePath, buffer, {
        contentType: mimeType,
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

// Helper to fetch an image URL and convert to base64
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return {
      data: buffer.toString("base64"),
      mimeType: contentType.split(";")[0].trim(),
    };
  } catch (err) {
    console.error("Failed to fetch image as base64:", err);
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
    } = body;

    // Validate main design URL
    if (!original_image_url) {
      return NextResponse.json(
        { error: "Please upload your main design first!" },
        { status: 400 }
      );
    }

    // Retrieve user credits
    const { data: credits, error: creditsErr } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (creditsErr || !credits) {
      return NextResponse.json(
        { error: "Failed to fetch credit balance" },
        { status: 500 }
      );
    }

    if (credits.balance < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    const garmentDescription = `${sareeColourHint || "beautiful"} ${generateFor || "saree"}`;

    // Build a detailed prompt for virtual try-on
    const prompt = `You are a professional fashion photographer AI. Generate a single, high-quality, photorealistic image of an Indian fashion model wearing the EXACT garment shown in the attached image.

CRITICAL REQUIREMENTS:
- The model MUST be wearing the EXACT same garment from the reference image — preserve the exact fabric pattern, colors, embroidery, border design, and all textile details with pixel-level accuracy.
- Do NOT change, simplify, or reinterpret the garment design. Reproduce it faithfully.

MODEL DETAILS:
- Skin tone: ${skinTone || "Wheatish"} Indian woman
- Pose: ${modelPose || "Front Standing"} — full body, head to toe
- Expression: Warm, natural smile with confident posture

GARMENT: ${garmentDescription}
- Category: ${generateFor || "saree"}
- The garment should be draped/worn traditionally and elegantly

BACKGROUND: ${backgroundStyle || "Luxury Palace / Haveli"}
- Professional studio-quality lighting with soft shadows

PHOTOGRAPHY STYLE: ${photographyStyle === "flat_lay" ? "Flat lay product photography on elegant surface" : "High-end fashion editorial photography, professional model photoshoot"}

OUTPUT: A single photorealistic fashion photograph, sharp focus, professional lighting, magazine quality.`;

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

    // ─── STRATEGY KAGGLE: Custom IDM-VTON Pipeline (Primary Free High-Fidelity) ───
    const kaggleVtonUrl = process.env.KAGGLE_VTON_URL;
    if (kaggleVtonUrl && !useMockMode) {
      try {
        console.log("Attempting Custom Kaggle IDM-VTON API generation...");

        const poseMapping: Record<string, number> = {
          "Front Standing": 1, "Left Profile": 2, "Back View": 3,
          "Leaning on Wall": 4, "Seated": 5, "Walking": 6,
          "Close-up Portrait": 7, "Right Profile": 8,
        };
        const poseNum = poseMapping[modelPose] || 1;
        const defaultHumanImgUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${poseNum}.webp`;
        const humanImgUrl = pose_model_bg || defaultHumanImgUrl;

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        const app = await Client.connect(kaggleVtonUrl, hfToken ? { hf_token: hfToken } : {});
        
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
            tempId
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "kaggle_vton";
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
        
        const poseMapping: Record<string, number> = {
          "Front Standing": 1, "Left Profile": 2, "Back View": 3,
          "Leaning on Wall": 4, "Seated": 5, "Walking": 6,
          "Close-up Portrait": 7, "Right Profile": 8,
        };
        const poseNum = poseMapping[modelPose] || 1;
        const defaultHumanImgUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${poseNum}.webp`;
        const humanImgUrl = pose_model_bg || defaultHumanImgUrl;

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        const app = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", hfToken ? { hf_token: hfToken } : {});
        
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
            tempId
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "kolors_vton";
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
            tempId
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
              tempId
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
            tempId
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

    // ─── STRATEGY 1: Gemini API (Free, Primary) ───
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (generationStatus !== "done" && geminiApiKey && !useMockMode) {
      try {
        console.log("Attempting Gemini API generation...");

        // Fetch the uploaded garment image as base64
        const garmentImage = await fetchImageAsBase64(original_image_url);
        if (!garmentImage) {
          throw new Error("Failed to fetch garment image for Gemini");
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const contents = [
          { text: prompt },
          {
            inlineData: {
              mimeType: garmentImage.mimeType,
              data: garmentImage.data,
            },
          },
        ];

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
                tempId
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

        if (generationStatus !== "done") {
          console.warn("Gemini response did not contain an image. Falling back...");
          geminiErrorMsg = "Gemini response did not contain an image part.";
        }
      } catch (err: any) {
        console.error("Gemini API error:", err?.message || err);
        geminiErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY 2: Replicate IDM-VTON (Paid Fallback) ───
    if (generationStatus !== "done" && !useMockMode) {
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (replicateToken) {
        try {
          console.log("Falling back to Replicate API...");

          const poseMapping: Record<string, number> = {
            "Front Standing": 1,
            "Left Profile": 2,
            "Back View": 3,
            "Leaning on Wall": 4,
            "Seated": 5,
            "Walking": 6,
            "Close-up Portrait": 7,
            "Right Profile": 8,
          };
          const poseNum = poseMapping[modelPose] || 1;
          const defaultHumanImgUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${poseNum}.webp`;
          const humanImgUrl = pose_model_bg || defaultHumanImgUrl;

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
                  category: "dresses",
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

    // ─── STRATEGY 2.5: Pollinations AI FLUX (Free Fallback) ───
    if (generationStatus !== "done" && !useMockMode) {
      try {
        console.log("Attempting fallback Pollinations AI FLUX generation...");
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
            tempId
          );

          if (publicUrl) {
            generatedImageUrl = publicUrl;
            generationStatus = "done";
            generationProvider = "pollinations";
            console.log("Pollinations AI fallback generation succeeded!");
          } else {
            pollinationsErrorMsg = "Failed to upload Pollinations image to storage.";
          }
        } else {
          pollinationsErrorMsg = `Pollinations AI HTTP error ${pollinationsRes.status}`;
        }
      } catch (err: any) {
        console.error("Pollinations AI fallback error:", err?.message || err);
        pollinationsErrorMsg = err?.message || String(err);
      }
    }

    // ─── STRATEGY 3: Mock Mode / Error Fallback ───
    if (generationStatus !== "done" && generationStatus !== "processing") {
      // If keys are configured but failed, and we did NOT request mock mode, return errors instead of running silent mock mode
      if (!useMockMode && (togetherApiKey || huggingfaceApiKey || geminiApiKey || process.env.REPLICATE_API_TOKEN || pollinationsErrorMsg)) {
        let errorDetails: string[] = [];
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
      generationStatus = "done";
      generationProvider = "mock";
      generatedImageUrl = original_image_url; // Show original as placeholder
      console.warn("Running in Mock Mode — no AI provider available.");
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
    const { error: creditError } = await supabase
      .from("credits")
      .update({ balance: Math.max(0, credits.balance - 1) })
      .eq("user_id", user.id);

    if (creditError) {
      console.error("Deduct credits failed:", creditError);
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
