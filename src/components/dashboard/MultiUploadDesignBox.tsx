"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface MultiUploadDesignBoxProps {
  label: string;
  values: string[]; // List of uploaded image public URLs
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  minFiles?: number;
  maxSizeMb?: number;
  bucket?: string;
  placeholderText?: string;
  helperText?: string;
}

export function MultiUploadDesignBox({
  label,
  values,
  onChange,
  maxFiles = 6,
  minFiles = 2,
  maxSizeMb = 10,
  bucket = "designs",
  placeholderText = "Click to upload multiple files or drag & drop",
  helperText = "Batch processing supported. Upload 2-6 photos."
}: MultiUploadDesignBoxProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await processAndUploadFiles(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processAndUploadFiles(files);
    }
  };

  // Upload multiple files
  const processAndUploadFiles = async (files: File[]) => {
    setError(null);

    // 1. Filter out non-images
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Please select valid images (PNG, JPEG, WebP).");
      return;
    }

    // 2. Check if we exceed max files limit
    const spaceLeft = maxFiles - values.length;
    if (spaceLeft <= 0) {
      setError(`Maximum of ${maxFiles} images can be uploaded.`);
      return;
    }

    const filesToUpload = imageFiles.slice(0, spaceLeft);
    if (imageFiles.length > spaceLeft) {
      setError(`Only the first ${spaceLeft} images will be uploaded (limit is ${maxFiles}).`);
    }

    // 3. Check individual file sizes
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    const oversized = filesToUpload.filter(f => f.size > maxSizeBytes);
    if (oversized.length > 0) {
      setError(`Some files are too large. Maximum size per file is ${maxSizeMb} MB.`);
      return;
    }

    setUploadingCount(filesToUpload.length);

    try {
      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User session not found. Please log in again.");
      }

      const uploadedUrls: string[] = [];

      // Process parallel uploads
      await Promise.all(
        filesToUpload.map(async (file) => {
          try {
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

            uploadedUrls.push(publicUrl);
          } catch (err) {
            console.error(`Error uploading file ${file.name}:`, err);
          } finally {
            setUploadingCount(prev => Math.max(0, prev - 1));
          }
        })
      );

      if (uploadedUrls.length > 0) {
        onChange([...values, ...uploadedUrls]);
      }
    } catch (err: unknown) {
      console.error("Storage upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to upload images.";
      setError(errMsg);
    } finally {
      setUploadingCount(0);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = values.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    setError(null);
  };

  const handleTriggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {error && (
          <span className="text-[11px] text-red-500 font-medium flex items-center gap-1 max-w-[70%] text-right leading-tight">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </span>
        )}
      </div>

      {/* Grid of uploaded images */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {values.map((url, idx) => (
            <div key={url + idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group shadow-xs">
              <img
                src={url}
                alt={`Model Image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors z-10"
                title="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-1 left-1.5 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dropzone */}
      {values.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleTriggerInput}
          className={`relative h-32 border-2 border-dashed rounded-xl bg-white overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group
            ${isDragActive ? "border-pink-500 bg-pink-50/20 scale-[1.01]" : "border-gray-200 hover:border-pink-300"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-4 flex flex-col items-center select-none">
            <div className="bg-pink-50 rounded-full p-2 mb-1.5 transition-transform group-hover:scale-110 duration-200">
              <Upload className="h-4 w-4 text-pink-500" />
            </div>
            <span className="text-xs font-bold text-gray-900 leading-tight">
              {placeholderText}
            </span>
            <span className="text-[10px] text-gray-400 mt-1">
              {helperText}
            </span>
            <span className="text-[10px] text-pink-500 font-semibold mt-1">
              ({values.length}/{maxFiles} Uploaded)
            </span>
          </div>

          {/* Uploading loading overlay */}
          {uploadingCount > 0 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-10">
              <Loader2 className="h-6 w-6 text-pink-600 animate-spin mb-1.5" />
              <span className="text-[10px] font-bold text-gray-600">
                Uploading {uploadingCount} files to Supabase...
              </span>
            </div>
          )}
        </div>
      )}

      {values.length > 0 && values.length < minFiles && (
        <p className="text-[11px] text-amber-600 font-medium">
          Please upload at least {minFiles} images to combine.
        </p>
      )}
    </div>
  );
}
