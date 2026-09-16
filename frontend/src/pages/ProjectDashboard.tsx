import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Bot,
  CheckSquare,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Compass,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  FolderKanban,
} from 'lucide-react';
import { api } from '../api/client';

interface ProjectData {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  learning_goal?: string;
  status?: string;
  created_at: string;
}

interface SpaceData {
  id: string;
  name: string;
  color_code?: string;
}

export const ProjectDashboard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [materialsCount, setMaterialsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        setError(null);
        const [projRes, matRes] = await Promise.all([
          api.getProject(projectId),
          api.getMaterials(projectId).catch(() => ({ data: [] })),
        ]);
        const proj = projRes.data;
        setProject(proj);
        setMaterialsCount((matRes.data || []).length);

        if (proj?.space_id) {
          const spaceRes = await api.getSpace(proj.space_id).catch(() => null);
          if (spaceRes?.data) {
            setSpace(spaceRes.data);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);


  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-xs font-medium">Loading project workspace...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link to="/spaces" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Spaces
        </Link>
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error || 'Project not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/spaces" className="hover:text-white transition-colors">Spaces</Link>
        <span>/</span>
        {space ? (
          <Link to={`/spaces/${space.id}`} className="hover:text-white transition-colors flex items-center gap-1">
            <FolderKanban className="w-3 h-3 text-indigo-400" />
            <span>{space.name}</span>
          </Link>
        ) : (
          <span>Space</span>
        )}
        <span>/</span>
        <span className="text-white font-semibold">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Active Learning Journey</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
            <p className="text-xs text-slate-400 mt-1">{project.description || 'No description provided.'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 uppercase">
              {project.status || 'Active'}
            </span>
          </div>
        </div>

        {project.learning_goal && (
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
            <strong className="text-white">Goal:</strong> {project.learning_goal}
          </div>
        )}
      </div>

      {/* Quick Navigation to Project Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Materials', icon: FileText, to: `/projects/${projectId}/materials`, description: `${materialsCount} ${materialsCount === 1 ? 'Item' : 'Items'}` },
          { label: 'AI Tutor', icon: Bot, to: `/projects/${projectId}/tutor`, description: 'Interactive Chat' },

          { label: 'Adaptive Quiz', icon: CheckSquare, to: `/projects/${projectId}/quiz`, description: 'Knowledge Check' },
          { label: 'Growth & Mastery', icon: TrendingUp, to: `/projects/${projectId}/growth`, description: 'Mastery Tracker' },
          { label: 'Analytics', icon: BarChart3, to: `/projects/${projectId}/analytics`, description: 'Activity History' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <item.icon className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                {item.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Core Insights: Mastery vs Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Concept Mastery Status</h2>
            <Link to={`/projects/${projectId}/growth`} className="text-xs text-indigo-400 hover:text-indigo-300">
              View Detailed Growth →
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Core Foundations & Setup', score: 85, color: 'bg-emerald-500' },
              { name: 'Key Principles & Concepts', score: 70, color: 'bg-indigo-500' },
              { name: 'Advanced Problem Solving', score: 55, color: 'bg-indigo-500' },
              { name: 'Practical Applications', score: 40, color: 'bg-amber-500' },
            ].map((c) => (
              <div key={c.name} className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{c.name}</span>
                  <span className="font-mono text-slate-300">{c.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className={`${c.color} h-2 rounded-full`} style={{ width: `${c.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Next Action */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>Targeted Recommendation</span>
          </div>
          <h3 className="text-base font-bold text-white">Upload Study Materials</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Upload PDF notes or text materials to train your project's AI tutor and automatically extract learning concepts.
          </p>
          <div className="pt-2">
            <Link
              to={`/projects/${projectId}/materials`}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              Go to Materials
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
