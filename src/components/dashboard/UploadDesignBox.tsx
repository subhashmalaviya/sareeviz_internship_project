"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";


interface UploadDesignBoxProps {
  label: string;
  value: string; // The uploaded image public URL
  onChange: (url: string) => void;
  maxSizeMb?: number;
  bucket?: string;
  placeholderText?: string;
  helperText?: string;
  heightClass?: string;
  aspectRatioClass?: string;
}

export function UploadDesignBox({
  label,
  value,
  onChange,
  maxSizeMb = 10,
  bucket = "designs",
  placeholderText = "Click to upload or drag & drop",
  helperText = "Maximum file size 10 MB",
  heightClass = "h-48",
  aspectRatioClass = "aspect-auto"
}: UploadDesignBoxProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & State
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(value || null);

  useEffect(() => {
    setLocalPreview(value || null);
  }, [value]);


  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  };

  // Upload Logic
  const processAndUploadFile = async (file: File) => {
    setError(null);

    // 1. Validation: File size
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${maxSizeMb} MB.`);
      return;
    }

    // 2. Validation: File type (Images only)
    if (!file.type.startsWith("image/")) {
      setError("Invalid file format. Please upload an image (PNG, JPEG, WebP).");
      return;
    }

    try {
      setUploading(true);

      // Create instant local preview URL
      const previewUrl = URL.createObjectURL(file);
      setLocalPreview(previewUrl);

      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User session not found. Please log in again.");
      }

      // Generate unique path: designs/{user_id}/{timestamp}_{filename}
      const fileExt = file.name.split(".").pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, "_");
      const filePath = `${user.id}/${Date.now()}_${sanitizedName}.${fileExt}`;

      // Direct upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Trigger callback with public URL
      onChange(publicUrl);
      setLocalPreview(publicUrl);
    } catch (err: unknown) {
      console.error("Storage upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to upload image. Please try again.";
      setError(errMsg);
      setLocalPreview(value || null); // Revert preview on failure
    } finally {
      setUploading(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setLocalPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTriggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {error && (
          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </span>
        )}
      </div>

      {/* Main Dropzone / Preview Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleTriggerInput}
        className={`relative ${heightClass} ${aspectRatioClass} border-2 border-dashed rounded-xl bg-white overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group
          ${isDragActive ? "border-pink-500 bg-pink-50/20 scale-[1.01]" : "border-gray-200 hover:border-pink-300"}
          ${localPreview ? "border-solid" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {localPreview ? (
          // Visual Image Preview Mode
          <div className="relative w-full h-full">
            <img
              src={localPreview}
              alt={label}
              className="w-full h-full object-cover transition-opacity group-hover:opacity-90 duration-200"
            />
            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              title="Remove Image"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Overlay Indicator */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity duration-200">
              <Upload className="h-5 w-5 mr-1.5" />
              <span>Change Image</span>
            </div>
          </div>
        ) : (
          // Empty State Prompt Mode
          <div className="p-6 flex flex-col items-center select-none">
            <div className="bg-pink-50 rounded-full p-2.5 mb-2 transition-transform group-hover:scale-110 duration-200">
              <Upload className="h-5 w-5 text-pink-500" />
            </div>
            <span className="text-sm font-bold text-gray-900 leading-tight">
              {placeholderText}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {helperText}
            </span>
          </div>
        )}

        {/* Uploading loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-10">
            <Loader2 className="h-8 w-8 text-pink-600 animate-spin mb-2" />
            <span className="text-xs font-bold text-gray-600">Uploading to Supabase...</span>
          </div>
        )}
      </div>
    </div>
  );
}
