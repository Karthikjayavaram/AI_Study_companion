import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart3,
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
  CheckSquare,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { api, ActivityEventItem } from '../api/client';

export const Analytics: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const isGlobal = !routeProjectId;

  const [projectName, setProjectName] = useState<string>('');
  const [spaceName, setSpaceName] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>('');
  const [activities, setActivities] = useState<ActivityEventItem[]>([]);
  const [materialsCount, setMaterialsCount] = useState<number>(0);
  const [quizzesCount, setQuizzesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (routeProjectId) {
          // Project Scoped Analytics
          const [projRes, actRes, matRes, quizRes] = await Promise.all([
            api.getProject(routeProjectId).catch(() => null),
            api.getProjectActivity(routeProjectId, 50).catch(() => ({ data: [] })),
            api.getMaterials(routeProjectId).catch(() => ({ data: [] })),
            api.getQuizzes(routeProjectId).catch(() => ({ data: [] })),
          ]);

          if (projRes?.data) {
            setProjectName(projRes.data.name);
            setSpaceId(projRes.data.space_id);
            if (projRes.data.space_id) {
              const spaceRes = await api.getSpace(projRes.data.space_id).catch(() => null);
              if (spaceRes?.data) setSpaceName(spaceRes.data.name);
            }
          }
          setActivities(actRes?.data || []);
          setMaterialsCount((matRes?.data || []).length);
          setQuizzesCount((quizRes?.data || []).length);
        } else {
          // Global Analytics across all spaces and projects
          const actRes = await api.getActivity().catch(() => ({ data: [] }));
          setActivities(actRes?.data || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [routeProjectId]);

  const formatEventInfo = (event: ActivityEventItem) => {
    const d = (event.details || {}) as Record<string, any>;
    switch (event.event_type) {
      case 'quiz_completed':
      case 'quiz_attempt_completed':
        return {
          title: 'Completed Practice Quiz',
          description: d.score !== undefined ? `Scored ${Math.round(d.score)}% on quiz` : 'Completed practice attempt',
          icon: Award,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'quiz_started':
        return {
          title: 'Started Practice Quiz',
          description: d.quiz_title ? `Started "${d.quiz_title}"` : 'Started an adaptive knowledge check',
          icon: CheckCircle2,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'quiz_generated':
        return {
          title: 'Generated Adaptive Quiz',
          description: d.question_count ? `Created quiz with ${d.question_count} questions` : 'Generated new assessment',
          icon: Sparkles,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'tutor_interacted':
      case 'tutor_question_asked':
        return {
          title: 'Asked AI Tutor',
          description: d.query ? `"${d.query}"` : 'Consulted AI tutor for grounded study material guidance',
          icon: Bot,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'material_uploaded':
        return {
          title: 'Added Study Material',
          description: d.title ? `Uploaded "${d.title}"` : 'Processed and added study notes',
          icon: FileText,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'project_created':
        return {
          title: 'Created Learning Project',
          description: d.project_name ? `Created project "${d.project_name}"` : 'Initialized new study project workspace',
          icon: Compass,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      default:
        return {
          title: 'Study Action Logged',
          description: d.message || event.event_type.replace(/_/g, ' '),
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

  const tutorInteractions = activities.filter(
    (a) => a.event_type === 'tutor_interacted' || a.event_type === 'tutor_question_asked'
  ).length;
  const quizzesCompleted = activities.filter(
    (a) => a.event_type === 'quiz_completed' || a.event_type === 'quiz_attempt_completed'
  ).length;
  const materialsAdded = activities.filter((a) => a.event_type === 'material_uploaded').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Context Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/spaces" className="hover:text-white transition-colors">My Learning</Link>
        <span>/</span>
        {!isGlobal && spaceId ? (
          <>
            <Link to={`/spaces/${spaceId}`} className="hover:text-white transition-colors flex items-center gap-1">
              <FolderKanban className="w-3 h-3 text-indigo-400" />
              <span>{spaceName || 'Space'}</span>
            </Link>
            <span>/</span>
            <Link to={`/projects/${routeProjectId}`} className="hover:text-white transition-colors">
              {projectName}
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">Project Analytics</span>
          </>
        ) : (
          <span className="text-white font-semibold">Global Analytics</span>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span>{isGlobal ? 'Global Learning Overview' : 'Project Learning History'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            {isGlobal ? 'Global Analytics' : `Analytics: ${projectName}`}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isGlobal
              ? 'Aggregated study telemetry across all your learning spaces, projects, practice sessions, and tutor conversations.'
              : `Activity timeline and study metrics specifically for the ${projectName} learning workspace.`}
          </p>
        </div>

        {!isGlobal && routeProjectId && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/projects/${routeProjectId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace</span>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Study Actions</div>
          <div className="text-2xl font-bold text-white tracking-tight">{activities.length}</div>
          <div className="text-xs text-slate-400">
            {isGlobal ? 'Events across all spaces' : 'Events in this project'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quizzes Completed</div>
          <div className="text-2xl font-bold text-white tracking-tight">{quizzesCompleted}</div>
          <div className="text-xs text-emerald-400 font-medium">
            {isGlobal ? 'Practice attempts across topics' : `${quizzesCount} available assessments`}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Tutor Consultations</div>
          <div className="text-2xl font-bold text-white tracking-tight">{tutorInteractions}</div>
          <div className="text-xs text-indigo-400 font-medium">
            Interactive questions answered
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Activity Timeline</span>
          </div>
          <span className="text-xs text-slate-500">
            {activities.length} {activities.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs font-medium">Loading telemetry events...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 rounded-xl bg-slate-800/20 border border-dashed border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">No learning activity recorded yet.</p>
            <p className="text-[11px] text-slate-500">
              Upload study materials, ask questions to your AI tutor, or complete quizzes to generate study telemetry.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((e) => {
              const info = formatEventInfo(e);
              const EventIcon = info.icon;
              return (
                <div
                  key={e.id}
                  className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3.5 hover:border-slate-700 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${info.color}`}>
                    <EventIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-white truncate">{info.title}</h3>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {formatTime(e.created_at)}
                      </span>
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
