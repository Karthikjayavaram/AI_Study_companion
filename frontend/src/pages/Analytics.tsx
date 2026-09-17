import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart3,
  Activity,
  Clock,
  Award,
  CheckCircle2,
  Bot,
  FileText,
  FolderKanban,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { api, ActivityEventItem } from '../api/client';

export const Analytics: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [projectName, setProjectName] = useState<string>('');
  const [activities, setActivities] = useState<ActivityEventItem[]>([]);
  const [materialsCount, setMaterialsCount] = useState<number>(0);
  const [quizzesCount, setQuizzesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projRes, actRes, matRes, quizRes] = await Promise.all([
          api.getProject(projectId).catch(() => null),
          api.getProjectActivity(projectId, 50).catch(() => ({ data: [] })),
          api.getMaterials(projectId).catch(() => ({ data: [] })),
          api.getQuizzes(projectId).catch(() => ({ data: [] })),
        ]);

        if (projRes?.data?.name) {
          setProjectName(projRes.data.name);
        }
        setActivities(actRes?.data || []);
        setMaterialsCount((matRes?.data || []).length);
        setQuizzesCount((quizRes?.data || []).length);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [projectId]);

  const formatEventInfo = (event: ActivityEventItem) => {
    const d = (event.details || {}) as Record<string, any>;
    switch (event.event_type) {
      case 'quiz_completed':
      case 'quiz_attempt_completed':
        return {
          title: 'Adaptive Assessment Completed',
          description: d.score !== undefined ? `Completed assessment with score ${Math.round(d.score)}%` : 'Completed quiz attempt',
          icon: Award,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'tutor_interacted':
        return {
          title: 'AI Tutor Interaction',
          description: d.query ? `Asked: "${d.query}"` : 'Consulted AI tutor for grounded material guidance',
          icon: Bot,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'material_uploaded':
        return {
          title: 'Study Material Processed',
          description: d.title ? `Uploaded "${d.title}"` : 'Processed and embedded document into vector index',
          icon: FileText,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'project_created':
        return {
          title: 'Learning Project Initialized',
          description: d.name ? `Created project "${d.name}"` : 'Initialized new project workspace',
          icon: FolderKanban,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      default:
        return {
          title: 'Learning Activity Recorded',
          description: d.message || 'Active study session',
          icon: Sparkles,
          color: 'text-slate-400 bg-slate-800 border-slate-700',
        };
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const tutorInteractions = activities.filter((a) => a.event_type === 'tutor_interacted').length;
  const quizzesCompleted = activities.filter((a) => a.event_type === 'quiz_completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={projectId ? `/projects/${projectId}` : '/spaces'}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Hub
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Telemetry & Events</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Learning Analytics</h1>
          <p className="text-xs text-slate-400">
            Activity stream and learning velocity for {projectName || `Project: ${projectId || 'default'}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase">Learning Events</div>
          <div className="text-2xl font-bold text-white">{activities.length}</div>
          <div className="text-xs text-slate-400">Recorded telemetry intervals</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase">Quizzes Completed</div>
          <div className="text-2xl font-bold text-white">{quizzesCompleted}</div>
          <div className="text-xs text-emerald-400 font-medium">{quizzesCount} available assessments</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase">AI Tutor Invocations</div>
          <div className="text-2xl font-bold text-white">{tutorInteractions}</div>
          <div className="text-xs text-indigo-400 font-medium">Grounded RAG queries</div>
        </div>
      </div>

      {/* Activity Event Stream */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity Timeline</h2>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs font-medium">Loading telemetry events...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 rounded-xl bg-slate-800/20 border border-dashed border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">No learning activity recorded for this project yet.</p>
            <p className="text-[11px] text-slate-500">
              Upload study materials, ask questions to the AI tutor, or complete quizzes to generate learning telemetry.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((e) => {
              const info = formatEventInfo(e);
              const EventIcon = info.icon;
              return (
                <div key={e.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${info.color}`}>
                    <EventIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{info.title}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">{formatTime(e.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{info.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
