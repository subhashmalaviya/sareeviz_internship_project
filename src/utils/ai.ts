import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { Client, handle_file } from "@gradio/client";

// Helper to fetch an image URL and convert to base64
export async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
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

// Helper to call OpenRouter for image generation or editing
export async function generateViaOpenRouter(
  openRouterApiKey: string,
  model: string,
  prompt: string,
  imageUrl: string | null,
  aspectRatio?: string,
  additionalImageUrls?: string[]
) {
  let width = 1024;
  let height = 1024;
  const cleanAspectRatio = aspectRatio ? aspectRatio.split(" ")[0].trim() : "1:1";
  
  if (cleanAspectRatio === "9:16") { width = 768; height = 1344; } 
  else if (cleanAspectRatio === "16:9") { width = 1344; height = 768; } 
  else if (cleanAspectRatio === "4:3") { width = 1024; height = 768; } 
  else if (cleanAspectRatio === "3:4") { width = 768; height = 1024; } 
  else if (cleanAspectRatio === "4:5") { width = 896; height = 1152; }

  const contentArray: any[] = [{ type: "text", text: prompt }];
  if (imageUrl) {
    contentArray.push({
      type: "image_url",
      image_url: {
        url: imageUrl
      }
    });
  }

  if (additionalImageUrls && additionalImageUrls.length > 0) {
    for (const url of additionalImageUrls) {
      if (url) {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: url
          }
        });
      }
    }
  }

  console.log(`OpenRouter API Call: model=${model}, aspectRatio=${cleanAspectRatio}`);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sareeviz.ai",
      "X-Title": "SareeViz",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: contentArray
        }
      ],
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: cleanAspectRatio,
        image_size: "1K"
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `HTTP ${response.status}`);
  }

  const resJson = await response.json();
  const imageObj = resJson.choices?.[0]?.message?.images?.[0];
  if (!imageObj || !imageObj.image_url?.url) {
    console.error("OpenRouter response without images array:", JSON.stringify(resJson));
    throw new Error("No image data returned from OpenRouter response");
  }

  const base64Url = imageObj.image_url.url;
  const base64Data = base64Url.split(",")[1] || base64Url;
  const mimeType = base64Url.split(";")[0]?.split(":")[1] || "image/png";

  return { base64Data, mimeType };
}

// Helper to enhance VTON image (face/background) using Gemini (either via OpenRouter or direct Google GenAI SDK)
export async function enhanceImageWithGemini({
  base64Image,
  mimeType,
  prompt,
  openRouterApiKey,
  geminiApiKey,
  generateFor = "saree",
  additionalImageUrls = []
}: {
  base64Image: string;
  mimeType: string;
  prompt: string;
  openRouterApiKey?: string;
  geminiApiKey?: string;
  generateFor?: string;
  additionalImageUrls?: string[];
}) {
  const isMaleCategory = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
  const isJewelry = (generateFor || "").toLowerCase().trim() === "jewelry";
  const itemNoun = isJewelry ? "jewelry piece" : "clothing/garment";
  const modelGenderText = isMaleCategory ? "handsome Indian male model" : "beautiful Indian female model";

  const enhancePrompt = `You are a professional fashion image editor. Refine and enhance this fashion model try-on photo based on this prompt: "${prompt}".
CRITICAL REQUIREMENTS:
- You MUST preserve the ${itemNoun} (patterns, textures, colors, borders, materials, and design details) EXACTLY as it is. Do NOT change, simplify, modify, or reinterpret the ${itemNoun}.
- Focus ONLY on improving the realism, details, and clarity of the model's face, hands, skin texture, hair, and the background environment.
- Make the model look like a professional, ${modelGenderText} with natural studio lighting and a clean, high-resolution background.
- Output ONLY the final enhanced image.`;

  // First choice: OpenRouter (with google/gemini-2.5-flash-image)
  if (openRouterApiKey) {
    try {
      console.log("Enhancing image using OpenRouter (google/gemini-2.5-flash-image)...");
      const inputDataUrl = `data:${mimeType};base64,${base64Image}`;
      const { base64Data: outputBase64, mimeType: outputMime } = await generateViaOpenRouter(
        openRouterApiKey,
        "google/gemini-2.5-flash-image",
        enhancePrompt,
        inputDataUrl,
        "1:1", // Aspect ratio is preserved from input by the model
        additionalImageUrls
      );
      return { base64Data: outputBase64, mimeType: outputMime };
    } catch (err) {
      console.error("Enhancement via OpenRouter failed, attempting fallback:", err);
      // Fall through to direct Gemini SDK if available
    }
  }

  // Second choice: Direct Google GenAI API
  if (geminiApiKey) {
    try {
      console.log("Enhancing image using direct Gemini API (gemini-2.5-flash-image)...");
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const contents: any[] = [
        { text: enhancePrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
      ];

      // Fetch and append all other supplementary design images to contents for multi-modal context
      if (additionalImageUrls && additionalImageUrls.length > 0) {
        for (const url of additionalImageUrls) {
          if (url && url.startsWith("http")) {
            try {
              console.log(`Fetching additional design image for Gemini enhancement: ${url}`);
              const img = await fetchImageAsBase64(url);
              if (img) {
                contents.push({
                  inlineData: {
                    mimeType: img.mimeType,
                    data: img.data
                  }
                });
              }
            } catch (e) {
              console.error(`Failed to fetch additional design image for Gemini enhancement:`, e);
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

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            return {
              base64Data: part.inlineData.data,
              mimeType: part.inlineData.mimeType || "image/png"
            };
          }
        }
      }
      throw new Error("No image part returned in direct Gemini response candidates");
    } catch (err) {
      console.error("Enhancement via direct Gemini API failed:", err);
      throw err;
    }
  }

  throw new Error("No API key available for Gemini enhancement step.");
}

// Helper to restore faces using CodeFormer on Replicate
export async function restoreFaceWithCodeformer(replicateToken: string, imageUrl: string) {
  try {
    console.log(`Starting CodeFormer face restoration for: ${imageUrl}`);
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
        input: {
          image: imageUrl,
          codeformer_fidelity: 0.7,
          background_enhance: true,
          face_upsample: true,
          upscale: 1
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate CodeFormer trigger failed: ${await response.text()}`);
    }

    let prediction = await response.json();
    const predictionId = prediction.id;
    let status = prediction.status;
    let attempts = 0;

    while (status !== "succeeded" && status !== "failed" && status !== "canceled" && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      if (pollRes.ok) {
        prediction = await pollRes.json();
        status = prediction.status;
      }
      attempts++;
    }

    if (status === "succeeded") {
      const output = prediction.output;
      return Array.isArray(output) ? output[0] : output;
    }
    throw new Error(`CodeFormer failed with status: ${status}`);
  } catch (err) {
    console.error("CodeFormer error:", err);
    return null;
  }
}

// Helper to resize, crop and format image buffer using sharp
export async function processImageBuffer(
  buffer: Buffer,
  outputFormat: string = "png",
  resolution: string = "1K",
  aspectRatio?: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    let image = sharp(buffer);
    const metadata = await image.metadata();

    let targetWidth: number | undefined;
    let targetHeight: number | undefined;

    // Resolution mapping: "1K" -> max 1024px, "2K" -> max 2048px, "4K" -> max 4096px
    let targetMaxDimension = 1024;
    if (resolution === "2K") {
      targetMaxDimension = 2048;
    } else if (resolution === "4K") {
      targetMaxDimension = 4096;
    }

    const currentWidth = metadata.width || 1024;
    const currentHeight = metadata.height || 1024;

    // Aspect ratio parsing (e.g. "3:4 - Portrait", "1:1 - Square")
    const ratioMatch = aspectRatio ? aspectRatio.match(/^(\d+):(\d+)/) : null;
    const targetRatio = ratioMatch ? parseInt(ratioMatch[1]) / parseInt(ratioMatch[2]) : null;

    if (targetRatio) {
      if (targetRatio > 1) {
        // Landscape orientation
        targetWidth = targetMaxDimension;
        targetHeight = Math.round(targetMaxDimension / targetRatio);
      } else {
        // Portrait or Square orientation
        targetHeight = targetMaxDimension;
        targetWidth = Math.round(targetMaxDimension * targetRatio);
      }
      image = image.resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "center",
      });
    } else {
      // Resize maintaining original aspect ratio
      if (currentWidth > currentHeight) {
        if (currentWidth > targetMaxDimension) {
          targetWidth = targetMaxDimension;
          targetHeight = Math.round((currentHeight * targetMaxDimension) / currentWidth);
        }
      } else {
        if (currentHeight > targetMaxDimension) {
          targetHeight = targetMaxDimension;
          targetWidth = Math.round((currentWidth * targetMaxDimension) / currentHeight);
        }
      }
      if (targetWidth && targetHeight) {
        image = image.resize(targetWidth, targetHeight);
      }
    }

    const format = (outputFormat || "").toLowerCase().trim();
    let finalMimeType = "image/png";
    if (format === "jpeg" || format === "jpg") {
      image = image.jpeg({ quality: 90 });
      finalMimeType = "image/jpeg";
    } else {
      image = image.png({ compressionLevel: 8 });
      finalMimeType = "image/png";
    }

    const processedBuffer = await image.toBuffer();
    return { buffer: processedBuffer, mimeType: finalMimeType };
  } catch (error) {
    console.error("Image processing with sharp failed, using original:", error);
    const format = (outputFormat || "").toLowerCase().trim();
    return { buffer, mimeType: (format === "jpeg" || format === "jpg") ? "image/jpeg" : "image/png" };
  }
}

/**
 * Generates a base model image using a source model image (identity) and a pose reference image.
 */
export async function generatePosedModel({
  modelUrl,
  poseUrl,
  userId,
  isMale,
  geminiApiKey,
  openRouterApiKey,
  supabase,
}: {
  modelUrl: string;
  poseUrl: string;
  userId: string;
  isMale: boolean;
  geminiApiKey?: string;
  openRouterApiKey?: string;
  supabase: any;
}): Promise<string | null> {
  try {
    console.log("Starting posed model generation...");
    const promptText = `You are an expert AI fashion model generator.
Generate a high-quality, professional, photorealistic studio photograph of a model.
- The model's face, facial features, hairstyle, skin tone, and body structure MUST be IDENTICAL to the person shown in the Model Reference Image.
- The model's pose, body orientation, and posture MUST mimic the EXACT pose shown in the Pose Reference Image.
- The model should be wearing simple, plain, tight-fitting white underwear (such as a plain white tank top/t-shirt and white shorts/leggings) which acts as a base for digital clothing try-on.
- The background should be clean, professional, and consistent with the Model Reference Image's background.
- Output ONLY the generated image.`;

    let base64Data = "";
    let mimeType = "image/png";

    if (geminiApiKey) {
      try {
        console.log("Generating posed model using direct Gemini API...");
        const modelImgData = await fetchImageAsBase64(modelUrl);
        const poseImgData = await fetchImageAsBase64(poseUrl);
        if (!modelImgData || !poseImgData) {
          throw new Error("Failed to fetch model or pose image for Gemini");
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const contents = [
          { text: promptText },
          {
            inlineData: {
              mimeType: modelImgData.mimeType,
              data: modelImgData.data,
            },
          },
          {
            inlineData: {
              mimeType: poseImgData.mimeType,
              data: poseImgData.data,
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

        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              base64Data = part.inlineData.data;
              mimeType = part.inlineData.mimeType || "image/png";
              break;
            }
          }
        }
      } catch (err) {
        console.error("Direct Gemini posed model generation failed:", err);
      }
    }

    if (!base64Data && openRouterApiKey) {
      try {
        console.log("Generating posed model using OpenRouter fallback...");
        const result = await generateViaOpenRouter(
          openRouterApiKey,
          "google/gemini-2.5-flash-image",
          promptText,
          modelUrl,
          "3:4",
          [poseUrl]
        );
        base64Data = result.base64Data;
        mimeType = result.mimeType;
      } catch (err) {
        console.error("OpenRouter posed model generation failed:", err);
      }
    }

    if (base64Data) {
      // Upload generated posed model to Supabase storage
      const buffer = Buffer.from(base64Data, "base64");
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const tempId = `posed_model_${Date.now()}`;
      const filePath = `${userId}/${tempId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("designs")
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("designs")
        .getPublicUrl(filePath);

      return publicUrl;
    }

    return null;
  } catch (error) {
    console.error("Error in generatePosedModel:", error);
    return null;
  }
}

/**
 * Extracts a video URL from a Gradio prediction result.
 */
function extractVideoUrl(result: any): string | null {
  if (!result?.data) return null;
  // Try various result shapes that different Gradio spaces return
  for (const item of Array.isArray(result.data) ? result.data : [result.data]) {
    const url = item?.video?.url || item?.video?.path || item?.url || item?.path;
    if (url) return url;
  }
  return null;
}

/**
 * Try a single HuggingFace SVD Space for video generation.
 */
async function trySVDSpace(
  spaceId: string,
  apiName: string,
  args: any[],
  hfToken?: `hf_${string}`
): Promise<string | null> {
  try {
    console.log(`[SVD] Trying space: ${spaceId} (${apiName}) with token...`);
    const client = await Client.connect(
      spaceId,
      hfToken ? { token: hfToken } : {}
    );
    const result = (await client.predict(apiName, args)) as any;
    const videoUrl = extractVideoUrl(result);
    if (videoUrl) {
      console.log(`[SVD] ✓ Video generated via ${spaceId}: ${videoUrl}`);
      return videoUrl;
    }
    console.warn(`[SVD] ✗ No video output from ${spaceId}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[SVD] ✗ ${spaceId} failed with token: ${msg}`);
    
    // Fallback: try anonymous if token was used and failed
    if (hfToken) {
      try {
        console.log(`[SVD] Trying space: ${spaceId} (${apiName}) anonymously...`);
        const client = await Client.connect(spaceId);
        const result = (await client.predict(apiName, args)) as any;
        const videoUrl = extractVideoUrl(result);
        if (videoUrl) {
          console.log(`[SVD] ✓ Video generated via ${spaceId} (anon): ${videoUrl}`);
          return videoUrl;
        }
      } catch (anonErr: any) {
        console.error(`[SVD] ✗ ${spaceId} failed anonymously too: ${anonErr?.message || anonErr}`);
      }
    }
  }
  return null;
}

/**
 * Try Replicate SVD API for video generation (requires REPLICATE_API_TOKEN).
 */
async function tryReplicateSVD(
  imageUrl: string,
  replicateToken: string
): Promise<string | null> {
  try {
    console.log("[SVD] Trying Replicate stable-video-diffusion...");
    
    // Create prediction
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
        input: {
          input_image: imageUrl,
          video_length: "14_frames_with_svd",
          sizing_strategy: "maintain_aspect_ratio",
          motion_bucket_id: 127,
          frames_per_second: 6,
        },
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Replicate create failed: ${createRes.status}`);
    }

    const prediction = await createRes.json();
    let predictionId = prediction.id;
    console.log(`[SVD] Replicate prediction created: ${predictionId}`);

    // Poll for completion (max 5 minutes)
    const maxWaitMs = 5 * 60 * 1000;
    const pollIntervalMs = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { "Authorization": `Token ${replicateToken}` },
        }
      );

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();

      if (pollData.status === "succeeded") {
        const outputUrl = Array.isArray(pollData.output)
          ? pollData.output[0]
          : pollData.output;
        if (outputUrl) {
          console.log(`[SVD] ✓ Replicate video generated: ${outputUrl}`);
          return outputUrl;
        }
      } else if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`Replicate prediction ${pollData.status}: ${pollData.error || "unknown"}`);
      }
      // else still processing, continue polling
    }

    throw new Error("Replicate SVD timed out after 5 minutes");
  } catch (err: any) {
    console.error(`[SVD] ✗ Replicate SVD failed: ${err?.message || err}`);
    return null;
  }
}

/**
 * Generates a video from an image using multiple strategies with fallbacks.
 * Strategy order:
 *   1. multimodalart/stable-video-diffusion (HF Space - ZeroGPU)
 *   2. stabilityai/stable-video-diffusion (HF Space - ZeroGPU, separate quota)
 *   3. Replicate SVD API (paid, if token available)
 *   4. fffiloni/stable-video-diffusion (HF Space - ZeroGPU, separate quota)
 */
export async function generateVideoViaSVD(
  imageUrl: string,
  hfToken?: `hf_${string}`
): Promise<string | null> {
  console.log("[SVD] Starting multi-strategy video generation...");
  console.log("[SVD] Input image:", imageUrl);

  // Strategy 1: multimodalart/stable-video-diffusion
  const result1 = await trySVDSpace(
    "multimodalart/stable-video-diffusion",
    "/video",
    [
      handle_file(imageUrl),
      0,    // seed
      true, // randomize_seed
      127,  // motion_bucket_id
      6,    // fps_id
    ],
    hfToken
  );
  if (result1) return result1;

  // Strategy 2: stabilityai/stable-video-diffusion (different Space = different quota)
  const result2 = await trySVDSpace(
    "stabilityai/stable-video-diffusion",
    "/video",
    [
      handle_file(imageUrl),
      0,    // seed
      true, // randomize_seed
      127,  // motion_bucket_id
      6,    // fps_id
    ],
    hfToken
  );
  if (result2) return result2;

  // Strategy 3: Replicate SVD (paid API, no ZeroGPU quota needed)
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (replicateToken) {
    const result3 = await tryReplicateSVD(imageUrl, replicateToken);
    if (result3) return result3;
  }

  // Strategy 4: fffiloni/stable-video-diffusion (another community Space)
  const result4 = await trySVDSpace(
    "fffiloni/stable-video-diffusion",
    "/video",
    [
      handle_file(imageUrl),
      0,    // seed
      true, // randomize_seed
      127,  // motion_bucket_id
      6,    // fps_id
    ],
    hfToken
  );
  if (result4) return result4;
  
  // Strategy 5: Fall back to Wan 2.1 Space (requires fewer ZeroGPU seconds and has verified anonymous line)
  console.log("[SVD] All SVD strategies failed. Falling back to Wan 2.1 Fast Space...");
  const resultWan = await tryWan21Space(
    "multimodalart/wan2-1-fast",
    imageUrl,
    undefined,
    undefined,
    hfToken
  );
  if (resultWan) return resultWan;

  console.error("[SVD] All video generation strategies exhausted.");
  return null;
}

/**
 * Try Replicate Wan 2.1 API for video generation.
 */
async function tryReplicateWan21(
  imageUrl: string,
  prompt?: string,
  aspectRatio?: string,
  replicateToken?: string
): Promise<string | null> {
  const token = replicateToken || process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error("[Wan2.1] No Replicate API token provided.");
    return null;
  }
  
  try {
    console.log("[Wan2.1] Trying Replicate Wan 2.1 (720p)...");
    
    // Clean aspect ratio format (e.g. "9:16 (Reels/Shorts)" -> "9:16")
    let cleanAspectRatio = "9:16";
    if (aspectRatio) {
      const match = aspectRatio.match(/^[0-9]+:[0-9]+/);
      if (match) {
        cleanAspectRatio = match[0];
      }
    }

    const cleanPrompt = prompt || "A professional fashion model showcasing the outfit in a smooth, graceful movement";

    const createRes = await fetch("https://api.replicate.com/v1/models/wavespeedai/wan-2.1-i2v-720p/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          prompt: cleanPrompt,
          aspect_ratio: cleanAspectRatio,
          fast_mode: "Balanced",
        },
      }),
    });

    if (!createRes.ok) {
      // If 720p fails, try falling back to 480p
      console.warn(`[Wan2.1] 720p failed: ${createRes.status}. Trying 480p...`);
      const createRes480 = await fetch("https://api.replicate.com/v1/models/wavespeedai/wan-2.1-i2v-480p/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            image: imageUrl,
            prompt: cleanPrompt,
            aspect_ratio: cleanAspectRatio,
            fast_mode: "Balanced",
          },
        }),
      });
      if (!createRes480.ok) {
        throw new Error(`Replicate Wan 2.1 480p also failed: ${createRes480.status}`);
      }
      return await pollReplicateVideo(await createRes480.json(), token);
    }

    return await pollReplicateVideo(await createRes.json(), token);
  } catch (err: any) {
    console.error(`[Wan2.1] ✗ Replicate Wan 2.1 failed: ${err?.message || err}`);
    return null;
  }
}

async function pollReplicateVideo(prediction: any, token: string): Promise<string | null> {
  const predictionId = prediction.id;
  console.log(`[Wan2.1] Replicate prediction created: ${predictionId}`);

  // Poll for completion (max 5 minutes)
  const maxWaitMs = 5 * 60 * 1000;
  const pollIntervalMs = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { "Authorization": `Token ${token}` },
      }
    );

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();

    if (pollData.status === "succeeded") {
      const outputUrl = Array.isArray(pollData.output)
        ? pollData.output[0]
        : pollData.output;
      if (outputUrl) {
        console.log(`[Wan2.1] ✓ Replicate video generated: ${outputUrl}`);
        return outputUrl;
      }
    } else if (pollData.status === "failed" || pollData.status === "canceled") {
      throw new Error(`Replicate prediction ${pollData.status}: ${pollData.error || "unknown"}`);
    }
  }
  throw new Error("Replicate Wan 2.1 timed out after 5 minutes");
}

/**
 * Try a single HuggingFace Wan 2.1 Space for video generation.
 */
async function tryWan21Space(
  spaceId: string,
  imageUrl: string,
  prompt?: string,
  aspectRatio?: string,
  hfToken?: `hf_${string}`
): Promise<string | null> {
  const cleanPrompt = prompt || "Indian female model wearing fashion clothing, walking gracefully, fashion video, cinematic motion, smooth animation";
  
  let width = 512;
  let height = 896; // default for 9:16 / Portrait
  if (aspectRatio) {
    if (aspectRatio.includes("1:1")) {
      width = 512;
      height = 512;
    } else if (aspectRatio.includes("16:9")) {
      width = 896;
      height = 512;
    } else if (aspectRatio.includes("3:4") || aspectRatio.includes("2:3")) {
      width = 512;
      height = 768;
    } else if (aspectRatio.includes("4:3") || aspectRatio.includes("3:2")) {
      width = 768;
      height = 512;
    }
  }

  const args = [
    handle_file(imageUrl),
    cleanPrompt,
    height,
    width,
    "Bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, images, static, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, misshapen limbs, fused fingers, still picture, messy background, three legs, many people in the background, walking backwards, watermark, text, signature", // negative prompt
    2, // duration
    1, // guidance scale
    4, // inference steps
    42, // seed
    true, // randomize seed
  ];

  try {
    console.log(`[Wan2.1] Trying space: ${spaceId} with token...`);
    const client = await Client.connect(
      spaceId,
      hfToken ? { token: hfToken } : {}
    );
    const result = (await client.predict("/generate_video", args)) as any;
    const videoUrl = extractVideoUrl(result);
    if (videoUrl) {
      console.log(`[Wan2.1] ✓ Video generated via ${spaceId}: ${videoUrl}`);
      return videoUrl;
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[Wan2.1] ✗ ${spaceId} failed with token: ${msg}`);

    // Fallback: try anonymous if token was used and failed
    if (hfToken) {
      try {
        console.log(`[Wan2.1] Trying space: ${spaceId} anonymously...`);
        const client = await Client.connect(spaceId);
        const result = (await client.predict("/generate_video", args)) as any;
        const videoUrl = extractVideoUrl(result);
        if (videoUrl) {
          console.log(`[Wan2.1] ✓ Video generated via ${spaceId} (anon): ${videoUrl}`);
          return videoUrl;
        }
      } catch (anonErr: any) {
        console.error(`[Wan2.1] ✗ ${spaceId} failed anonymously too: ${anonErr?.message || anonErr}`);
      }
    }
  }
  return null;
}

/**
 * Generates a video from an image using Wan 2.1 (Replicate) with fallbacks.
 */
export async function generateVideoViaWan21(
  imageUrl: string,
  prompt?: string,
  aspectRatio?: string,
  hfToken?: `hf_${string}`
): Promise<string | null> {
  console.log("[Wan2.1] Starting Wan 2.1 video generation...");
  
  // Strategy 1: Replicate WAN 2.1 API (paid)
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (replicateToken) {
    const result = await tryReplicateWan21(imageUrl, prompt, aspectRatio, replicateToken);
    if (result) return result;
  }
  
  // Strategy 2: HuggingFace Wan 2.1 Space (free)
  const resultSpace = await tryWan21Space(
    "multimodalart/wan2-1-fast",
    imageUrl,
    prompt,
    aspectRatio,
    hfToken
  );
  if (resultSpace) return resultSpace;
  
  console.log("[Wan2.1] Replicate and Wan 2.1 spaces failed or unavailable. Falling back to SVD spaces...");
  return generateVideoViaSVD(imageUrl, hfToken);
}



