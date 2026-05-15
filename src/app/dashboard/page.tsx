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

export default function StudioPage() {
  const { t } = useLanguage();
  const [generateFor, setGenerateFor] = useState("saree");
  const [catalogueOption, setCatalogueOption] = useState("display_rack");
  const [photographyStyle, setPhotographyStyle] = useState("model");
  const [outputFormat, setOutputFormat] = useState("png");
  const [usePoseLibrary, setUsePoseLibrary] = useState(false);
  const [poseLibraryType, setPoseLibraryType] = useState("prompt");
  const [numPoses, setNumPoses] = useState(5);
  const [posePrompts, setPosePrompts] = useState(DEFAULT_POSES.map(p => p.desc));
  const [expandedPose, setExpandedPose] = useState<number | null>(1);
  const [selectedImagePoses, setSelectedImagePoses] = useState<number[]>([]);
  const [brandName, setBrandName] = useState("");
  const [designNumber, setDesignNumber] = useState("");
  const [fontSize, setFontSize] = useState("4");
  const [isBold, setIsBold] = useState(true);
  const [fontColor, setFontColor] = useState("white");
  const [textPosition, setTextPosition] = useState("top_right");
  const [optimiseEcommerce, setOptimiseEcommerce] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("3:4 - Portrait");
  const [resolution, setResolution] = useState("1K");
  const [activeTab, setActiveTab] = useState<"image" | "video" | "combine">("image");
  const [rightTab, setRightTab] = useState<"generate" | "history">("generate");
  const [selectedVideo, setSelectedVideo] = useState<{title: string, src: string} | null>(null);

  const handleOptimiseEcommerceChange = (checked: boolean) => {
    setOptimiseEcommerce(checked);
    if (checked) {
      setOutputFormat("jpeg");
      setAspectRatio("3:4 - Portrait");
      setResolution("1K");
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden flex flex-col lg:flex-row bg-[#F8F9FB]">
      {/* ─── LEFT COLUMN ─── */}
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-gray-200 bg-white flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto pb-20">
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
                  <DropdownMenuTrigger asChild>
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
                  </DropdownMenuTrigger>
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
              {!["saree", "lehenga", "kurti", "salwar suit"].includes(generateFor.toLowerCase()) ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-gray-700">{t("Top Design")}</span>
                    <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-32">
                      <div className="bg-pink-50 rounded-full p-2 mb-2">
                        <Upload className="h-5 w-5 text-pink-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{t("Click to upload multiple files or drag & drop")}</span>
                      <span className="text-xs text-gray-400 mt-1">{t("Batch processing supported")}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-gray-700">{t("Bottom Design (Optional)")}</span>
                    <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-32">
                      <div className="bg-pink-50 rounded-full p-2 mb-2">
                        <Upload className="h-5 w-5 text-pink-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700 capitalize">
                    {t(generateFor)} {t("Design")}
                  </span>
                  <div className="border-2 border-dashed border-pink-200 rounded-xl bg-pink-50/30 overflow-hidden relative group cursor-pointer hover:border-pink-300 transition-colors">
                    <div className="h-56 flex flex-col items-center justify-center relative">
                      {/* Saree placeholder visual */}
                      <div className="absolute inset-4 bg-gradient-to-b from-[#e8d5f0] to-[#d4b8e0] rounded-lg opacity-40" />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white rounded-full p-2.5 shadow-sm border border-gray-100 mb-2">
                          <Upload className="h-5 w-5 text-pink-500" />
                        </div>
                        <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-100">
                          {t("Upload an image like this")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-accordions under Step 1 */}
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="item-1" className="bg-white rounded-xl border border-gray-200 px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold text-gray-900">
                    {t("Add Blouse / Dupatta / Pallu Design")}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-5">
                    {generateFor === "saree" ? (
                      <>
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-gray-700">{t("Blouse Design")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                          <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                            <div className="bg-pink-50 rounded-full p-2 mb-2">
                              <Upload className="h-5 w-5 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            {t("Upload a blouse reference to match its design, color, and pattern in the generated image.")}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-gray-700">{t("Dupatta Design")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                          <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                            <div className="bg-pink-50 rounded-full p-2 mb-2">
                              <Upload className="h-5 w-5 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            {t("Upload a dupatta reference to match its design, color, and pattern in the generated image.")}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-gray-700">{t("Pallu/Drape Design")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                          <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                            <div className="bg-pink-50 rounded-full p-2 mb-2">
                              <Upload className="h-5 w-5 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            {t("Upload a pallu reference to match its design, color, and pattern in the generated image.")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">{t("Upload supplementary images for detailed generation.")}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="bg-white rounded-xl border border-gray-200 px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold text-gray-900">
                    {t("Close-Up Design Reference")}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {generateFor === "saree" ? (
                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t("Close-Up Design Reference")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                        <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                          <div className="bg-pink-50 rounded-full p-2 mb-2">
                            <Upload className="h-5 w-5 text-pink-500" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          {t("Upload a close-up shot of the design to accurately generate the relevant details and texture on the apparel.")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t("Upload fabric close-ups to preserve pattern details.")}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="bg-white rounded-xl border border-gray-200 px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-semibold text-gray-900">
                    {t("Catalogue Options")}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {generateFor === "saree" ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-gray-700">{t("Colour Matching")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                          <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                            <div className="bg-pink-50 rounded-full p-2 mb-2">
                              <Upload className="h-5 w-5 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            {t("Upload a photo of matching colours options")}
                          </p>
                        </div>
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
                    ) : (
                      <p className="text-sm text-gray-500">{t("Select how many variations you need.")}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 2 */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Accordion type="single" collapsible>
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
                    {generateFor === "saree" ? (
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
                            <div className="space-y-2">
                              <span className="text-sm font-semibold text-gray-700">{t("Model and Background")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                              <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                                <div className="bg-pink-50 rounded-full p-2 mb-2">
                                  <Upload className="h-5 w-5 text-pink-500" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                {t("Upload a photo of a specific model or background to copy their look, lighting, and face.")}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-sm font-semibold text-gray-700">{t("Pose(s)")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                              <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                                <div className="bg-pink-50 rounded-full p-2 mb-2">
                                  <Upload className="h-5 w-5 text-pink-500" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                                <span className="text-xs text-gray-400 mt-1">{t("Batch processing supported")}</span>
                              </div>
                            </div>
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
                                                    src={`/poses/pose${poseNum}.webp`} 
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
                            <span className="text-sm font-semibold text-gray-700">{t("Flat Lay Style Reference")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                            <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                              <div className="bg-pink-50 rounded-full p-2 mb-2">
                                <Upload className="h-5 w-5 text-pink-500" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                              {t("Upload a photo showing the surface, lighting, and styling you want for your flat lay (e.g. marble table, wooden surface). Optional.")}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t("Configuration options will appear here.")}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 3 */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Accordion type="single" collapsible>
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
                    {generateFor === "saree" ? (
                      <div className="space-y-6">
                        <div className="space-y-2 mt-2">
                          <span className="text-sm font-semibold text-gray-700">{t("Brand Logo")} <span className="text-gray-400 font-normal">{t("(Optional)")}</span></span>
                          <div className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-xl bg-white transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center h-28">
                            <div className="bg-pink-50 rounded-full p-2 mb-2">
                              <Upload className="h-5 w-5 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{t("Click to upload a file or drag & drop")}</span>
                          </div>
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer mt-2">
                          <input type="checkbox" className="mt-1 rounded border-gray-300 text-pink-500 focus:ring-pink-500" />
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
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500">{t("Size:")}</span>
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number" 
                                      min="0.5"
                                      max="15"
                                      step="0.5"
                                      value={fontSize}
                                      onChange={(e) => setFontSize(e.target.value)}
                                      className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
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
                                      className={`w-[18px] h-[18px] rounded-full bg-gray-500 border-2 ${fontColor === "dark" ? "border-pink-500 ring-1 ring-pink-500 ring-offset-1" : "border-transparent"}`}
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
                    ) : (
                      <p className="text-sm text-gray-500">{t("Add your logo or watermark settings.")}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 4 */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Accordion type="single" collapsible>
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
                    {generateFor === "saree" ? (
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
                            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-900 pointer-events-none" strokeWidth={3} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t("Advanced prompt configuration.")}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Sticky Generate Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
          <button className="w-full h-12 bg-gradient-to-r from-purple-500 to-[#db2777] hover:from-purple-600 hover:to-[#be185d] text-white rounded-xl shadow-md text-sm font-bold transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" /> {t("Generate Images")}
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

              {/* Empty State */}
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

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-3xl p-0 border-0 bg-black overflow-hidden flex flex-col shadow-2xl rounded-xl [&>button]:top-3 [&>button]:right-4 [&>button]:text-gray-500 hover:[&>button]:text-gray-900">
          <DialogHeader className="px-5 py-3.5 bg-white flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-gray-900 m-0 leading-none">
              {selectedVideo?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-[9/16] md:aspect-video bg-black flex items-center justify-center">
            {selectedVideo && (
              <video 
                src={selectedVideo.src} 
                controls 
                autoPlay 
                className="h-full max-h-[75vh] w-auto mx-auto object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
