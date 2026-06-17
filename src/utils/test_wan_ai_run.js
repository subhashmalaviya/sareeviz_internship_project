async function run() {
  try {
    const { Client, handle_file } = await import("@gradio/client");
    console.log("Connecting to Wan-AI/Wan2.1...");
    const client = await Client.connect("Wan-AI/Wan2.1");
    console.log("Connected successfully!");
    
    const imageUrl = "https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose1.webp";
    
    console.log("Submitting i2v_generation_async...");
    const result = await client.predict("/i2v_generation_async", [
      "fashion video of a female model standing and posing gracefully, smooth motion", // prompt
      handle_file(imageUrl), // image
      false, // watermark
      -1, // seed
    ]);
    
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error executing:", err);
  }
}

run();
