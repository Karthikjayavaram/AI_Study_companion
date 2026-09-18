import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, ArrowRight, Trash2, Loader2, AlertCircle, Compass, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { CreateSpaceModal } from '../components/common/CreateSpaceModal';

interface SpaceData {
  id: string;
  name: string;
  description?: string;
  color_code?: string;
  icon?: string;
  created_at: string;
  projectCount?: number;
}

export const Spaces: React.FC = () => {
  const [spaces, setSpaces] = useState<SpaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const [spacesRes, projectsRes] = await Promise.all([
        api.getSpaces(),
        api.getProjects().catch(() => ({ data: [] })),
      ]);

      const projects = projectsRes.data || [];
      const projectCounts: Record<string, number> = {};
      projects.forEach((p: any) => {
        projectCounts[p.space_id] = (projectCounts[p.space_id] || 0) + 1;
      });

      const list = (spacesRes.data || []).map((s: SpaceData) => ({
        ...s,
        projectCount: projectCounts[s.id] || 0,
      }));

      setSpaces(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load learning spaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleDeleteSpace = async (e: React.MouseEvent, spaceId: string, spaceName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete "${spaceName}"? All learning projects, materials, and quizzes inside this space will be deleted.`
      )
    ) {
      return;
    }

    try {
      await api.deleteSpace(spaceId);
      await fetchSpaces();
    } catch (err: any) {
      alert(err.message || 'Failed to delete space');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            Learning Architecture
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Learning</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Manage the broad areas and subjects you are exploring. Each <strong>Space</strong> contains your focused learning <strong>Projects</strong>, notes, AI Tutor, and quizzes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Create Space</span>
        </button>
      </div>

      {/* Educational Concept Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-white">What is a Space?</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              A broad area you want to explore or improve (e.g. <em>Computer Science</em>, <em>Placement Preparation</em>, or <em>Data Science</em>).
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-white">What is a Project?</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              A focused learning workspace inside a Space (e.g. <em>Machine Learning</em> or <em>Operating Systems</em>) with your study materials and AI tutor.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Spaces Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Learning Spaces</h2>
          <span className="text-xs text-slate-500">{spaces.length} Total Spaces</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs font-medium">Loading spaces...</span>
          </div>
        ) : spaces.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
              <FolderKanban className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-white">No Learning Spaces Created Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create your first Space to begin organizing what you want to learn. You can create as many Spaces as you need!
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Space</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {spaces.map((space) => {
              const color = space.color_code || '#4f46e5';
              return (
                <Link
                  key={space.id}
                  to={`/spaces/${space.id}`}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group space-y-4 relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                          {space.projectCount || 0} {space.projectCount === 1 ? 'Project' : 'Projects'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSpace(e, space.id, space.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Space"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {space.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {space.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                    <span>Open Space Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-indigo-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateSpaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSpaceCreated={() => {
          fetchSpaces();
        }}
      />
    </div>
  );
};
