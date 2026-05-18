"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FolderOpen, 
  Plus, 
  Download, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Eye, 
  Sparkles, 
  Calendar,
  X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface GenerationItem {
  id: string;
  user_id: string;
  status: string; // 'pending' | 'done' | 'failed'
  prompt: string;
  model_settings: any;
  original_image_url: string;
  generated_image_url: string;
  created_at: string;
  completed_at: string;
}

export default function ProjectsPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  // State Management
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setGenerations(data);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Deleting Generation Project
  const handleDeleteProject = async (id: string) => {
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setGenerations(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Logic
  const filteredGenerations = generations.filter(item => {
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-pink-600 animate-spin" />
          <span className="text-sm font-semibold text-gray-500">{t("Loading Gallery...") || "Loading gallery..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-y-auto bg-[#F8F9FB] px-4 md:px-8 py-8 w-full max-w-6xl mx-auto">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("Projects & Gallery") || "Projects & Gallery"}</h1>
            <p className="text-sm text-gray-500">{t("Manage your designs and AI-generated models") || "Manage your designs and AI-generated models"}</p>
          </div>
        </div>

        {/* Create New Project Shortcut */}
        <Link
          href="/dashboard"
          className="self-start sm:self-center flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-[#db2777] hover:from-purple-600 hover:to-[#be185d] text-white rounded-xl shadow-md text-sm font-bold transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span>{t("New Generation") || "New Generation"}</span>
        </Link>
      </div>

      {/* Filter Tabs & Count Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5 mb-8 gap-4">
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: t("All Projects") || "All Projects" },
            { id: "done", label: t("Completed") || "Completed" },
            { id: "pending", label: t("Processing") || "Processing" },
            { id: "failed", label: t("Failed") || "Failed" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-pink-50 border-pink-200 text-pink-600"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          {filteredGenerations.length} {t("items listed") || "items listed"}
        </div>
      </div>

      {/* Projects Grid / Empty State */}
      {filteredGenerations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-gray-300 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t("No projects found") || "No projects found"}</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            {filterStatus === "all"
              ? (t("You haven't generated any apparel models yet. Let's create your first one!") || "You haven't generated any apparel models yet. Let's create your first one!")
              : (t("No projects match the selected filter.") || "No projects match the selected filter.")}
          </p>
          {filterStatus === "all" && (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              {t("Launch AI Studio") || "Launch AI Studio"}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredGenerations.map(project => {
            const hasOutput = project.status === "done" && project.generated_image_url;
            const displayImg = hasOutput ? project.generated_image_url : project.original_image_url;
            const styleSelected = project.model_settings?.photography_style || "Model Photography";
            const dateStr = new Date(project.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric"
            });

            return (
              <div 
                key={project.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden group shadow-sm flex flex-col transition-all hover:shadow-md"
              >
                {/* Visual Thumbnail Layer */}
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden shrink-0">
                  {displayImg ? (
                    <img 
                      src={displayImg} 
                      alt="Project Garment" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                      <span className="text-xs text-gray-400">No Image</span>
                    </div>
                  )}

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 z-10">
                    <button 
                      onClick={() => setLightboxImage(displayImg)}
                      className="p-2 rounded-xl bg-white/95 text-gray-900 hover:bg-white shadow-sm hover:scale-105 transition-all"
                      title="Quick View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {hasOutput && (
                      <a 
                        href={project.generated_image_url} 
                        download={`sareeviz-gen-${project.id}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-white/95 text-gray-900 hover:bg-white shadow-sm hover:scale-105 transition-all"
                        title="Download Output"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Floating Status Badges */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 backdrop-blur-md ${
                      project.status === "done"
                        ? "bg-green-500/10 border border-green-400/20 text-green-600 bg-white/90"
                        : project.status === "pending"
                        ? "bg-amber-500/10 border border-amber-400/20 text-amber-600 bg-white/90 animate-pulse"
                        : "bg-red-500/10 border border-red-400/20 text-red-600 bg-white/90"
                    }`}>
                      {project.status === "pending" && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {dateStr}
                      </span>
                      <span className="capitalize">{styleSelected}</span>
                    </div>

                    <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                      {project.prompt || "No prompt details configured."}
                    </p>
                  </div>

                  {/* Delete Option */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      ID: {project.id.substring(0, 8)}
                    </div>
                    <button
                      disabled={deletingId === project.id}
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all"
                      title="Delete Project"
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
        >
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors shadow-md border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-black border border-white/5"
          >
            <img 
              src={lightboxImage} 
              alt="High Resolution Preview" 
              className="w-auto max-w-full max-h-[85vh] mx-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
