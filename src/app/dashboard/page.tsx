"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Layers,
  Upload,
  ChevronDown,
  Wand2,
  PlayCircle,
  CreditCard,
  Info,
  History,
  Sparkles,
  RefreshCcw,
  ChevronUp,
  Eye,
  Download,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Maximize2,
  RotateCw,
  Sliders,
  Scissors
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { UploadDesignBox } from "@/components/dashboard/UploadDesignBox";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

const DEFAULT_POSES = [
  { id: 1, label: "Front Standing", desc: "FULL body head to toe. Strictly Standing naturally with weight casually shifted to one side, looking at camera with a warm, genuine smile. Arms loose or one hand gently on hip. Effortless and authentic." },
  { id: 2, label: "Left Profile", desc: "FULL body head to toe. Strictly standing comfortably, body, shoulders, hips, and feet facing LEFT in strict side profile, while head and face turn forward toward the camera with a subtle natural smile." },
  { id: 3, label: "Back View", desc: "FULL body head to toe. Strictly standing comfortably, STRICT back view with body, shoulders, hips, and feet facing away from the camera, while head is turned over the shoulder to face the camera with a warm, natural smile." },
  { id: 4, label: "Leaning on Wall", desc: "FULL body head to toe. Strictly Leaning casually against a wall with a relaxed posture. One leg slightly crossed or bent. Candid, looking away or soft smile at camera. Stylish and contemporary." },
  { id: 5, label: "Seated", desc: "FULL body head to toe. Strictly Seated comfortably in a relaxed position, legs natural. Friendly expression with a warm, welcoming smile." },
  { id: 6, label: "Walking", desc: "FULL body head to toe. Strictly Walking motion with one foot forward in a natural stride. Joyful expression with a genuine, natural smile." },
  { id: 7, label: "Close-up Portrait", desc: "Close-up portrait shot, framing the face and upper body. Direct eye contact with a captivating, elegant expression. Highlighting details of the neckline and jewelry." },
  { id: 8, label: "Right Profile", desc: "FULL body head to toe. Strictly standing comfortably, body, shoulders, hips, and feet facing RIGHT in strict side profile, while head and face turn forward toward the camera with a subtle natural smile." }
];

const getPoseNum = (modelPose: string | undefined): number => {
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
  return poseMapping[modelPose || ""] || 1;
};

export default function StudioPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  // Dashboard Data State
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState<number>(0);
  const [recentGenerations, setRecentGenerations] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [generateFor, setGenerateFor] = useState("saree");
  const [modelPose, setModelPose] = useState("Front Standing");
  const [skinTone, setSkinTone] = useState("Wheatish");
  const [backgroundStyle, setBackgroundStyle] = useState("Luxury Palace / Haveli");
  const [sareeColourHint, setSareeColourHint] = useState("");
  const [catalogueOption, setCatalogueOption] = useState("display_rack");
  const [photographyStyle, setPhotographyStyle] = useState("model");
  const [outputFormat, setOutputFormat] = useState("png");
  const [usePoseLibrary, setUsePoseLibrary] = useState(false);
  const [poseLibraryType, setPoseLibraryType] = useState("prompt");
  const [numPoses, setNumPoses] = useState(5);
  const [posePrompts, setPosePrompts] = useState(DEFAULT_POSES.map(p => p.desc));
  const [expandedPose, setExpandedPose] = useState<number | null>(1);
  const [selectedImagePoses, setSelectedImagePoses] = useState<number[]>([]);
  const [addCenterWatermark, setAddCenterWatermark] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [designNumber, setDesignNumber] = useState("");
  const [fontSize, setFontSize] = useState(4.0);
  const [isBold, setIsBold] = useState(true);
  const [fontColor, setFontColor] = useState("white");
  const [textPosition, setTextPosition] = useState("top_right");
  const [optimiseEcommerce, setOptimiseEcommerce] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("3:4 - Portrait");
  const [resolution, setResolution] = useState("1K");
  const [activeTab, setActiveTab] = useState<"image" | "video" | "combine">("image");
  const [rightTab, setRightTab] = useState<"generate" | "history">("generate");
  const [selectedVideo, setSelectedVideo] = useState<{title: string, src: string} | null>(null);
  const [currentGenId, setCurrentGenId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<{message: string, code?: string} | null>(null);
  const [useMockMode, setUseMockMode] = useState(true);
  const [aiPipeline, setAiPipeline] = useState("auto");

  // Video specific state
  const [videoCategory, setVideoCategory] = useState("apparel");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState("15s");
  const [videoAspectRatio, setVideoAspectRatio] = useState("9:16 (Reels/Shorts)");

  // Multi-Garment Try-On States
  const [combineSaree, setCombineSaree] = useState<string>("");
  const [combineBlouse, setCombineBlouse] = useState<string>("");
  const [combineModel, setCombineModel] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [selectedCombinePose, setSelectedCombinePose] = useState<number>(1);
  const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
  const [segmentingStatus, setSegmentingStatus] = useState<string>("");
  const [segmentedSaree, setSegmentedSaree] = useState<string>("");
  const [segmentedBlouse, setSegmentedBlouse] = useState<string>("");
  const [selectedLayer, setSelectedLayer] = useState<"saree" | "blouse">("saree");
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [sareeLayer, setSareeLayer] = useState({
    x: 10,
    y: 35,
    scale: 0.8,
    rotation: 0,
    zIndex: 2,
  });
  const [blouseLayer, setBlouseLayer] = useState({
    x: 25,
    y: 10,
    scale: 0.5,
    rotation: 0,
    zIndex: 1,
  });

  // Client-side base64 upload to Supabase storage helper
  const uploadBase64ToSupabase = async (base64Data: string, fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const filePath = `${user.id}/${Date.now()}_${fileName}.png`;
    
    const byteString = atob(base64Data.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: "image/png" });

    const { error } = await supabase.storage
      .from("designs")
      .upload(filePath, blob, {
        contentType: "image/png",
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("designs")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Automated background segmentation and composition for multiple garments under Image tab
  const autoComposeGarments = async (
    mainUrl: string,
    secondUrl: string,
    type: "saree" | "lehenga" | "top_bottom"
  ): Promise<string> => {
    // 1. Try to segment each garment, fall back to raw image URL if segmentation fails
    const segmentGarment = async (url: string, name: string): Promise<string> => {
      try {
        const res = await fetch("/api/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url })
        });
        if (!res.ok) {
          console.warn(`Segmentation failed for ${name}: ${res.statusText}. Using raw image.`);
          return url; // fallback to raw image
        }
        const data = await res.json();
        if (data.error) {
          console.warn(`Segmentation error for ${name}: ${data.error}. Using raw image.`);
          return url; // fallback to raw image
        }
        return data.segmentedUrl;
      } catch (err: any) {
        console.warn(`Segmentation unavailable for ${name}: ${err.message}. Using raw image.`);
        return url; // fallback to raw image
      }
    };

    const mainProcessed = await segmentGarment(mainUrl, "main design");
    const secondProcessed = await segmentGarment(secondUrl, "secondary design");

    // 2. Composite onto canvas
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }

      // Draw white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load both images
      const img1 = new Image();
      const img2 = new Image();
      img1.crossOrigin = "anonymous";
      img2.crossOrigin = "anonymous";

      let loadedCount = 0;
      const checkLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          try {
            // Both images loaded, draw them based on type
            if (type === "saree" || type === "lehenga") {
              // img1 is Saree/Lehenga, img2 is Blouse/Choli
              // We want Blouse/Choli at the top, Saree/Lehenga draping below it
              
              // Blouse/Choli: width = 50%, top y = 12%
              ctx.save();
              const bWidth = 0.5 * canvas.width;
              const bAspect = img2.naturalHeight / img2.naturalWidth;
              const bHeight = bWidth * bAspect;
              const bX = (canvas.width - bWidth) / 2;
              const bY = 0.12 * canvas.height;
              ctx.drawImage(img2, bX, bY, bWidth, bHeight);
              ctx.restore();

              // Saree/Lehenga: width = 80%, top y = 35%
              ctx.save();
              const sWidth = 0.8 * canvas.width;
              const sAspect = img1.naturalHeight / img1.naturalWidth;
              const sHeight = sWidth * sAspect;
              const sX = (canvas.width - sWidth) / 2;
              const sY = type === "lehenga" ? 0.42 * canvas.height : 0.35 * canvas.height;
              ctx.drawImage(img1, sX, sY, sWidth, sHeight);
              ctx.restore();
            } else {
              // type === "top_bottom"
              // img1 is Top (Kurti, Kurta, etc.), img2 is Bottom (pants, skirt, etc.)
              
              // Bottom (Pants/Skirt) drawn at the lower half without overlapping
              ctx.save();
              const bWidth = 0.5 * canvas.width;
              const bAspect = img2.naturalHeight / img2.naturalWidth;
              let bHeight = bWidth * bAspect;
              // Max height 45% of canvas
              const maxBHeight = 0.45 * canvas.height;
              let finalBWidth = bWidth;
              if (bHeight > maxBHeight) {
                bHeight = maxBHeight;
                finalBWidth = bHeight / bAspect;
              }
              const bX = (canvas.width - finalBWidth) / 2;
              const bY = 0.52 * canvas.height; // Starts just below center
              ctx.drawImage(img2, bX, bY, finalBWidth, bHeight);
              ctx.restore();

              // Top (Kurta/Kurti) drawn at the upper half without overlapping
              ctx.save();
              const tWidth = 0.5 * canvas.width;
              const tAspect = img1.naturalHeight / img1.naturalWidth;
              let tHeight = tWidth * tAspect;
              // Max height 45% of canvas
              const maxTHeight = 0.45 * canvas.height;
              let finalTWidth = tWidth;
              if (tHeight > maxTHeight) {
                tHeight = maxTHeight;
                finalTWidth = tHeight / tAspect;
              }
              const tX = (canvas.width - finalTWidth) / 2;
              const tY = 0.05 * canvas.height; // Starts near top
              ctx.drawImage(img1, tX, tY, finalTWidth, tHeight);
              ctx.restore();
            }
            resolve(canvas.toDataURL("image/png"));
          } catch (err) {
            reject(err);
          }
        }
      };

      img1.onload = checkLoaded;
      img1.onerror = () => reject(new Error("Failed to load main garment image"));
      img2.onload = checkLoaded;
      img2.onerror = () => reject(new Error("Failed to load secondary garment image"));

      // Start loading
      img1.src = mainProcessed;
      img2.src = secondProcessed;
    });
  };


  // Garment Segmentation Action using Replicate rembg
  const segmentGarments = async () => {
    if (!combineSaree || !combineBlouse) {
      alert(t("Please upload both Saree and Blouse images first!") || "Please upload both Saree and Blouse images first!");
      return;
    }
    try {
      setIsSegmenting(true);
      setSegmentingStatus(t("Removing Saree background (SAM/Rembg)...") || "Removing Saree background...");

      const sareeRes = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: combineSaree })
      });
      if (!sareeRes.ok) {
        throw new Error(`Saree segmentation failed: ${sareeRes.statusText}`);
      }
      const sareeData = await sareeRes.json();
      if (sareeData.error) throw new Error(sareeData.error);
      setSegmentedSaree(sareeData.segmentedUrl);

      setSegmentingStatus(t("Removing Blouse background (SAM/Rembg)...") || "Removing Blouse background...");
      const blouseRes = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: combineBlouse })
      });
      if (!blouseRes.ok) {
        throw new Error(`Blouse segmentation failed: ${blouseRes.statusText}`);
      }
      const blouseData = await blouseRes.json();
      if (blouseData.error) throw new Error(blouseData.error);
      setSegmentedBlouse(blouseData.segmentedUrl);

      setIsComposerOpen(true);
    } catch (err: any) {
      console.error("Garment segmentation failed:", err);
      alert(`Segmentation failed: ${err.message}`);
    } finally {
      setIsSegmenting(false);
      setSegmentingStatus("");
    }
  };

  // Render composer onto offscreen canvas for export
  const exportComposition = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const layers = [
        { id: "blouse", url: segmentedBlouse, settings: blouseLayer },
        { id: "saree", url: segmentedSaree, settings: sareeLayer }
      ].sort((a, b) => a.settings.zIndex - b.settings.zIndex);

      let loadedCount = 0;
      if (layers.length === 0) {
        resolve(canvas.toDataURL("image/png"));
        return;
      }

      layers.forEach((layer) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();

          const w = (layer.settings.scale * canvas.width);
          const aspectRatio = img.naturalHeight / img.naturalWidth;
          const h = w * aspectRatio;

          const x = (layer.settings.x / 100) * canvas.width;
          const y = (layer.settings.y / 100) * canvas.height;

          const centerX = x + w / 2;
          const centerY = y + h / 2;

          ctx.translate(centerX, centerY);
          ctx.rotate((layer.settings.rotation * Math.PI) / 180);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();

          loadedCount++;
          if (loadedCount === layers.length) {
            resolve(canvas.toDataURL("image/png"));
          }
        };
        img.onerror = () => {
          reject(new Error(`Failed to load segmented image layer for composition`));
        };
        img.src = layer.url;
      });
    });
  };

  // Dashboard Data Actions
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Supabase Realtime subscription for generation and credit updates
  useEffect(() => {
    let activeChannel: any;
    let creditsChannel: any;
    let isMounted = true;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      activeChannel = supabase
        .channel(`generations-realtime-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "generations",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Realtime generation update received:", payload);
            if (payload.eventType === "INSERT") {
              setRecentGenerations((prev) => [payload.new as any, ...prev.slice(0, 9)]);
            } else if (payload.eventType === "UPDATE") {
              setRecentGenerations((prev) =>
                prev.map((g) => (g.id === payload.new.id ? (payload.new as any) : g))
              );
              
              if (payload.new.status === "done" || payload.new.status === "failed") {
                fetchDashboardData();
              }
            } else if (payload.eventType === "DELETE") {
              setRecentGenerations((prev) => prev.filter((g) => g.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      creditsChannel = supabase
        .channel(`credits-realtime-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "credits",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Realtime credit update received:", payload);
            const newPayload = payload.new as any;
            if (newPayload && typeof newPayload.balance === "number") {
              setBalance(newPayload.balance);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
      if (creditsChannel) {
        supabase.removeChannel(creditsChannel);
      }
    };
  }, []);

  // Client-side polling logic for active jobs
  useEffect(() => {
    const activeGens = recentGenerations.filter(
      (gen) => gen.status === "pending" || gen.status === "processing"
    );

    if (activeGens.length === 0) return;

    const interval = setInterval(async () => {
      let updatedAny = false;
      const newGenerations = [...recentGenerations];

      for (const gen of activeGens) {
        try {
          const res = await fetch(`/api/generate/status?id=${gen.id}`);
          if (!res.ok) continue;
          
          const data = await res.json();
          if (data && data.status !== gen.status) {
            const index = newGenerations.findIndex((g) => g.id === gen.id);
            if (index !== -1) {
              newGenerations[index] = data;
              updatedAny = true;
            }
          }
        } catch (err) {
          console.error("Error polling status:", err);
        }
      }

      if (updatedAny) {
        setRecentGenerations(newGenerations);
        
        // If any generation completed (done or failed), refresh all dashboard data to sync balance
        const finishedAny = activeGens.some((g) => {
          const found = newGenerations.find((ng) => ng.id === g.id);
          return found && (found.status === "done" || found.status === "failed");
        });
        
        if (finishedAny) {
          fetchDashboardData();
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [recentGenerations]);

  useEffect(() => {
    if (!currentGenId && recentGenerations.length > 0) {
      const active = recentGenerations.find(
        (g) => g.status === "pending" || g.status === "processing"
      );
      if (active) {
        setCurrentGenId(active.id);
      }
    }
  }, [recentGenerations, currentGenId]);

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, "_blank");
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setRecentGenerations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch credits
      const { data: creditsData } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      
      if (creditsData) {
        setBalance(creditsData.balance);
      }

      // Fetch recent generations
      const { data: gensData } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (gensData) {
        setRecentGenerations(gensData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  const isFormValidForGeneration = () => {
    if (activeTab === "combine") {
      return !!(segmentedSaree && segmentedBlouse && (!isCustomModel || combineModel));
    } else if (activeTab === "video") {
      return !!uploads["video_reference_image"];
    } else {
      const mainKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
      const mainUrl = uploads[mainKey] || uploads["saree_design"] || Object.values(uploads)[0];
      return !!mainUrl;
    }
  };

  const handleGenerate = async () => {
    // 1. Perform validations first (before switching tab or starting generation)
    if (activeTab === "combine") {
      if (!segmentedSaree || !segmentedBlouse) {
        alert(t("Please segment your saree and blouse first!") || "Please segment your saree and blouse first!");
        return;
      }
      if (isCustomModel && !combineModel) {
        alert(t("Please upload your model image first!") || "Please upload your model image first!");
        return;
      }
      if (!useMockMode && balance < 1) {
        alert(t("Insufficient credits! Please buy more credits.") || "Insufficient credits! Please buy more credits.");
        return;
      }
    } else if (activeTab === "video") {
      if (!uploads["video_reference_image"]) {
        alert(t("Please upload a reference image for video!") || "Please upload a reference image for video!");
        return;
      }
      if (!useMockMode && balance < 1) {
        alert(t("Insufficient credits! Please buy more credits.") || "Insufficient credits! Please buy more credits.");
        return;
      }
    } else {
      const mainKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
      const mainUrl = uploads[mainKey] || uploads["saree_design"] || Object.values(uploads)[0];

      if (!mainUrl) {
        alert(t("Please upload your main design first!") || "Please upload your main design first!");
        return;
      }
      if (!useMockMode && balance < 1) {
        alert(t("Insufficient credits! Please buy more credits.") || "Insufficient credits! Please buy more credits.");
        return;
      }
    }

    // 2. Switch tab and start generation
    setRightTab("generate");
    setIsGenerating(true);

    let mainDesignUrl = "";
    let finalPoseModelBg = null;
    let poseLibraryRef: string | null = null;
    let actualAiPipeline = aiPipeline;

    if (activeTab === "combine") {
      try {
        // 1. Export composition from composer canvas
        const base64Composed = await exportComposition();
        
        // 2. Upload composed image to Supabase
        const composedUrl = await uploadBase64ToSupabase(base64Composed, "multi_garment_composed");
        if (!composedUrl) {
          throw new Error("Failed to upload composed outfit to storage");
        }
        mainDesignUrl = composedUrl;

        // 3. Set up the model image
        if (isCustomModel) {
          finalPoseModelBg = combineModel;
        } else {
          finalPoseModelBg = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${selectedCombinePose}.webp`;
        }

        actualAiPipeline = "multi_garment";
      } catch (err: any) {
        setGenerationError({
          message: `Failed to compose and upload outfit: ${err.message}`,
          code: "COMPOSE_FAILED"
        });
        setIsGenerating(false);
        return;
      }
    } else if (activeTab === "image") {
      const mainKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
      const mainUrl = uploads[mainKey] || uploads["saree_design"] || Object.values(uploads)[0];

      let secondUrl = "";
      let comboType: "saree" | "lehenga" | "top_bottom" = "top_bottom";
      let isMultiGarment = false;

      if (generateFor === "saree" && uploads.saree_blouse_design) {
        secondUrl = uploads.saree_blouse_design;
        comboType = "saree";
        isMultiGarment = true;
      } else if (generateFor === "lehenga" && uploads.lehenga_choli_design) {
        secondUrl = uploads.lehenga_choli_design;
        comboType = "lehenga";
        isMultiGarment = true;
      } else {
        const bottomKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`;
        if (uploads[bottomKey]) {
          secondUrl = uploads[bottomKey];
          comboType = "top_bottom";
          isMultiGarment = true;
        } else if (generateFor.toLowerCase() === "women's dress" && uploads.dress_bottom_design) {
          secondUrl = uploads.dress_bottom_design;
          comboType = "top_bottom";
          isMultiGarment = true;
        }
      }

      if (isMultiGarment && mainUrl && secondUrl) {
        try {
          console.log("Multi-garment detected under Image tab. Auto-segmenting and composing...");
          
          const base64Composed = await autoComposeGarments(mainUrl, secondUrl, comboType);
          const composedUrl = await uploadBase64ToSupabase(base64Composed, "auto_multi_garment");
          if (!composedUrl) {
            throw new Error("Failed to upload composed garment image");
          }
          mainDesignUrl = composedUrl;
          actualAiPipeline = "multi_garment";

          finalPoseModelBg = uploads["pose_model_bg"] || null;
          if (usePoseLibrary && poseLibraryType === "image" && selectedImagePoses.length > 0) {
            const isMaleCategory = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
            const posePrefix = isMaleCategory ? "male_pose" : "pose";
            const poseExt = isMaleCategory ? "png" : "webp";
            const poseLibUrl = `/poses/${posePrefix}${selectedImagePoses[0]}.${poseExt}`;
            if (uploads["pose_model_bg"]) {
              // User uploaded a model face: keep it, send pose image as pose_ref
              poseLibraryRef = poseLibUrl;
            } else {
              finalPoseModelBg = poseLibUrl;
            }
          }
        } catch (err: any) {
          console.error("Auto-composition failed:", err);
          setGenerationError({
            message: `Failed to compose garments: ${err.message}`,
            code: "COMPOSE_FAILED"
          });
          setIsGenerating(false);
          return;
        }
      } else {
        try {
          mainDesignUrl = mainUrl;
          finalPoseModelBg = uploads["pose_model_bg"] || null;
          if (usePoseLibrary && poseLibraryType === "image" && selectedImagePoses.length > 0) {
            const isMaleCategory = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
            const posePrefix = isMaleCategory ? "male_pose" : "pose";
            const poseExt = isMaleCategory ? "png" : "webp";
            const poseLibUrl = `/poses/${posePrefix}${selectedImagePoses[0]}.${poseExt}`;
            if (uploads["pose_model_bg"]) {
              // User uploaded a model face: keep it, send pose image as pose_ref
              poseLibraryRef = poseLibUrl;
            } else {
              finalPoseModelBg = poseLibUrl;
            }
          }
        } catch (err: any) {
          console.error("Single generation preprocessing error:", err);
          setIsGenerating(false);
          return;
        }
      }
    } else if (activeTab === "video") {
      // Video tab uses a dedicated upload key
      mainDesignUrl = uploads["video_reference_image"] || "";
      finalPoseModelBg = null;
    } else {
      const mainKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
      mainDesignUrl = uploads[mainKey] || uploads["saree_design"] || Object.values(uploads)[0];

      try {
        finalPoseModelBg = uploads["pose_model_bg"] || null;
        if (usePoseLibrary && poseLibraryType === "image" && selectedImagePoses.length > 0) {
          const poseLibUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${selectedImagePoses[0]}.webp`;
          if (uploads["pose_model_bg"]) {
            poseLibraryRef = poseLibUrl;
          } else {
            finalPoseModelBg = poseLibUrl;
          }
        }
      } catch (err: any) {
        console.error("Single generation preprocessing error:", err);
        setIsGenerating(false);
        return;
      }
    }

    try {
      let posesToRun = [null as number | null];
      if (activeTab === "image" && usePoseLibrary && poseLibraryType === "image" && selectedImagePoses.length > 0) {
        posesToRun = [...selectedImagePoses];
      } else if (activeTab === "combine" && !isCustomModel) {
        posesToRun = [selectedCombinePose];
      }

      for (let i = 0; i < posesToRun.length; i++) {
        const currentPoseNum = posesToRun[i];
        
        let jobPoseModelBg = finalPoseModelBg;
        let jobPoseRef = poseLibraryRef;
        if (currentPoseNum !== null) {
          if (activeTab === "combine") {
            const poseUrl = `https://raw.githubusercontent.com/subhashmalaviya/sareeviz_internship_project/main/public/poses/pose${currentPoseNum}.webp`;
            if (uploads["pose_model_bg"]) {
              jobPoseModelBg = uploads["pose_model_bg"];
              jobPoseRef = poseUrl;
            } else {
              jobPoseModelBg = poseUrl;
            }
          } else if (activeTab === "image") {
            const isMaleCategory = ["man's kurta", "men's dress", "men's innerwear"].includes((generateFor || "").toLowerCase().trim());
            const posePrefix = isMaleCategory ? "male_pose" : "pose";
            const poseExt = isMaleCategory ? "png" : "webp";
            const poseUrl = `/poses/${posePrefix}${currentPoseNum}.${poseExt}`;
            if (uploads["pose_model_bg"]) {
              // User uploaded a model face: keep it as identity, use pose library image as pose reference
              jobPoseModelBg = uploads["pose_model_bg"];
              jobPoseRef = poseUrl;
            } else {
              jobPoseModelBg = poseUrl;
            }
          }
        }

        // Merge jobPoseRef into additional_designs so the backend uses it as the pose reference
        const mergedAdditionalDesigns = {
          ...uploads,
          ...(jobPoseRef ? { pose_ref: jobPoseRef } : {})
        };

        const payload = {
          generateFor: activeTab === "combine" ? "saree" : generateFor,
          photographyStyle,
          outputFormat,
          aspectRatio,
          resolution,
          modelPose: activeTab === "combine" ? DEFAULT_POSES[currentPoseNum ? currentPoseNum - 1 : selectedCombinePose - 1]?.label || "Front Standing" : modelPose,
          skinTone,
          backgroundStyle,
          sareeColourHint,
          original_image_url: mainDesignUrl,
          pose_model_bg: jobPoseModelBg,
          useMockMode: useMockMode,
          aiPipeline: actualAiPipeline,
          additional_designs: mergedAdditionalDesigns,
          catalogueOption: catalogueOption,
          branding: {
            brandLogo: uploads["image_brand_logo"] || null,
            addCenterWatermark,
            brandName,
            designNumber,
            fontSize,
            isBold,
            fontColor,
            textPosition
          }
        };

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errMsg = "Failed to start generation.";
          try {
            const errorData = await res.json();
            errMsg = errorData.error || errMsg;
          } catch {
            try {
              const text = await res.text();
              errMsg = text || errMsg;
            } catch {}
          }
          setGenerationError({
            message: errMsg,
            code: "GEN_FAILED"
          });
          break;
        }

        setGenerationError(null);
        const newGen = await res.json();

        setRecentGenerations(prev => [newGen, ...prev]);
        // Set the first one as active view, or the latest
        if (i === 0) {
          setCurrentGenId(newGen.id);
        }
        setRightTab("generate");

        if (!useMockMode) {
          setBalance(prev => Math.max(0, prev - 1));
        }

        fetchDashboardData();
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setGenerationError({
        message: err.message || "Failed to start generation. Please try again.",
        code: "CLIENT_ERROR"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimiseEcommerceChange = (checked: boolean) => {
    setOptimiseEcommerce(checked);
    if (checked) {
      setOutputFormat("jpeg");
      setAspectRatio("3:4 - Portrait");
      setResolution("1K");
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden flex flex-col lg:flex-row bg-[#F8F9FB] justify-center w-full">
      <div className="flex w-full max-w-[1400px] mx-auto shadow-sm">
        {/* ─── LEFT COLUMN ─── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-gray-200 bg-white flex flex-col h-full relative">
          <div className="flex-1 overflow-y-auto pb-20 scrollbar-thin">
          {/* Tabs row */}
          <div className="flex items-center gap-0 border-b border-gray-200 px-5 pt-3">
            <button
              onClick={() => setActiveTab("image")}
              className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "image"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <ImageIcon className="h-4 w-4" /> {t("Image")}
            </button>
            <button
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "video"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Video className="h-4 w-4" /> {t("Video")}
            </button>
            <button
              onClick={() => setActiveTab("combine")}
              className={`relative flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "combine"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Layers className="h-4 w-4" /> {t("Combine")}
              <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-px rounded uppercase leading-none">
                New
              </span>
            </button>
          </div>

          {/* Form content */}
          <div className="px-5 py-5 space-y-6">
            {activeTab === "image" ? (
              <>
                {/* Step 1: Upload Design */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                  1
                </span>
                <h2 className="text-base font-bold text-gray-900">{t("Upload Design")}</h2>
              </div>

              {/* Generate For */}
              <div className="space-y-2.5">
                <span className="text-sm font-semibold text-gray-700">{t("Generate For")}</span>
                <RadioGroup
                  value={generateFor}
                  onValueChange={setGenerateFor}
                  className="grid grid-cols-2 gap-2.5"
                >
                  {[
                    { id: "saree", label: t("Saree") },
                    { id: "lehenga", label: t("Lehenga") },
                    { id: "kurti", label: t("Kurti") },
                    { id: "salwar suit", label: t("Salwar Suit") },
                  ].map((item) => (
                    <Label
                      key={item.id}
                      htmlFor={item.id}
                      className={`flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-all ${
                        generateFor === item.id
                          ? "border-pink-500 bg-pink-50/50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <RadioGroupItem
                        value={item.id}
                        id={item.id}
                        className="text-pink-500 border-gray-300"
                      />
                      <span className="font-medium text-gray-700">{item.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      !["saree", "lehenga", "kurti", "salwar suit"].includes(generateFor.toLowerCase())
                        ? "border-pink-500 text-pink-600 bg-pink-50/50"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                      {!["saree", "lehenga", "kurti", "salwar suit"].includes(generateFor.toLowerCase())
                        ? t(generateFor)
                        : t("More")}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  } />
                  <DropdownMenuContent 
                    align="start" 
                    className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white rounded-lg border-gray-200 shadow-lg p-1"
                  >
                    {[
                      "Man's Kurta", 
                      "Men's Dress", 
                      "Women's Dress", 
                      "Stole", 
                      "Men's Innerwear", 
                      "Women's Innerwear", 
                      "Jewelry"
                    ].map((item) => (
                      <DropdownMenuItem 
                        key={item} 
                        className="text-sm text-gray-700 cursor-pointer py-2 px-3 focus:bg-pink-50 focus:text-pink-600 rounded-md"
                        onClick={() => setGenerateFor(item)}
                      >
                        {t(item)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Upload Box */}
              <div className="space-y-4">
                {/* Main Design Uploader */}
                <UploadDesignBox
                  label={generateFor === "Men's Dress" ? t("Top Design") : 
                         generateFor === "Women's Dress" ? t("Dress (Top) Design") : 
                         t(`${generateFor} Design`) || `${generateFor} Design`}
                  value={uploads[`${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`] || ""}
                  onChange={(url) => setUploads(prev => ({ 
                    ...prev, 
                    [`${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`]: url 
                  }))}
                  placeholderText={t("Upload your main design") || "Upload your main design"}
                  helperText={t("Drag and drop your image, or click to browse. Max size 10 MB.") || "Drag & drop image or click. Max 10 MB."}
                />

                {/* Secondary Bottom wear uploader for Kurti, Kurta, Salwar Suit, Men's Dress, or general categories */}
                {["kurti", "salwar suit", "Man's Kurta", "Men's Dress"].includes(generateFor) && (
                  <UploadDesignBox
                    label={`${t("Bottom Design")} (${t("Optional")})`}
                    value={uploads[`${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`] || ""}
                    onChange={(url) => setUploads(prev => ({ 
                      ...prev, 
                      [`${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_bottom_design`]: url 
                    }))}
                    placeholderText={t("Upload bottom design reference") || "Upload bottom design reference"}
                    helperText={t("Optional style reference image under 10 MB.") || "Optional reference under 10 MB."}
                    heightClass="h-32"
                  />
                )}

                {/* Salwar suit Dupatta uploader */}
                {generateFor.toLowerCase() === "salwar suit" && (
                  <UploadDesignBox
                    label={`${t("Dupatta Design")} (${t("Optional")})`}
                    value={uploads["salwar_dupatta_design"] || ""}
                    onChange={(url) => setUploads(prev => ({ ...prev, salwar_dupatta_design: url }))}
                    placeholderText={t("Upload dupatta design reference") || "Upload dupatta design reference"}
                    helperText={t("Optional style reference image under 10 MB.") || "Optional reference under 10 MB."}
                    heightClass="h-32"
                  />
                )}
              </div>

              {/* Sub-accordions under Step 1 */}
              <Accordion multiple className="space-y-2">
                {!["kurti", "Man's Kurta", "Men's Dress", "Stole", "Jewelry"].includes(generateFor) && (
                  <AccordionItem value="item-1" className="bg-white rounded-xl border border-gray-200 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold text-gray-900">
                      {generateFor === "lehenga" ? t("Add Choli / Dupatta Design") : 
                       ["salwar suit", "Women's Dress"].includes(generateFor.toLowerCase()) ? t("Additional Design References") :
                       ["Men's Innerwear", "Women's Innerwear"].includes(generateFor) ? t("Back Design Reference") :
                       t("Add Blouse / Dupatta / Pallu Design")}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-5">
                      {generateFor === "saree" ? (
                        <>
                          <UploadDesignBox
                            label={t("Blouse Design") || "Blouse Design"}
                            value={uploads["saree_blouse_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, saree_blouse_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a blouse reference to match its design, color, and pattern.") || "Upload blouse reference"}
                            heightClass="h-32"
                          />
                          <UploadDesignBox
                            label={t("Dupatta Design") || "Dupatta Design"}
                            value={uploads["saree_dupatta_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, saree_dupatta_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a dupatta reference to match its design, color, and pattern.") || "Upload dupatta reference"}
                            heightClass="h-32"
                          />
                          <UploadDesignBox
                            label={t("Pallu/Drape Design") || "Pallu/Drape Design"}
                            value={uploads["saree_pallu_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, saree_pallu_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a pallu reference to match its design, color, and pattern.") || "Upload pallu reference"}
                            heightClass="h-32"
                          />
                        </>
                      ) : generateFor === "lehenga" ? (
                        <>
                          <UploadDesignBox
                            label={t("Choli Design") || "Choli Design"}
                            value={uploads["lehenga_choli_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, lehenga_choli_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a choli reference to match its design, color, and pattern.") || "Upload choli reference"}
                            heightClass="h-32"
                          />
                          <UploadDesignBox
                            label={t("Dupatta Design") || "Dupatta Design"}
                            value={uploads["lehenga_dupatta_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, lehenga_dupatta_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a dupatta reference to match its design, color, and pattern.") || "Upload dupatta reference"}
                            heightClass="h-32"
                          />
                        </>
                      ) : generateFor.toLowerCase() === "salwar suit" ? (
                        <>
                          <UploadDesignBox
                            label={t("Back Design") || "Back Design"}
                            value={uploads["salwar_back_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, salwar_back_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Reference for back of kameez/top") || "Reference for back of kameez/top"}
                            heightClass="h-32"
                          />
                          <UploadDesignBox
                            label={t("Sleeve Design") || "Sleeve Design"}
                            value={uploads["salwar_sleeve_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, salwar_sleeve_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Reference for sleeve pattern/design") || "Reference for sleeve pattern/design"}
                            heightClass="h-32"
                          />
                        </>
                      ) : generateFor === "Women's Dress" ? (
                        <>
                          <UploadDesignBox
                            label={t("Back Dress Design") || "Back Dress Design"}
                            value={uploads["dress_back_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, dress_back_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Reference for back of dress") || "Reference for back of dress"}
                            heightClass="h-32"
                          />
                          <UploadDesignBox
                            label={t("Bottom Design") || "Bottom Design"}
                            value={uploads["dress_bottom_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, dress_bottom_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Reference for bottom wear (pants, skirt, etc.)") || "Reference for bottom wear"}
                            heightClass="h-32"
                          />
                        </>
                      ) : ["Men's Innerwear", "Women's Innerwear"].includes(generateFor) ? (
                        <>
                          <UploadDesignBox
                            label={t("Back Design") || "Back Design"}
                            value={uploads["innerwear_back_design"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, innerwear_back_design: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a back design reference to match its pattern.") || "Upload back design reference"}
                            heightClass="h-32"
                          />
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">{t("Upload supplementary images for detailed generation.")}</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="item-2" className="bg-white rounded-xl border border-gray-200 px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold text-gray-900">
                    {t("Close-Up Design Reference")}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <UploadDesignBox
                      label={t("Close-Up Design Reference") || "Close-Up Design Reference"}
                      value={uploads["closeup_reference"] || ""}
                      onChange={(url) => setUploads(prev => ({ ...prev, closeup_reference: url }))}
                      placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                      helperText={t("Upload a close-up shot of the design to accurately generate details.") || "Upload close-up shot"}
                      heightClass="h-32"
                    />
                  </AccordionContent>
                </AccordionItem>

                {generateFor !== "Jewelry" && (
                  <AccordionItem value="item-3" className="bg-white rounded-xl border border-gray-200 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold text-gray-900">
                      {t("Catalogue Options")}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4">
                        <UploadDesignBox
                          label={t("Colour Matching") || "Colour Matching"}
                          value={uploads["colour_matching"] || ""}
                          onChange={(url) => setUploads(prev => ({ ...prev, colour_matching: url }))}
                          placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                          helperText={t("Upload a photo of matching colours options.") || "Upload matching color options"}
                          heightClass="h-32"
                        />
                        <div className="space-y-3 mt-4">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="catalogue_option"
                              value="display_rack"
                              checked={catalogueOption === "display_rack"}
                              onChange={() => setCatalogueOption("display_rack")}
                              className="mt-0.5 w-4 h-4 accent-pink-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700 font-normal leading-tight group-hover:text-gray-900">
                              {t("Show them on a display rack on the side")}
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="catalogue_option"
                              value="multiple_models"
                              checked={catalogueOption === "multiple_models"}
                              onChange={() => setCatalogueOption("multiple_models")}
                              className="mt-0.5 w-4 h-4 accent-pink-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700 font-normal leading-tight group-hover:text-gray-900">
                              {t("Create a catalogue image with multiple models")}
                            </span>
                          </label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            {/* Step 2 */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Accordion>
                <AccordionItem value="step-2" className="border-0">
                  <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                        2
                      </span>
                      <h2 className="text-base font-bold text-gray-900">
                        {t("Model, Background & Pose Options")}
                      </h2>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-4 pl-12">
                    <div className="space-y-6">
                      <div className="flex gap-6 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="photography_style"
                            value="model"
                            checked={photographyStyle === "model"}
                            onChange={() => setPhotographyStyle("model")}
                            className="w-4 h-4 accent-pink-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 leading-tight group-hover:text-gray-900">
                            {t("Model Photography")}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="photography_style"
                            value="flat_lay"
                            checked={photographyStyle === "flat_lay"}
                            onChange={() => setPhotographyStyle("flat_lay")}
                            className="w-4 h-4 accent-pink-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 leading-tight group-hover:text-gray-900">
                            {t("Flat Lay Photography")}
                          </span>
                        </label>
                      </div>

                      {photographyStyle === "model" ? (
                        <>
                          {/* Basic Model Parameters */}
                          <div className="space-y-4 pb-4 border-b border-gray-100 mb-4 mt-2">
                            {/* AI Generation Pipeline Dropdown */}
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-pink-500" />
                                {t("AI Quality Pipeline")}
                              </label>
                              <div className="relative">
                                <select
                                  value={aiPipeline}
                                  onChange={(e) => setAiPipeline(e.target.value)}
                                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                >
                                  <option value="auto">{t("Auto (Standard Fallback Routing)")}</option>
                                  <option value="hybrid">{t("Hybrid VTON + Gemini Enhance (Recommended)")}</option>
                                  <option value="openrouter_gemini">{t("OpenRouter: Gemini 2.5 Flash Image")}</option>
                                  <option value="openrouter_flux_pro">{t("OpenRouter: Flux 2 Pro")}</option>
                                  <option value="openrouter_flux_flex">{t("OpenRouter: Flux 2 Flex")}</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {aiPipeline === "auto" && t("Automatically routes your request to get the best free and paid models.")}
                                {aiPipeline === "hybrid" && t("IDM-VTON transfers the clothes first, then Gemini refines the model's face/background details.")}
                                {aiPipeline === "openrouter_gemini" && t("Generates output using google/gemini-2.5-flash-image editing model.")}
                                {aiPipeline === "openrouter_flux_pro" && t("Generates premium commercial fashion model output via FLUX.2 Pro.")}
                                {aiPipeline === "openrouter_flux_flex" && t("Generates fast fashion model outputs via FLUX.2 Flex.")}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Model Pose Dropdown */}
                              <div className="space-y-2">
                                <span className="text-sm font-semibold text-gray-700">{t("Model Pose")}</span>
                                <div className="relative">
                                  <select
                                    value={modelPose}
                                    onChange={(e) => setModelPose(e.target.value)}
                                    className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                  >
                                    {DEFAULT_POSES.map((pose) => (
                                      <option key={pose.id} value={pose.label}>
                                        {t(pose.label)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                                </div>
                              </div>

                              {/* Skin Tone Dropdown */}
                              <div className="space-y-2">
                                <span className="text-sm font-semibold text-gray-700">{t("Skin Tone")}</span>
                                <div className="relative">
                                  <select
                                    value={skinTone}
                                    onChange={(e) => setSkinTone(e.target.value)}
                                    className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                  >
                                    {["Wheatish", "Fair", "Dusky", "Dark"].map((tone) => (
                                      <option key={tone} value={tone}>
                                        {t(tone)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Background Style Dropdown */}
                              <div className="space-y-2">
                                <span className="text-sm font-semibold text-gray-700">{t("Background Style")}</span>
                                <div className="relative">
                                  <select
                                    value={backgroundStyle}
                                    onChange={(e) => setBackgroundStyle(e.target.value)}
                                    className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                  >
                                    {[
                                      "Luxury Palace / Haveli",
                                      "Modern Minimalist Studio",
                                      "Indian Traditional Courtyard",
                                      "Lush Green Garden",
                                      "Historic Temple Background",
                                      "Elegant Indoors with Soft Lighting",
                                      "Rustic Heritage Street"
                                    ].map((bg) => (
                                      <option key={bg} value={bg}>
                                        {t(bg)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                                </div>
                              </div>

                              {/* Saree Colour Hint Input */}
                              <div className="space-y-2">
                                <span className="text-sm font-semibold text-gray-700">{t("Garment Color Hint")}</span>
                                <input
                                  type="text"
                                  value={sareeColourHint}
                                  onChange={(e) => setSareeColourHint(e.target.value)}
                                  placeholder={t("e.g. Royal Blue, Rani Pink") || "e.g. Royal Blue, Rani Pink"}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder:text-gray-400"
                                />
                              </div>
                            </div>
                          </div>
                          <UploadDesignBox
                            label={t("Model and Background") || "Model and Background"}
                            value={uploads["pose_model_bg"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, pose_model_bg: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload a photo of a model or background to copy look.") || "Copy model style reference"}
                            heightClass="h-32"
                          />
                          <UploadDesignBox
                            label={t("Pose(s)") || "Pose(s)"}
                            value={uploads["pose_ref"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, pose_ref: url }))}
                            placeholderText={t("Click to upload a file or drag & drop") || "Click to upload a file or drag & drop"}
                            helperText={t("Upload pose reference to mimic.") || "Mimic specific poses"}
                            heightClass="h-32"
                          />
                          <div className="mt-6 pt-4 border-t border-gray-100">
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={usePoseLibrary}
                                onChange={(e) => setUsePoseLibrary(e.target.checked)}
                                className="mt-1.5 rounded border-gray-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <div className="bg-pink-600 rounded p-1 shrink-0">
                                  <Sparkles className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-[15px] font-medium text-gray-900 leading-tight group-hover:text-pink-600 transition-colors">
                                  {t("Select poses from prompt / image library")}
                                </span>
                              </div>
                            </label>
                            
                            {usePoseLibrary && (
                              <div className="flex flex-col w-full pl-8">
                                <div className="mt-5 space-y-5 w-full">
                                  <div className="space-y-3">
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                      <input
                                        type="radio"
                                        name="pose_lib_type"
                                        checked={poseLibraryType === "prompt"}
                                        onChange={() => setPoseLibraryType("prompt")}
                                        className="w-4 h-4 accent-pink-600 cursor-pointer"
                                      />
                                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                        {t("Pose Prompt Library")}
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                      <input
                                        type="radio"
                                        name="pose_lib_type"
                                        checked={poseLibraryType === "image"}
                                        onChange={() => setPoseLibraryType("image")}
                                        className="w-4 h-4 accent-pink-600 cursor-pointer"
                                      />
                                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                        {t("Pose Image Library")}
                                      </span>
                                    </label>
                                  </div>
                                  
                                  {poseLibraryType === "prompt" ? (
                                    <>
                                      <div className="space-y-2">
                                        <span className="text-sm font-semibold text-gray-700 block">{t("Number of Poses")}</span>
                                        <div className="relative w-24">
                                          <select 
                                            value={numPoses} 
                                            onChange={(e) => setNumPoses(Number(e.target.value))}
                                            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                          >
                                            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                                          </select>
                                          <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-900 pointer-events-none" />
                                        </div>
                                      </div>
                                      
                                      <div className="border border-gray-200 rounded-xl overflow-hidden mt-2">
                                        <div className="flex items-center justify-between p-3.5 bg-gray-50 border-b border-gray-200">
                                          <span className="text-sm font-semibold text-gray-700">{t("Edit Pose Prompts")}</span>
                                          <ChevronUp className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <div className="p-4 bg-white space-y-4">
                                          <div className="flex justify-between items-start gap-4">
                                            <p className="text-[13px] text-gray-500 leading-relaxed pr-4">
                                              {t("Customise the text description for each pose. Click a pose to expand and edit.")}
                                            </p>
                                            <button 
                                              onClick={() => setPosePrompts(DEFAULT_POSES.map(p => p.desc))}
                                              className="shrink-0 flex items-center gap-1.5 text-[13px] text-pink-600 font-medium hover:text-pink-700"
                                            >
                                              <RefreshCcw className="h-3.5 w-3.5" /> {t("Reset to Default")}
                                            </button>
                                          </div>
                                          
                                          <div className="space-y-2.5 h-[320px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                                            {DEFAULT_POSES.slice(0, numPoses).map((pose, index) => (
                                              <div key={pose.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <button 
                                                  onClick={() => setExpandedPose(expandedPose === pose.id ? null : pose.id)}
                                                  className="w-full flex items-center justify-between p-3.5 bg-[#F9FAFB] hover:bg-gray-100 transition-colors text-left"
                                                >
                                                  <span className="text-sm font-semibold text-gray-700">
                                                    {t(`Pose ${pose.id}: ${pose.label}`)}
                                                  </span>
                                                  {expandedPose === pose.id ? (
                                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                                  ) : (
                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                  )}
                                                </button>
                                                {expandedPose === pose.id && (
                                                  <div className="p-3 bg-white border-t border-gray-200 relative group">
                                                    <textarea
                                                      value={posePrompts[index]}
                                                      onChange={(e) => {
                                                        const newPrompts = [...posePrompts];
                                                        newPrompts[index] = e.target.value;
                                                        setPosePrompts(newPrompts);
                                                      }}
                                                      className="w-full h-24 text-[13px] text-gray-700 bg-white border border-transparent hover:border-gray-200 focus:border-pink-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition-colors"
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="space-y-3">
                                      <span className="text-sm font-medium text-gray-800 block">
                                        {t("Select Poses")} ({selectedImagePoses.length} {t("Selected")})
                                      </span>
                                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
                                        <div className="grid grid-cols-4 gap-2.5">
                                          {[1,2,3,4,5,6,7,8].map(poseNum => {
                                            const isSelected = selectedImagePoses.includes(poseNum);
                                            return (
                                              <div 
                                                key={poseNum}
                                                onClick={() => {
                                                  if (isSelected) {
                                                    setSelectedImagePoses(prev => prev.filter(p => p !== poseNum));
                                                  } else {
                                                    setSelectedImagePoses(prev => [...prev, poseNum]);
                                                  }
                                                }}
                                                className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all ${
                                                  isSelected ? "ring-2 ring-pink-500 ring-offset-1" : "border border-gray-200 hover:border-gray-300"
                                                }`}
                                              >
                                                <img 
                                                  src={`/poses/${generateFor && ["man's kurta", "men's dress", "men's innerwear"].includes(generateFor.toLowerCase().trim()) ? "male_pose" : "pose"}${poseNum}.${generateFor && ["man's kurta", "men's dress", "men's innerwear"].includes(generateFor.toLowerCase().trim()) ? "png" : "webp"}`} 
                                                  alt={`Pose ${poseNum}`} 
                                                  className="absolute inset-0 w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 pt-8 pb-1.5 px-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-center z-10">
                                                  <span className="text-white text-xs font-medium tracking-wide">
                                                    Pose {poseNum}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                      {selectedImagePoses.length === 0 && (
                                        <p className="text-red-600 text-sm mt-1">{t("Please select at least one pose")}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2 mt-4">
                          <UploadDesignBox
                            label={t("Flat Lay Style Reference") || "Flat Lay Style Reference"}
                            value={uploads["flat_lay_style_ref"] || ""}
                            onChange={(url) => setUploads(prev => ({ ...prev, flat_lay_style_ref: url }))}
                            placeholderText={t("Click to upload flat lay reference or drag & drop") || "Click to upload flat lay reference"}
                            helperText={t("Upload a photo showing the surface, lighting, and styling.") || "Flat lay style reference"}
                            heightClass="h-32"
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 3 */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Accordion>
                <AccordionItem value="step-3" className="border-0">
                  <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                        3
                      </span>
                      <h2 className="text-base font-bold text-gray-900">
                        {t("Branding Details")}
                      </h2>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-4 pl-12">
                    <div className="space-y-6">
                      <div className="space-y-2 mt-2">
                        <UploadDesignBox
                          label={t("Brand Logo") || "Brand Logo"}
                          value={uploads["image_brand_logo"] || ""}
                          onChange={(url) => setUploads(prev => ({ ...prev, image_brand_logo: url }))}
                          placeholderText={t("Click to upload logo or drag & drop") || "Click to upload logo"}
                          helperText={t("Upload brand logo watermark image.") || "Brand logo watermark"}
                          heightClass="h-28"
                        />
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={addCenterWatermark}
                          onChange={(e) => setAddCenterWatermark(e.target.checked)}
                          className="mt-1 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700 leading-tight">
                            {t("Add brand logo as center watermark")}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {t("Places a faint brand logo in the center of the image (requires brand logo upload).")}
                          </span>
                        </div>
                      </label>
                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t("Brand Name")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                        <input 
                          type="text" 
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder={t("e.g. Royal Silks")}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t("Design Number")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                        <input 
                          type="text" 
                          value={designNumber}
                          onChange={(e) => setDesignNumber(e.target.value)}
                          placeholder={t("e.g. RS-2024-001")}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder:text-gray-400"
                        />
                      </div>

                      {(brandName.trim() !== "" || designNumber.trim() !== "") && (
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <span className="text-sm font-semibold text-gray-700">{t("Font Style")}</span>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{t("Size:")}</span>
                                <div className="flex items-center border border-gray-200 rounded bg-white overflow-hidden h-7">
                                  <input 
                                    type="text" 
                                    value={fontSize} 
                                    readOnly
                                    className="w-8 text-center text-[11px] font-bold text-gray-700 bg-transparent outline-none"
                                  />
                                  <span className="text-[10px] text-gray-400 mr-1">%</span>
                                  <div className="flex flex-col border-l border-gray-100">
                                    <button 
                                      onClick={() => setFontSize(prev => Math.min(15, prev + 0.5))}
                                      className="p-0.5 hover:bg-gray-50 text-gray-400 border-b border-gray-100 leading-[0]"
                                    >
                                      <ChevronUp className="h-2 w-2" />
                                    </button>
                                    <button 
                                      onClick={() => setFontSize(prev => Math.max(0.5, prev - 0.5))}
                                      className="p-0.5 hover:bg-gray-50 text-gray-400 leading-[0]"
                                    >
                                      <ChevronDown className="h-2 w-2" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={isBold}
                                  onChange={(e) => setIsBold(e.target.checked)}
                                  className="rounded border-gray-300 text-pink-500 focus:ring-pink-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs font-medium text-gray-700">{t("Bold")}</span>
                              </label>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">{t("Color:")}</span>
                                <div className="flex gap-1.5 items-center">
                                  <button 
                                    onClick={() => setFontColor("dark")}
                                    className={`w-[18px] h-[18px] rounded-full bg-black border-2 ${fontColor === "dark" ? "border-pink-500 ring-1 ring-pink-500 ring-offset-1" : "border-transparent"}`}
                                  />
                                  <button 
                                    onClick={() => setFontColor("white")}
                                    className={`w-[18px] h-[18px] rounded-full bg-white border-2 ${fontColor === "white" ? "border-pink-500 ring-1 ring-pink-500 ring-offset-1" : "border-gray-200"}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-sm font-semibold text-gray-700">{t("Text Position")}</span>
                            <div className="grid grid-cols-2 gap-2 max-w-[240px]">
                              {["top_left", "top_right", "bottom_left", "bottom_right"].map((pos) => (
                                <button
                                  key={pos}
                                  onClick={() => setTextPosition(pos)}
                                  className={`py-1.5 rounded text-[13px] font-medium border transition-colors ${
                                    textPosition === pos 
                                      ? "bg-pink-50 border-pink-300 text-pink-600" 
                                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                  }`}
                                >
                                  {t(pos.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 4 */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Accordion>
                <AccordionItem value="step-4" className="border-0">
                  <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                        4
                      </span>
                      <h2 className="text-base font-bold text-gray-900">
                        {t("AI Instructions")}
                      </h2>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-4 pl-12">
                    <div className="space-y-6 mt-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={optimiseEcommerce}
                          onChange={(e) => handleOptimiseEcommerceChange(e.target.checked)}
                          className="mt-1 rounded border-gray-300 text-pink-500 focus:ring-pink-500" 
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700 leading-tight">
                            {t("Optimise for Ecommerce Upload")}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {t("Automatically sets 1K resolution, Portrait (3:4) aspect ratio, and JPEG format.")}
                          </span>
                        </div>
                      </label>
                      <div className={`space-y-2 ${optimiseEcommerce ? "opacity-60" : ""}`}>
                        <span className="text-sm font-semibold text-gray-700">{t("Output Format")}</span>
                        <div className="flex gap-2">
                          <button
                            disabled={optimiseEcommerce}
                            onClick={() => setOutputFormat("png")}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-colors border ${
                              outputFormat === "png" ? "bg-pink-50 border-pink-200 text-pink-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            } ${optimiseEcommerce ? "cursor-not-allowed" : ""}`}
                          >
                            {t("PNG")}
                          </button>
                          <button
                            disabled={optimiseEcommerce}
                            onClick={() => setOutputFormat("jpeg")}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-colors border ${
                              outputFormat === "jpeg" ? "bg-pink-50 border-pink-200 text-pink-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            } ${optimiseEcommerce ? "cursor-not-allowed" : ""}`}
                          >
                            {t("JPEG")}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t("Edit / Style Prompt")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                        <textarea 
                          rows={3}
                          placeholder={t("e.g. Add 4 color transitions: mehendi (starting color), pista, firozi, and rani. Include...")}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder:text-gray-400 resize-y"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t("Aspect Ratio")}</span>
                        <div className="relative">
                          <select 
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            disabled={optimiseEcommerce}
                            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                          >
                            <option value="3:4 - Portrait">{t("3:4 - Portrait")}</option>
                            <option value="4:3 - Landscape">{t("4:3 - Landscape")}</option>
                            <option value="1:1 - Square">{t("1:1 - Square")}</option>
                            <option value="2:3 - Tall Portrait (4:6, 6:9, Default)">{t("2:3 - Tall Portrait (4:6, 6:9, Default)")}</option>
                            <option value="3:2 - Wide Landscape">{t("3:2 - Wide Landscape")}</option>
                            <option value="9:16 - Phone/Stories">{t("9:16 - Phone/Stories")}</option>
                            <option value="16:9 - Widescreen">{t("16:9 - Widescreen")}</option>
                            <option value="4:5 - Instagram Portrait">{t("4:5 - Instagram Portrait")}</option>
                            <option value="5:4 - Instagram Landscape">{t("5:4 - Instagram Landscape")}</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-900 pointer-events-none" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t("Resolution")}</span>
                        <div className="relative">
                          <select 
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            disabled={optimiseEcommerce}
                            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                          >
                            <option value="1K">{t("1K")}</option>
                            <option value="2K">{t("2K")}</option>
                            <option value="4K">{t("4K")}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </>
        ) : activeTab === "video" ? (
          <div className="space-y-6">
            {/* Step 1: Category */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                  1
                </span>
                <h2 className="text-base font-bold text-gray-900">{t("Category")}</h2>
              </div>
              <RadioGroup
                value={videoCategory}
                onValueChange={setVideoCategory}
                className="grid grid-cols-2 gap-2.5"
              >
                {[
                  { id: "apparel", label: t("Apparel"), icon: <ImageIcon className="h-4 w-4" /> },
                  { id: "jewelry", label: t("Jewelry"), icon: <RefreshCcw className="h-4 w-4" /> },
                ].map((item) => (
                  <Label
                    key={item.id}
                    htmlFor={`video-${item.id}`}
                    className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-all ${
                      videoCategory === item.id
                        ? "border-pink-500 bg-pink-50/50 text-pink-600"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <RadioGroupItem
                      value={item.id}
                      id={`video-${item.id}`}
                      className="sr-only"
                    />
                    {item.icon}
                    <span className="font-semibold">{item.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Step 2: Reference Image */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                  2
                </span>
                <h2 className="text-base font-bold text-gray-900">{t("Reference Image")} <span className="text-red-500">*</span></h2>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{t("Upload an image to animate into video")}</p>
                <UploadDesignBox
                  label={t("Reference Image") || "Reference Image"}
                  value={uploads["video_reference_image"] || ""}
                  onChange={(url) => setUploads(prev => ({ ...prev, video_reference_image: url }))}
                  placeholderText={t("Click to upload reference image or drag & drop") || "Click to upload reference image or drag & drop"}
                  helperText={t("Upload reference image to animate") || "Upload reference image"}
                  heightClass="h-80"
                />
              </div>
            </div>

            {/* Step 3: Edit / Style Prompt */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                  3
                </span>
                <h2 className="text-base font-bold text-gray-900">{t("Edit / Style Prompt")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></h2>
              </div>
              <div className="relative group">
                <textarea 
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="e.g. Add 4 color transitions: mehendi (starting color), pista, ferozi, and rani. Include Bollywood music. No quick or abnormal movements."
                  className="w-full h-24 border border-gray-200 rounded-lg p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none bg-white transition-all group-hover:border-gray-300"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-0.5 hover:bg-gray-100 rounded text-gray-400">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button className="p-0.5 hover:bg-gray-100 rounded text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setVideoPrompt(t("video_example_prompt"))}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Wand2 className="h-3 w-3" /> {t("Use example prompt")}
              </button>
            </div>

            {/* Step 4: Video Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                  4
                </span>
                <h2 className="text-base font-bold text-gray-900">{t("Video Settings")}</h2>
              </div>
              
              <div className="space-y-2.5">
                <span className="text-sm font-semibold text-gray-700">{t("Duration")}</span>
                <div className="flex flex-wrap gap-2">
                  {["6s", "10s", "15s", "30s", "45s"].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setVideoDuration(dur)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                        videoDuration === dur
                          ? "border-pink-500 bg-pink-50 text-pink-600 ring-2 ring-pink-500/10"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-medium ml-1">
                  {videoDuration === "15s" ? "15 credits" : 
                   videoDuration === "6s" ? "6 credits" :
                   videoDuration === "10s" ? "10 credits" :
                   videoDuration === "30s" ? "30 credits" : "45 credits"}
                </span>
              </div>

              <div className="space-y-2.5">
                <span className="text-sm font-semibold text-gray-700">{t("Aspect Ratio")}</span>
                <div className="relative">
                  <select 
                    value={videoAspectRatio}
                    onChange={(e) => setVideoAspectRatio(e.target.value)}
                    className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white shadow-sm"
                  >
                    <option value="9:16 (Reels/Shorts)">{t("9:16 (Reels/Shorts)")}</option>
                    <option value="3:4 (Portrait)">{t("3:4 (Portrait)")}</option>
                    <option value="2:3 (Tall Portrait)">{t("2:3 (Tall Portrait)")}</option>
                    <option value="1:1 (Square)">{t("1:1 (Square)")}</option>
                    <option value="4:3 (Landscape)">{t("4:3 (Landscape)")}</option>
                    <option value="3:2 (Wide)">{t("3:2 (Wide)")}</option>
                    <option value="16:9 (YouTube)">{t("16:9 (YouTube)")}</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-gray-400 ml-1 font-medium">{t("Select output format")}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button className="w-full h-11 bg-slate-400 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 opacity-80 cursor-not-allowed">
                <Sparkles className="h-4 w-4" /> {t("Preview Generation Plan")}
              </button>
              <button className="w-full h-11 border border-pink-200 bg-white text-pink-600 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-pink-50 transition-colors">
                <Video className="h-4 w-4" /> {t("Add Music and Logo")}
              </button>
            </div>
          </div>
            ) : activeTab === "combine" ? (
              <div className="space-y-6">
                {/* Step 1: Upload Garments */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-pink-500 text-white text-xs font-semibold">
                      1
                    </span>
                    <h2 className="text-base font-bold text-gray-900">{t("Upload Garments") || "Upload Garments"}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <UploadDesignBox
                      label={t("Upload Saree") || "Upload Saree"}
                      value={combineSaree}
                      onChange={(url) => setCombineSaree(url)}
                      placeholderText={t("Saree Image") || "Saree Image"}
                      helperText={t("Main saree fabric/pattern") || "Main saree fabric"}
                      heightClass="h-32"
                    />
                    <UploadDesignBox
                      label={t("Upload Blouse") || "Upload Blouse"}
                      value={combineBlouse}
                      onChange={(url) => setCombineBlouse(url)}
                      placeholderText={t("Blouse Design") || "Blouse Design"}
                      helperText={t("Blouse design/pattern") || "Blouse design"}
                      heightClass="h-32"
                    />
                  </div>
                </div>

                {/* Step 2: Choose Model Pose */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-pink-500 text-white text-xs font-semibold">
                      2
                    </span>
                    <h2 className="text-base font-bold text-gray-900">{t("Choose Model Pose") || "Choose Model Pose"}</h2>
                  </div>
                  
                  {/* Toggle Mode */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg max-w-xs">
                    <button
                      type="button"
                      onClick={() => setIsCustomModel(false)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isCustomModel ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                    >
                      {t("Preset Poses") || "Preset Poses"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomModel(true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isCustomModel ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                    >
                      {t("Custom Model") || "Custom Model"}
                    </button>
                  </div>

                  {!isCustomModel ? (
                    <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((poseNum) => {
                          const isSelected = selectedCombinePose === poseNum;
                          return (
                            <div
                              key={poseNum}
                              onClick={() => setSelectedCombinePose(poseNum)}
                              className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all ${
                                isSelected ? "ring-2 ring-pink-500 ring-offset-1" : "border border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <img
                                src={`/poses/pose${poseNum}.webp`}
                                alt={`Pose ${poseNum}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 flex justify-center z-10">
                                <span className="text-white text-[10px] font-semibold">
                                  Pose {poseNum}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <UploadDesignBox
                      label={t("Model Photo") || "Model Photo"}
                      value={combineModel}
                      onChange={(url) => setCombineModel(url)}
                      placeholderText={t("Click to upload model photo") || "Upload model photo"}
                      helperText={t("Front facing high-quality model photo") || "High-quality model photo"}
                      heightClass="h-40"
                    />
                  )}
                </div>

                {/* Step 3: Segment Backgrounds */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-pink-500 text-white text-xs font-semibold">
                      3
                    </span>
                    <h2 className="text-base font-bold text-gray-900">{t("Segment & Compose") || "Segment & Compose"}</h2>
                  </div>
                  <p className="text-xs text-gray-500 leading-normal">
                    {t("We will isolate your Saree and Blouse from their backgrounds so you can overlay and drape them on the canvas.")}
                  </p>
                  <button
                    type="button"
                    onClick={segmentGarments}
                    disabled={isSegmenting || !combineSaree || !combineBlouse}
                    className="w-full h-11 bg-gradient-to-r from-purple-500 to-[#db2777] hover:from-purple-600 hover:to-[#be185d] text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSegmenting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{segmentingStatus || "Segmenting..."}</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="h-4 w-4" />
                        <span>{t("Isolate & Segment Clothes") || "Isolate & Segment Clothes"}</span>
                      </>
                    )}
                  </button>
                  
                  {segmentedSaree && segmentedBlouse && (
                    <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 border border-green-100">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{t("Garments segmented! Use the Outfit Composer workspace on the right to arrange them.")}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-12 w-12 text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t("Combine Feature")}</h3>
                <p className="text-sm text-gray-500 max-w-xs">{t("Combine multiple designs into a single look. Coming soon!")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Generate Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-pink-500" />
              {t("AI Mode")}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useMockMode}
                onChange={(e) => setUseMockMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-pink-600"></div>
              <span className="ml-2 text-gray-600">{t("Mock (Preview)")}</span>
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !isFormValidForGeneration()}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-[#db2777] hover:from-purple-600 hover:to-[#be185d] text-white rounded-xl shadow-md text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("Generating...") || "Generating..."}</span>
              </>
            ) : activeTab === "combine" ? (
              <>
                <Layers className="h-4 w-4" /> {t("Generate Combined Image (1 credit)")}
              </>
            ) : activeTab === "video" ? (
              <>
                <Video className="h-4 w-4" /> {t("Generate Video")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> {t("Generate Images")}
              </>
            )}
          </button>
        </div>
      </div>

  {/* ─── RIGHT COLUMN ─── */}
  <div className="flex-1 overflow-y-auto">
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-5 flex flex-col min-h-full">
      {/* Pricing Box - Always Visible */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
          <CreditCard className="h-4 w-4 text-pink-600" /> {t("Pricing")}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-700">{t("Image Generation")}</span>
            <span className="text-sm font-bold text-pink-600">
              {t("1 credit")}{" "}
              <span className="text-gray-400 font-normal">{t("/ image")}</span>
            </span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-700">
              {t("Video Generation (up to 45s)")}
            </span>
            <span className="text-sm font-bold text-purple-600">
              {t("1 credit")}{" "}
              <span className="text-gray-400 font-normal">{t("/ second")}</span>
            </span>
          </div>
        </div>
            <div className="mt-4 flex gap-2 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
              <p className="leading-relaxed">
                {t("pricing_desc_1")}
                <br />
                <span className="italic text-gray-400">
                  {t("pricing_desc_2")}
                </span>
              </p>
            </div>
          </div>

          {/* Generate / History tabs */}
          <div className="flex items-center gap-0 border-b border-gray-200 mb-6">
            <button
              onClick={() => setRightTab("generate")}
              className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                rightTab === "generate"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Wand2 className="h-4 w-4" /> {t("Generate")}
            </button>
            <button
              onClick={() => setRightTab("history")}
              className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                rightTab === "history"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <History className="h-4 w-4" /> {t("History")}
            </button>
          </div>

          {rightTab === "generate" ? (
            <>
              {/* Billing / API Error Banner */}
              {generationError && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2.5 mb-4 border ${
                  generationError.code === "BILLING_EXHAUSTED" 
                    ? "bg-amber-50 text-amber-800 border-amber-200" 
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="leading-snug">{generationError.message}</p>
                    {generationError.code === "BILLING_EXHAUSTED" && (
                      <a 
                        href="https://replicate.com/account/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-1.5 text-xs font-bold text-amber-700 underline hover:text-amber-900"
                      >
                        → Add credit on Replicate
                      </a>
                    )}
                    {generationError.message.includes("Replicate:") && (
                      <a 
                        href="https://replicate.com/account/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-xs font-bold text-red-700 underline hover:text-red-950 mr-4"
                      >
                        → Check Replicate Billing
                      </a>
                    )}
                    {generationError.message.includes("Gemini:") && (
                      <div className="mt-1.5 text-xs text-red-600">
                        <span className="font-semibold">Gemini Tip:</span> Ensure billing is enabled for your Google AI Studio project or create a new key. Go to <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-red-700 hover:text-red-950">Google AI Studio</a>.
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setGenerationError(null)} 
                    className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {(() => {
                const currentGen = recentGenerations.find(g => g.id === currentGenId);
                const showPendingUI = isGenerating || (currentGen && (currentGen.status === "pending" || currentGen.status === "processing"));
                
                if (currentGen || isGenerating) {
                  const isPending = showPendingUI;
                  const isDone = currentGen && currentGen.status === "done" && !isGenerating;
                  const isFailed = currentGen && currentGen.status === "failed" && !isGenerating;

                  const mainKey = `${generateFor.toLowerCase().replace(/[^a-z0-9]/g, "_")}_design`;
                  const uploadedImg = uploads[mainKey] || uploads["saree_design"] || Object.values(uploads)[0];
                  const displayImg = isDone ? currentGen.generated_image_url : (currentGen?.original_image_url || uploadedImg);

                  return (
                    <div className="mb-6">
                      {/* Download ZIP Button */}
                      <button
                        disabled={!isDone}
                        onClick={() => {
                          if (displayImg) {
                            downloadImage(displayImg, `sareeviz-gen-${currentGen ? currentGen.id.substring(0, 8) : "new"}.png`);
                          }
                        }}
                        className={`w-full h-11 rounded-xl shadow-sm text-sm font-semibold flex items-center justify-center gap-2 mb-4 border transition-all
                          ${isDone 
                            ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800" 
                            : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                          }
                        `}
                      >
                        <Download className="h-4 w-4" />
                        {t("Download All (ZIP)") || "Download All (ZIP)"}
                      </button>

                      {/* Status Banner */}
                      {isPending && (
                        <div className="bg-pink-50 text-pink-600 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 mb-6 border border-pink-100/50 animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t("Generating... 1/1 Variations...") || "Generating... 1/1 Variations..."}</span>
                        </div>
                      )}

                      {isDone && (
                        <div className="bg-green-50 text-green-600 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 mb-6 border border-green-100/50">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t("Generation completed successfully!") || "Generation completed successfully!"}</span>
                        </div>
                      )}

                      {isFailed && (
                        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 mb-6 border border-red-100/50">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span>{t("Generation failed. Please try again.") || "Generation failed. Please try again."}</span>
                        </div>
                      )}

                      {/* Card Display */}
                      <div className="flex justify-center mb-6">
                        <div className="relative aspect-[3/4] w-[260px] bg-white rounded-xl border border-gray-200 overflow-hidden group shadow-sm flex flex-col justify-center items-center">
                          {isPending && (
                            <>
                              {displayImg && (
                                <img
                                  src={displayImg}
                                  alt="Original preview"
                                  className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xs"
                                />
                              )}
                              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                                <Loader2 className="h-8 w-8 text-pink-500 animate-spin mb-2" />
                                <span className="text-xs text-gray-500 font-bold capitalize animate-pulse">
                                  {t("Generating...") || "Generating..."}
                                </span>
                              </div>
                            </>
                          )}

                          {isDone && displayImg && (
                            <>
                              {currentGen?.model_settings?.is_mock ? (
                                <div className="w-full h-full flex flex-col relative select-none bg-gradient-to-b from-gray-50 to-gray-100">
                                  {/* Top: Model Pose */}
                                  <div className="h-[55%] w-full relative">
                                    <img
                                      src={`/poses/pose${getPoseNum(currentGen?.model_settings?.modelPose)}.webp`}
                                      alt="Base Pose"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-[7px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      {t("Model Pose") || "Model Pose"}
                                    </div>
                                  </div>
                                  {/* Divider with arrow */}
                                  <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-1 shadow-md border border-gray-200">
                                    <span className="text-[10px] font-bold text-pink-600">+</span>
                                  </div>
                                  {/* Bottom: Garment Fabric */}
                                  <div className="h-[45%] w-full relative">
                                    <img
                                      src={currentGen?.original_image_url || uploadedImg}
                                      alt="Garment Design"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-1.5 left-1.5 bg-pink-600 text-[7px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      {t("Your Design") || "Your Design"}
                                    </div>
                                  </div>
                                  {/* Badge Overlay */}
                                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 text-white text-[8px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shadow-md">
                                    ⚡ {t("Preview Only — Add API Credit for AI Try-On") || "Preview Only — Add API Credit for AI Try-On"}
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={displayImg}
                                  alt="Generated result"
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {/* Hover Action Overlay */}
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200 z-10">
                                <button
                                  onClick={() => setSelectedVideo({ title: `Project: ${currentGen ? currentGen.id.substring(0, 8) : "new"}`, src: displayImg })}
                                  className="p-1.5 rounded-lg bg-white text-gray-900 shadow-sm hover:scale-105 transition-transform"
                                  title={t("View Image") || "View Image"}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => downloadImage(displayImg, `sareeviz-gen-${currentGen ? currentGen.id.substring(0, 8) : "new"}.png`)}
                                  className="p-1.5 rounded-lg bg-white text-gray-900 shadow-sm hover:scale-105 transition-transform"
                                  title={t("Download Image") || "Download Image"}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}

                          {isFailed && (
                            <div className="text-center p-6">
                              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
                              <p className="text-sm font-bold text-gray-800">{t("Failed") || "Failed"}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // If activeTab === "combine" AND we have segmented garments, show the Outfit Composer
                if (activeTab === "combine" && segmentedSaree && segmentedBlouse) {
                  return (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-pink-500" />
                          {t("Outfit Composer") || "Outfit Composer"}
                        </h3>
                        <button
                          onClick={() => {
                            // Auto arrange defaults
                            setBlouseLayer({ x: 25, y: 12, scale: 0.5, rotation: 0, zIndex: 1 });
                            setSareeLayer({ x: 10, y: 35, scale: 0.8, rotation: 0, zIndex: 2 });
                          }}
                          className="text-xs font-bold text-pink-600 hover:text-pink-800 transition-colors flex items-center gap-1"
                        >
                          <RefreshCcw className="h-3 w-3" />
                          {t("Auto-Arrange") || "Auto-Arrange"}
                        </button>
                      </div>

                      {/* Canvas Container */}
                      <div className="flex justify-center mb-6">
                        <div className="relative aspect-[3/4] w-[320px] bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 overflow-hidden shadow-md">
                          {/* Blouse Image */}
                          <img
                            src={segmentedBlouse}
                            style={{
                              position: "absolute",
                              left: `${blouseLayer.x}%`,
                              top: `${blouseLayer.y}%`,
                              width: `${blouseLayer.scale * 100}%`,
                              transform: `rotate(${blouseLayer.rotation}deg)`,
                              zIndex: blouseLayer.zIndex,
                            }}
                            alt="Segmented Blouse"
                            className={`cursor-pointer transition-all duration-75 select-none ${
                              selectedLayer === "blouse" ? "ring-2 ring-pink-500 ring-offset-2 rounded" : ""
                            }`}
                            onClick={() => setSelectedLayer("blouse")}
                          />

                          {/* Saree Image */}
                          <img
                            src={segmentedSaree}
                            style={{
                              position: "absolute",
                              left: `${sareeLayer.x}%`,
                              top: `${sareeLayer.y}%`,
                              width: `${sareeLayer.scale * 100}%`,
                              transform: `rotate(${sareeLayer.rotation}deg)`,
                              zIndex: sareeLayer.zIndex,
                            }}
                            alt="Segmented Saree"
                            className={`cursor-pointer transition-all duration-75 select-none ${
                              selectedLayer === "saree" ? "ring-2 ring-pink-500 ring-offset-2 rounded" : ""
                            }`}
                            onClick={() => setSelectedLayer("saree")}
                          />
                          
                          {/* Selected Indicator Badge */}
                          <div className="absolute top-3 left-3 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm select-none z-30">
                            {t("Editing:")} {selectedLayer.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Controls Sliders */}
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-4">
                        {/* Selector Tab */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedLayer("saree")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              selectedLayer === "saree"
                                ? "bg-white border-pink-200 text-pink-600 shadow-sm"
                                : "bg-transparent border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {t("Saree Layer")}
                          </button>
                          <button
                            onClick={() => setSelectedLayer("blouse")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              selectedLayer === "blouse"
                                ? "bg-white border-pink-200 text-pink-600 shadow-sm"
                                : "bg-transparent border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {t("Blouse Layer")}
                          </button>
                        </div>

                        {/* Sliders */}
                        {(() => {
                          const layer = selectedLayer === "saree" ? sareeLayer : blouseLayer;
                          const setLayer = selectedLayer === "saree" ? setSareeLayer : setBlouseLayer;
                          
                          return (
                            <div className="space-y-3.5">
                              {/* Position X */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                  <span>{t("Position X")}</span>
                                  <span>{layer.x}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="-50"
                                  max="150"
                                  value={layer.x}
                                  onChange={(e) => setLayer(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                />
                              </div>

                              {/* Position Y */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                  <span>{t("Position Y")}</span>
                                  <span>{layer.y}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="-50"
                                  max="150"
                                  value={layer.y}
                                  onChange={(e) => setLayer(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                />
                              </div>

                              {/* Scale */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                  <span>{t("Scale (Size)")}</span>
                                  <span>{Math.round(layer.scale * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="10"
                                  max="300"
                                  value={Math.round(layer.scale * 100)}
                                  onChange={(e) => setLayer(prev => ({ ...prev, scale: parseFloat(e.target.value) / 100 }))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                />
                              </div>

                              {/* Rotation */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                  <span>{t("Rotation")}</span>
                                  <span>{layer.rotation}°</span>
                                </div>
                                <input
                                  type="range"
                                  min="-180"
                                  max="180"
                                  value={layer.rotation}
                                  onChange={(e) => setLayer(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                />
                              </div>

                              {/* Layer Order */}
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                                <span className="text-xs font-semibold text-gray-600">{t("Layer Order:")}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedLayer === "saree") {
                                      setSareeLayer(prev => ({ ...prev, zIndex: prev.zIndex === 2 ? 1 : 2 }));
                                      setBlouseLayer(prev => ({ ...prev, zIndex: prev.zIndex === 2 ? 1 : 2 }));
                                    } else {
                                      setBlouseLayer(prev => ({ ...prev, zIndex: prev.zIndex === 2 ? 1 : 2 }));
                                      setSareeLayer(prev => ({ ...prev, zIndex: prev.zIndex === 2 ? 1 : 2 }));
                                    }
                                  }}
                                  className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-md transition-colors shadow-sm"
                                >
                                  {selectedLayer === "saree"
                                    ? sareeLayer.zIndex === 2 ? t("Send Saree to Back") : t("Bring Saree to Front")
                                    : blouseLayer.zIndex === 2 ? t("Send Blouse to Back") : t("Bring Blouse to Front")}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Main Trigger Call-to-action */}
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !isFormValidForGeneration()}
                        className="w-full mt-4 h-11 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        {t("Generate Multi-Garment Try-On") || "Generate Try-On"}
                      </button>
                    </div>
                  );
                }

                // If no active/last generation, show the default empty state
                return (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-16 px-8 mb-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                      <ImageIcon className="h-7 w-7 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {t("No content generated yet")}
                    </h3>
                    <p className="text-sm text-gray-500 text-center max-w-xs">
                      {t("Upload your design and click Generate Images or Generate Video.")}
                    </p>
                  </div>
                );
              })()}

              {/* Example Videos */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {t("Example Videos")}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{t("See what you can create")}</p>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                  {[
                    {
                      title: "video1-simple-15",
                      img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80",
                      videoSrc: "/videos/video1-simple-15.mp4"
                    },
                    {
                      title: "video2-saree-30",
                      img: "https://images.unsplash.com/photo-1583391733959-b1580228d11c?w=400&q=80",
                      videoSrc: "/videos/video2-saree-30.mp4"
                    },
                    {
                      title: "video3-transition-logo-30",
                      img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80",
                      videoSrc: "/videos/video3-transition-logo-30.mp4"
                    },
                  ].map((v) => (
                    <div
                      key={v.title}
                      onClick={() => setSelectedVideo({ title: v.title, src: v.videoSrc })}
                      className="shrink-0 w-[200px] bg-white rounded-lg border border-gray-200 overflow-hidden group cursor-pointer transition-transform hover:shadow-md"
                    >
                      <div className="h-28 bg-gray-800 relative">
                        <video
                          src={`${v.videoSrc}#t=0.1`}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                          preload="metadata"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-1 group-hover:scale-110 transition-transform">
                            <PlayCircle className="h-8 w-8 text-gray-900" />
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-gray-700">{v.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : recentGenerations.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {recentGenerations.map((gen) => {
                const isOutput = gen.status === "done" && gen.generated_image_url;
                const displayImg = isOutput ? gen.generated_image_url : gen.original_image_url;
                return (
                  <div
                    key={gen.id}
                    className="relative aspect-[3/4] bg-white rounded-xl border border-gray-200 overflow-hidden group shadow-sm flex flex-col hover:shadow-md transition-shadow"
                  >
                    {displayImg ? (
                      gen.model_settings?.is_mock ? (
                        <div className="w-full h-full flex flex-col relative select-none bg-gradient-to-b from-gray-50 to-gray-100">
                          {/* Top: Model Pose */}
                          <div className="h-[55%] w-full relative">
                            <img
                              src={`/poses/pose${getPoseNum(gen.model_settings?.modelPose)}.webp`}
                              alt="Base Pose"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Divider */}
                          <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-gray-200">
                            <span className="text-[9px] font-bold text-pink-600">+</span>
                          </div>
                          {/* Bottom: Garment */}
                          <div className="h-[45%] w-full relative">
                            <img
                              src={gen.original_image_url}
                              alt="Garment Design"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Badge */}
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
                            ⚡ {t("Preview") || "Preview"}
                          </div>
                        </div>
                      ) : (
                        <img
                          src={displayImg}
                          alt="Generation item"
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    
                    {/* Status indicator pill */}
                    <div className="absolute top-2 left-2 z-20">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/90 ${
                        gen.status === "done"
                          ? "text-green-600 border border-green-200/50"
                          : gen.status === "pending" || gen.status === "processing"
                          ? "text-amber-600 border border-amber-200/50 animate-pulse"
                          : "text-red-600 border border-red-200/50"
                      }`}>
                        {t(gen.status)}
                      </span>
                    </div>

                    {/* Pending / Processing Loader Overlay */}
                    {(gen.status === "pending" || gen.status === "processing") && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                        <Loader2 className="h-6 w-6 text-pink-500 animate-spin mb-1.5" />
                        <span className="text-[10px] text-gray-500 font-medium capitalize animate-pulse">
                          {t(gen.status)}...
                        </span>
                      </div>
                    )}

                    {/* Action Overlay on hover */}
                    {(gen.status === "done" || gen.status === "failed") && (
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200 z-10">
                        {gen.status === "done" && (
                          <>
                            <button
                              onClick={() => setSelectedVideo({ title: `Project: ${gen.id.substring(0, 8)}`, src: displayImg })}
                              className="p-1.5 rounded-lg bg-white text-gray-900 shadow-sm hover:scale-105 transition-transform"
                              title={t("View Image") || "View Image"}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => downloadImage(displayImg, `sareeviz-gen-${gen.id.substring(0, 8)}.png`)}
                              className="p-1.5 rounded-lg bg-white text-gray-900 shadow-sm hover:scale-105 transition-transform"
                              title={t("Download Image") || "Download Image"}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          disabled={deletingId === gen.id}
                          onClick={() => handleDeleteProject(gen.id)}
                          className="p-1.5 rounded-lg bg-white text-red-600 hover:bg-red-50 shadow-sm hover:scale-105 transition-transform"
                          title={t("Delete Project") || "Delete Project"}
                        >
                          {deletingId === gen.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-24 px-8 mb-6 h-[400px]">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                <History className="h-7 w-7 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {t("No history yet")}
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {t("Your generated images will appear here")}
              </p>
            </div>
          )}

          {/* Footer Links */}
          <div className="flex flex-wrap items-center justify-between py-4 border-t border-gray-200 mt-auto text-xs gap-y-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-pink-600 font-medium">
              <Link href="#" className="hover:underline">Privacy Policy</Link>
              <span className="text-gray-300">•</span>
              <Link href="#" className="hover:underline">Terms &amp; Conditions</Link>
              <span className="text-gray-300">•</span>
              <Link href="#" className="hover:underline">Refund &amp; Cancellation</Link>
              <span className="text-gray-300">•</span>
              <Link href="#" className="hover:underline">Shipping Policy</Link>
              <span className="text-gray-300">•</span>
              <Link href="#" className="hover:underline">Contact Us</Link>
              <span className="text-gray-300">•</span>
              <Link href="#" className="hover:underline">About Us</Link>
            </div>
            <span className="text-gray-400">SareeViz • Digital delivery only</span>
          </div>
        </div>
      </div>

      {/* Media Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-3xl p-0 border-0 bg-black overflow-hidden flex flex-col shadow-2xl rounded-xl [&>button]:top-3 [&>button]:right-4 [&>button]:text-gray-500 hover:[&>button]:text-gray-900">
          <DialogHeader className="px-5 py-3.5 bg-white flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-gray-900 m-0 leading-none">
              {selectedVideo?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-[9/16] md:aspect-video bg-black flex items-center justify-center">
            {selectedVideo && (
              selectedVideo.src.includes(".mp4") || selectedVideo.src.includes("/videos/") ? (
                <video 
                  src={selectedVideo.src} 
                  controls 
                  autoPlay 
                  className="h-full max-h-[75vh] w-auto mx-auto object-contain"
                />
              ) : (
                <img 
                  src={selectedVideo.src} 
                  alt={selectedVideo.title}
                  className="h-full max-h-[75vh] w-auto mx-auto object-contain animate-fade-in"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
