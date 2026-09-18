import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FolderKanban, Plus, Compass, ArrowRight, Trash2, Loader2, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { CreateProjectModal } from '../components/common/CreateProjectModal';

interface SpaceData {
  id: string;
  name: string;
  description?: string;
  color_code?: string;
}

interface ProjectData {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  learning_goal?: string;
  status?: string;
  created_at: string;
}

export const SpaceDashboard: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();

  const [space, setSpace] = useState<SpaceData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    if (!spaceId) return;
    try {
      setLoading(true);
      setError(null);

      const [spaceRes, projectsRes] = await Promise.all([
        api.getSpace(spaceId),
        api.getProjects(spaceId),
      ]);

      setSpace(spaceRes.data);
      setProjects(projectsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load space details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [spaceId]);

  const handleDeleteProject = async (e: React.MouseEvent, projId: string, projName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete project "${projName}"? All materials, tutor conversations, and quizzes in this project will be deleted.`
      )
    ) {
      return;
    }

    try {
      await api.deleteProject(projId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-xs font-medium">Loading space dashboard...</span>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Link to="/spaces" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Learning
        </Link>
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error || 'Space not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Context Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/spaces" className="hover:text-white transition-colors">My Learning</Link>
        <span>/</span>
        <span className="text-white font-semibold">{space.name}</span>
      </div>

      {/* Space Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block shrink-0 shadow-sm"
              style={{ backgroundColor: space.color_code || '#4f46e5' }}
            />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Learning Space
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{space.name}</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            {space.description || 'Focused learning area containing your targeted study projects.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Projects in this Space
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Each project is a dedicated learning workspace with its own materials, tutor, and quizzes
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-white">No Projects in this Space Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Projects are focused learning workspaces inside a Space. For example, in <strong>{space.name}</strong>, you can create a project like <em>Machine Learning Fundamentals</em> or <em>Operating Systems</em>.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                onClick={() => {
                  localStorage.setItem('last_active_project_id', p.id);
                  localStorage.setItem('last_active_project_name', p.name);
                }}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all space-y-4 group relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                        {p.status || 'Active'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteProject(e, p.id, p.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description || 'No description provided.'}
                    </p>
                  </div>

                  {p.learning_goal && (
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-300">Goal:</span>{' '}
                      <span className="text-slate-400">{p.learning_goal}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                  <span>Enter Learning Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultSpaceId={space.id}
        onProjectCreated={() => {
          fetchData();
        }}
      />
    </div>
  );
};
