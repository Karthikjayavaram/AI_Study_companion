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
  Flame,
  Award,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { api, NextActionResponse, ConceptMastery, ActivityEventItem } from '../api/client';

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
  const [recommendation, setRecommendation] = useState<NextActionResponse | null>(null);
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [activities, setActivities] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        setError(null);
        const [projRes, matRes, recRes, masteryRes, actRes] = await Promise.all([
          api.getProject(projectId),
          api.getMaterials(projectId).catch(() => ({ data: [] })),
          api.getNextRecommendation(projectId).catch(() => ({ data: null })),
          api.getMastery(projectId).catch(() => ({ data: [] })),
          api.getProjectActivity(projectId, 8).catch(() => ({ data: [] })),
        ]);
        const proj = projRes.data;
        setProject(proj);
        setMaterialsCount((matRes.data || []).length);
        if (recRes?.data) {
          setRecommendation(recRes.data);
        }
        if (masteryRes?.data) {
          setMasteries(masteryRes.data);
        }
        if (actRes?.data) {
          setActivities(actRes.data);
        }

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

  const getRecommendationDetails = (rec: NextActionResponse) => {
    switch (rec.recommendation_type) {
      case 'practice_concept':
        return {
          badge: 'Needs Practice',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          buttonText: 'Practice Now',
          icon: Flame,
        };
      case 'review_concept':
        return {
          badge: 'Developing',
          badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          buttonText: 'Review Concept',
          icon: Sparkles,
        };
      case 'mixed_review':
        return {
          badge: 'Challenge Ready',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          buttonText: 'Start Mixed Quiz',
          icon: Award,
        };
      case 'start_learning':
      default:
        return {
          badge: 'Getting Started',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          buttonText: 'Explore Materials',
          icon: Compass,
        };
    }
  };

  const formatEventTime = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (isYesterday) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const formatEventDescription = (event: ActivityEventItem) => {
    const d = event.details || {};
    switch (event.event_type) {
      case 'quiz_completed':
      case 'quiz_attempt_completed':
        return {
          text: d.score !== undefined ? `Completed quiz — ${Math.round(d.score)}%` : 'Completed quiz attempt',
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'quiz_started':
        return {
          text: d.quiz_title ? `Started quiz: ${d.quiz_title}` : 'Started quiz attempt',
          icon: CheckSquare,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'quiz_generated':
        return {
          text: `Generated adaptive quiz (${d.question_count || 5} questions)`,
          icon: Sparkles,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'tutor_question_asked':
        return {
          text: 'Asked AI Tutor a question',
          icon: Bot,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'material_uploaded':
        return {
          text: d.title ? `Uploaded material — ${d.title}` : 'Uploaded study material',
          icon: FileText,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'material_processed':
        return {
          text: 'Indexed and extracted study concepts',
          icon: FileText,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'mastery_updated':
        return {
          text: d.concepts_updated ? `Updated mastery for ${d.concepts_updated} concept${d.concepts_updated !== 1 ? 's' : ''}` : 'Updated concept mastery',
          icon: TrendingUp,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      case 'project_created':
        return {
          text: 'Created project workspace',
          icon: Compass,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        };
      default:
        return {
          text: event.event_type.replace(/_/g, ' '),
          icon: Clock,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        };
    }
  };

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

  const recDetails = recommendation ? getRecommendationDetails(recommendation) : null;

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

      {/* Core Insights: Mastery vs Next Learning Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Concept Mastery Status</h2>
            <Link to={`/projects/${projectId}/growth`} className="text-xs text-indigo-400 hover:text-indigo-300">
              View Detailed Growth →
            </Link>
          </div>

          {masteries.length > 0 ? (
            <div className="space-y-3">
              {masteries.slice(0, 4).map((m) => {
                const score = Math.round(m.score);
                const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-indigo-500' : 'bg-amber-500';
                const conceptName = m.concept?.name || 'Concept';
                return (
                  <div key={m.id} className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200">{conceptName}</span>
                      <span className="font-mono text-slate-300">{score}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-800/20 border border-dashed border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400">No concepts evaluated yet.</p>
              <Link to={`/projects/${projectId}/quiz`} className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Take an adaptive quiz to start tracking mastery →
              </Link>
            </div>
          )}
        </div>

        {/* Recommended Next Action */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-4 flex flex-col justify-between">
          {recommendation && recDetails ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Next Learning Action</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${recDetails.badgeColor}`}>
                    {recDetails.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{recommendation.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {recommendation.reason}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to={recommendation.target_concept_id ? `${recommendation.action_url}?concept_id=${recommendation.target_concept_id}` : recommendation.action_url}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  <span>{recDetails.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Next Learning Action</span>
                </div>
                <h3 className="text-base font-bold text-white">Upload Study Materials</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload PDF notes or text materials to train your project's AI tutor and automatically extract learning concepts.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to={`/projects/${projectId}/materials`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  <span>Go to Materials</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Learning Activity Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Recent Learning Activity</span>
          </div>
          <Link to={`/projects/${projectId}/analytics`} className="text-xs text-indigo-400 hover:text-indigo-300">
            View All Activity →
          </Link>
        </div>

        {activities.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {activities.map((act) => {
              const info = formatEventDescription(act);
              const EventIcon = info.icon;
              return (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg border ${info.color} shrink-0`}>
                      <EventIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-slate-200 truncate">{info.text}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                    {formatEventTime(act.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-800/20 border border-dashed border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              No learning activity yet. Start by adding material or taking a quiz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
