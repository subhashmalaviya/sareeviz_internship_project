import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Helper to download an image from a URL and upload it to Supabase Storage
async function uploadToStorage(supabase: any, imageUrl: string, userId: string) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image from Replicate: ${res.status}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uniqueId = `segmented_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${userId}/${uniqueId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("designs")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Storage upload error for segmented garment:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing image URL to segment" }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json({ error: "Replicate token is not configured on the server" }, { status: 500 });
    }

    console.log(`Starting segmentation (rembg) for: ${imageUrl}`);

    // Call Replicate cjwbw/rembg model
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
      console.error("Replicate segment trigger failed:", errText);
      return NextResponse.json({ error: `Replicate API error: ${errText}` }, { status: 502 });
    }

    let prediction = await response.json();
    const predictionId = prediction.id;
    let status = prediction.status;
    let attempts = 0;
    
    // Poll prediction status synchronously (timeout after 30 seconds)
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
      return NextResponse.json({ error: `Segmentation failed with status: ${status}` }, { status: 502 });
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) {
      return NextResponse.json({ error: "No segmented output returned from model" }, { status: 502 });
    }

    // Upload the segmented transparent PNG to Supabase Storage
    const publicUrl = await uploadToStorage(supabase, outputUrl, user.id);

    if (!publicUrl) {
      return NextResponse.json({ error: "Failed to upload segmented image to storage" }, { status: 500 });
    }

    console.log(`Segmentation succeeded! Transparent image: ${publicUrl}`);
    return NextResponse.json({ segmentedUrl: publicUrl });

  } catch (error: any) {
    console.error("Segment API internal error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
