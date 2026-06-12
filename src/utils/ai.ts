import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

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

