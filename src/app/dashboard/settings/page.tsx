"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Sparkles, 
  Upload, 
  Loader2, 
  Check, 
  ShieldAlert, 
  CreditCard,
  Settings
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserProfile {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  avatar_url: string;
}

interface UserCredits {
  balance: number;
  total_purchased: number;
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  // State Management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<UserCredits>({ balance: 0, total_purchased: 0 });
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Avatar Upload State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Messages state
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setAvatarPreview(profileData.avatar_url || null);
      }

      // 2. Fetch Credits
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select("balance, total_purchased")
        .eq("user_id", user.id)
        .single();

      if (creditsError) {
        console.error("Error fetching credits:", creditsError);
      } else if (creditsData) {
        setCredits(creditsData);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Show status notification
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Handle Full Name Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSavingProfile(true);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, full_name: fullName } : null);
      showNotification("success", t("Profile updated successfully") || "Profile updated successfully!");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update profile.";
      showNotification("error", errMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Drag-and-Drop & File Selection for Avatar Upload
  const handleAvatarFile = async (file: File) => {
    if (!profile) return;

    // Validate size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showNotification("error", t("Max image size is 5 MB") || "File too large. Maximum size is 5 MB.");
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      showNotification("error", t("Only image files are allowed") || "Invalid file format. Please upload an image.");
      return;
    }

    try {
      setUploadingAvatar(true);

      // Create local object URL for instant visual feedback
      const localUrl = URL.createObjectURL(file);
      setAvatarPreview(localUrl);

      // Define storage upload path: avatars/{user_id}/avatar_{timestamp}.ext
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar_${Date.now()}.${fileExt}`;

      // Upload file directly to Supabase avatars bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Retrieve public URL of the uploaded avatar
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update public.profiles table
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (profileUpdateError) throw profileUpdateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setAvatarPreview(publicUrl);
      showNotification("success", t("Avatar uploaded successfully") || "Avatar updated successfully!");
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Failed to upload avatar.";
      showNotification("error", errMsg);
      // Revert preview on failure
      setAvatarPreview(profile.avatar_url || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleAvatarFile(file);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-pink-600 animate-spin" />
          <span className="text-sm font-semibold text-gray-500">{t("Loading Settings...") || "Loading settings..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB] px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-pink-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("Account Settings") || "Account Settings"}</h1>
          <p className="text-sm text-gray-500">{t("Manage profile information and credits") || "Manage profile information and credits"}</p>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3.5 rounded-xl shadow-lg border text-sm font-semibold animate-in slide-in-from-bottom-5 duration-300 ${
          notification.type === "success" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {notification.type === "success" ? <Check className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Profile Details Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
              {t("Profile Details") || "Profile Details"}
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-gray-400" />
                  {t("Full Name") || "Full Name"}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("Enter your full name") || "Enter your full name"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-gray-400 hover:border-gray-300"
                />
              </div>

              {/* Email (Read-Only) */}
              <div className="space-y-2 opacity-75">
                <label className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {t("Email Address") || "Email Address"}
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
                />
              </div>

              {/* Phone (Read-Only) */}
              {profile?.phone && (
                <div className="space-y-2 opacity-75">
                  <label className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {t("Phone Number") || "Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
                  />
                </div>
              )}

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-[#db2777] hover:from-purple-600 hover:to-[#be185d] text-white rounded-xl shadow-md text-sm font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("Saving...") || "Saving..."}</span>
                    </>
                  ) : (
                    <span>{t("Save Changes") || "Save Changes"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Avatar & Credits */}
        <div className="space-y-8">
          
          {/* Avatar Settings Box */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center text-center">
            <h2 className="text-sm font-bold text-gray-700 mb-6 self-start w-full border-b border-gray-100 pb-3 text-left">
              {t("Profile Photo") || "Profile Photo"}
            </h2>

            {/* Avatar Preview & Drop Target */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("avatar-input")?.click()}
              className="relative w-32 h-32 rounded-full border-2 border-dashed border-gray-200 hover:border-pink-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer group transition-colors shadow-inner"
            >
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Profile Avatar"
                  className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-75"
                />
              ) : (
                <User className="h-12 w-12 text-gray-300" />
              )}

              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-[11px] font-bold">
                <Upload className="h-5 w-5 mb-1" />
                <span>{t("Upload new") || "Upload new"}</span>
              </div>

              {/* Uploading Spinner */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-pink-600 animate-spin" />
                </div>
              )}
            </div>

            <input 
              id="avatar-input" 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarChange}
              className="hidden" 
            />

            <span className="text-xs text-gray-400 mt-4 leading-relaxed">
              {t("Drag and drop your image, or click to browse. Max size 5 MB.") || "Drag & drop image or click to browse. Max 5 MB."}
            </span>
          </div>

          {/* Credits Balance Box */}
          <div className="bg-gradient-to-br from-[#1a1625] to-[#2d223c] rounded-2xl shadow-md p-6 text-white relative overflow-hidden">
            {/* Background glowing ornaments */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-pink-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl" />

            <div className="relative z-10 space-y-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 fill-pink-400" />
                    {t("Credit Balance") || "Credit Balance"}
                  </span>
                  <div className="text-3xl font-extrabold tracking-tight">
                    {credits.balance} <span className="text-sm font-semibold text-gray-300">{t("credits") || "credits"}</span>
                  </div>
                </div>
                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                  <CreditCard className="h-5 w-5 text-pink-400" />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{t("Total Purchased") || "Total Purchased"}</span>
                  <span className="font-bold text-gray-200">{credits.total_purchased} {t("credits") || "credits"}</span>
                </div>
              </div>

              {/* Shortcut info */}
              <p className="text-[10px] text-gray-400 leading-relaxed italic">
                {t("1 credit consumes 1 model photo generation. Up to 45 seconds of video consumes 1 credit/second.") || "1 credit per image. 1 credit per second of video generation."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
