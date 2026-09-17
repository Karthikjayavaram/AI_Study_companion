import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FolderKanban,
  BookOpen,
  Brain,
  CheckCircle2,
  Plus,
  Compass,
  CheckSquare,
  Clock,
  Bot,
  FileText,
  Award,
} from 'lucide-react';
import { api, NextActionResponse, GrowthSummary, ActivityEventItem } from '../api/client';

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export const Home: React.FC = () => {
  const [recentProject, setRecentProject] = useState<ProjectItem | null>(null);
  const [recommendation, setRecommendation] = useState<NextActionResponse | null>(null);
  const [growthSummary, setGrowthSummary] = useState<GrowthSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const projectsRes = await api.getProjects().catch(() => ({ data: [] }));
        const projects: ProjectItem[] = projectsRes.data || [];

        if (projects.length > 0) {
          const project = projects[0];
          setRecentProject(project);

          const [recRes, growthRes, actRes] = await Promise.all([
            api.getNextRecommendation(project.id).catch(() => ({ data: null })),
            api.getGrowthSummary(project.id).catch(() => ({ data: null })),
            api.getProjectActivity(project.id, 4).catch(() => ({ data: [] })),
          ]);

          if (recRes?.data) setRecommendation(recRes.data);
          if (growthRes?.data) setGrowthSummary(growthRes.data);
          if (actRes?.data) setRecentActivities(actRes.data);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatEventLabel = (event: ActivityEventItem) => {
    const d = (event.details || {}) as Record<string, any>;
    switch (event.event_type) {
      case 'quiz_completed':
      case 'quiz_attempt_completed':
        return {
          title: 'Completed Quiz Assessment',
          subtitle: d.score !== undefined ? `Scored ${Math.round(d.score)}%` : 'Completed quiz attempt',
          icon: Award,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'tutor_interacted':
        return {
          title: 'AI Tutor Consultation',
          subtitle: d.query ? `"${d.query}"` : 'Asked study material question',
          icon: Bot,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'material_uploaded':
        return {
          title: 'Study Material Added',
          subtitle: d.title || 'Document added to project',
          icon: FileText,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      default:
        return {
          title: 'Study Session',
          subtitle: 'Active learning progress',
          icon: Sparkles,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
    }
  };

  const continueLearningUrl = recentProject
    ? `/projects/${recentProject.id}/tutor`
    : '/spaces';

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-xl">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Student Companion
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome to your AI Study Companion
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Your personalized learning workspace. Upload study notes and textbook PDFs, consult an AI tutor grounded in your materials, take adaptive quizzes, and track your concept mastery over time.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={continueLearningUrl}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50"
            >
              <Brain className="w-4 h-4" />
              {recentProject ? 'Continue Learning' : 'Start Learning Journey'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/spaces"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              <FolderKanban className="w-4 h-4" />
              View Spaces
            </Link>
          </div>
        </div>
      </div>

      {/* If user has no projects: Clean, welcoming empty state */}
      {!loading && !recentProject ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white">Start your learning journey</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Create your first Space to organize your course subjects. Inside each space, you can create focused projects for chapters or topics, upload study materials, and begin tutoring sessions.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/spaces"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              Create your first Space
            </Link>
          </div>
        </div>
      ) : (
        /* Active User Learning Dashboard */
        <div className="space-y-6">
          {/* Main 3 Overview Cards: Active Project, Progress, Next Step */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Active Project */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workspace</span>
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                </div>
                {recentProject && (
                  <>
                    <h3 className="text-lg font-bold text-white leading-snug">{recentProject.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {recentProject.description || 'Active project with personalized knowledge graph and AI tutor.'}
                    </p>
                  </>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <Link
                  to={recentProject ? `/projects/${recentProject.id}` : '/spaces'}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5"
                >
                  Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Current Progress */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Mastery</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                {growthSummary && growthSummary.total_concepts > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        {Math.round(growthSummary.overall_mastery)}%
                      </span>
                      <span className="text-xs text-emerald-400 font-medium">
                        {growthSummary.mastered_count + growthSummary.improving_count} progressing
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round(growthSummary.overall_mastery))}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {growthSummary.total_concepts} concept{growthSummary.total_concepts !== 1 ? 's' : ''} tracked across quizzes.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">--</span>
                      <span className="text-xs text-slate-400 font-medium">Ready to start</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Take your first adaptive quiz to evaluate and track your concept mastery.
                    </p>
                  </>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                {recentProject ? (
                  <Link
                    to={`/projects/${recentProject.id}/growth`}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5"
                  >
                    View Mastery Breakdown <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">Awaiting quiz activity</span>
                )}
              </div>
            </div>

            {/* Card 3: Next Learning Action */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/30 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Next Learning Action</span>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                {recommendation ? (
                  <>
                    <h3 className="text-base font-bold text-white leading-snug">{recommendation.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {recommendation.reason}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-white leading-snug">Study with AI Tutor</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ask questions about your uploaded materials to discover key concepts.
                    </p>
                  </>
                )}
              </div>
              <div className="pt-2 border-t border-indigo-500/20">
                <Link
                  to={
                    recommendation
                      ? recommendation.action_url
                      : recentProject
                      ? `/projects/${recentProject.id}/tutor`
                      : '/spaces'
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-600/20 border border-indigo-500/30 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                >
                  <span>{recommendation ? 'Start Recommended Action' : 'Open AI Tutor'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity Stream (Real Data) */}
          {recentActivities.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Recent Learning Activity</span>
                </div>
                {recentProject && (
                  <Link to={`/projects/${recentProject.id}/analytics`} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Full Activity Stream →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentActivities.map((act) => {
                  const ev = formatEventLabel(act);
                  const Icon = ev.icon;
                  return (
                    <div key={act.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${ev.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{ev.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{ev.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* How Learning Works with AI Study Companion */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How Learning Works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
          {[
            { step: '1. Spaces', desc: 'Subject containers', icon: FolderKanban },
            { step: '2. Projects', desc: 'Focused study goals', icon: Compass },
            { step: '3. Materials', desc: 'PDFs and notes', icon: FileText },
            { step: '4. AI Tutor', desc: 'Grounded Q&A with citations', icon: Bot },
            { step: '5. Quizzes', desc: 'Adaptive assessments', icon: CheckSquare },
            { step: '6. Mastery', desc: 'Concept tracking & next steps', icon: TrendingUp },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border bg-slate-800/40 border-slate-800 text-left space-y-1 hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{item.step}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
