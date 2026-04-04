"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FolderKanban,
  Users,
  X,
  Loader2,
  Lock,
} from "lucide-react";

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  user: {
    id: string;
    display_name: string;
    position: string;
    profile_pic_url: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  members: ProjectMember[];
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    in_progress: { bg: "bg-[#D4692A]/10", text: "text-[#D4692A]", label: "In Progress" },
    completed: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Completed" },
    on_hold: { bg: "bg-gray-100", text: "text-gray-500", label: "On Hold" },
  };
  const c = config[status] || config.in_progress;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function MemberAvatars({ members }: { members: ProjectMember[] }) {
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m) => (
        <div
          key={m.id}
          className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex-shrink-0"
          title={m.user.display_name}
        >
          {m.user.profile_pic_url ? (
            <img
              src={m.user.profile_pic_url}
              alt={m.user.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#D4692A]/10 flex items-center justify-center text-[#D4692A] text-[10px] font-bold">
              {m.user.display_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
          +{extra}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setNewDescription("");
        setShowModal(false);
        await fetchProjects();
      }
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  const badge = user?.badge || "staff";
  const canCreateProject = badge === "owner" || badge === "board" || badge === "manager";

  const isMemberOfProject = (project: Project): boolean => {
    return project.members?.some((m) => m.user_id === user?.id) || false;
  };

  const canAccessProject = (project: Project): boolean => {
    // Owner and Board can click into any project
    if (badge === "owner" || badge === "board") return true;
    // Manager and Staff can only click into projects they're members of
    return isMemberOfProject(project);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-orange w-4 h-4 rounded-full bg-[#D4692A]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a1a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Projects
          </h1>
          <p className="text-sm text-[#999] mt-1">
            Manage your team projects and collaborate
          </p>
        </div>
        {canCreateProject && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4692A] text-white text-sm font-medium rounded-xl hover:bg-[#c05e24] transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Project
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-[#D4692A]" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f2ef] flex items-center justify-center mb-4">
            <FolderKanban size={28} className="text-[#D4692A]" />
          </div>
          <p className="text-lg font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            {searchQuery ? "No projects found" : "No projects yet"}
          </p>
          <p className="text-sm text-[#999]">
            {searchQuery
              ? "Try a different search term"
              : canCreateProject
                ? "Create your first project to get started"
                : "You haven't been added to any projects yet"}
          </p>
        </div>
      ) : (
        /* Project Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const hasAccess = canAccessProject(project);
            const isMember = isMemberOfProject(project);
            return (
              <button
                key={project.id}
                onClick={() => {
                  if (hasAccess) {
                    router.push(`/dashboard/projects/${project.id}`);
                  }
                }}
                className={`text-left bg-white border border-[#e8e4e0] rounded-2xl p-5 transition-all group relative ${
                  hasAccess
                    ? "hover:border-[#D4692A]/30 hover:shadow-md cursor-pointer"
                    : "opacity-75 cursor-not-allowed"
                }`}
              >
                {/* Members Only lock icon */}
                {!isMember && !hasAccess && (
                  <div className="absolute top-3 right-3">
                    <Lock size={14} className="text-[#999]" />
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3
                    className={`text-base font-semibold text-[#1a1a1a] line-clamp-1 ${
                      hasAccess ? "group-hover:text-[#D4692A]" : ""
                    } transition-colors`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {project.name}
                  </h3>
                  <StatusBadge status={project.status} />
                </div>

                {project.description && (
                  <p className="text-sm text-[#777] line-clamp-2 mb-4">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#f0ece8]">
                  <div className="flex items-center gap-2 text-xs text-[#999]">
                    <Users size={14} />
                    <span>{project.members?.length || 0} member{(project.members?.length || 0) !== 1 ? "s" : ""}</span>
                  </div>
                  {project.members && project.members.length > 0 && (
                    <MemberAvatars members={project.members} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-lg font-bold text-[#1a1a1a]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                New Project
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of the project"
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-[#999] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4692A] text-white text-sm font-medium rounded-xl hover:bg-[#c05e24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
