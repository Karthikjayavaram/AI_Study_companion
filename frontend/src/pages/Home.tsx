import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Plus,
  Compass,
  Clock,
  Bot,
  FileText,
  Award,
  CheckSquare,
  Loader2,
  FolderKanban,
  CheckCircle2,
  BarChart3,
  Brain,
} from 'lucide-react';
import { api, NextActionResponse, GrowthSummary, ActivityEventItem } from '../api/client';
import { CreateSpaceModal } from '../components/common/CreateSpaceModal';
import { CreateProjectModal } from '../components/common/CreateProjectModal';

interface SpaceItem {
  id: string;
  name: string;
  description?: string;
  color_code?: string;
}

interface ProjectItem {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  learning_goal?: string;
  created_at: string;
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [recentProject, setRecentProject] = useState<ProjectItem | null>(null);
  const [recommendation, setRecommendation] = useState<NextActionResponse | null>(null);
  const [growthSummary, setGrowthSummary] = useState<GrowthSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [spacesRes, projectsRes] = await Promise.all([
        api.getSpaces().catch(() => ({ data: [] })),
        api.getProjects().catch(() => ({ data: [] })),
      ]);

      const fetchedSpaces: SpaceItem[] = spacesRes.data || [];
      const fetchedProjects: ProjectItem[] = projectsRes.data || [];

      setSpaces(fetchedSpaces);
      setProjects(fetchedProjects);

      if (fetchedProjects.length > 0) {
        // Find last active or default to the most recent
        const lastActiveId = localStorage.getItem('last_active_project_id');
        const activeProj =
          fetchedProjects.find((p) => p.id === lastActiveId) || fetchedProjects[0];

        setRecentProject(activeProj);
        localStorage.setItem('last_active_project_id', activeProj.id);
        localStorage.setItem('last_active_project_name', activeProj.name);

        const [recRes, growthRes, actRes] = await Promise.all([
          api.getNextRecommendation(activeProj.id).catch(() => ({ data: null })),
          api.getGrowthSummary(activeProj.id).catch(() => ({ data: null })),
          api.getProjectActivity(activeProj.id, 4).catch(() => ({ data: [] })),
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatEventLabel = (event: ActivityEventItem) => {
    const d = (event.details || {}) as Record<string, any>;
    switch (event.event_type) {
      case 'quiz_completed':
      case 'quiz_attempt_completed':
        return {
          title: 'Completed Practice Quiz',
          subtitle: d.score !== undefined ? `Scored ${Math.round(d.score)}%` : 'Completed practice attempt',
          icon: Award,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'tutor_interacted':
      case 'tutor_question_asked':
        return {
          title: 'Asked AI Tutor',
          subtitle: d.query ? `"${d.query}"` : 'Consulted study notes with AI',
          icon: Bot,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'material_uploaded':
        return {
          title: 'Added Study Material',
          subtitle: d.title || 'Uploaded new study document',
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

  const userName = user?.full_name ? user.full_name.split(' ')[0] : user?.email ? user.email.split('@')[0] : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Loading your learning workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Header / Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          AI Study Companion
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {userName ? `Welcome back, ${userName} 👋` : 'Welcome to your Learning Workspace 👋'}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Organize everything you want to learn into <strong>Spaces</strong> and <strong>Projects</strong>, grounded with an AI Tutor, adaptive quizzes, and concept mastery tracking.
        </p>
      </div>

      {/* 2. First-Time User Experience (No Spaces created yet) */}
      {spaces.length === 0 && (
        <div className="space-y-8">
          <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Getting Started</span>
              <h2 className="text-xl font-bold text-white tracking-tight">Welcome to your learning workspace</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Start by creating your first <strong>Space</strong> for the broad area or goal you want to explore.
              </p>
            </div>

            <button
              onClick={() => setIsSpaceModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Space</span>
            </button>
          </div>

          {/* Educational Explanation of Space vs Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-bold text-sm">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Space = Broad Area</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Something you want to explore or improve, such as <em>Computer Science</em>, <em>Placement Preparation</em>, <em>Web Development</em>, or <em>Data Science</em>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-bold text-sm">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Project = Focused Learning Goal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A specific workspace inside a Space (e.g. <em>Machine Learning Fundamentals</em>) where your notes, AI Tutor, practice quizzes, and growth are organized.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Space exists but no Projects created yet */}
      {spaces.length > 0 && projects.length === 0 && (
        <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Next Step</span>
            <h2 className="text-xl font-bold text-white tracking-tight">What are you learning?</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Create a learning project inside your space <strong>"{spaces[0].name}"</strong>. This is where your study materials, AI Tutor, and quizzes will live.
            </p>
          </div>

          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Learning Project</span>
          </button>
        </div>
      )}

      {/* 4. Active Learning Workspace Dashboard (Spaces and Projects exist) */}
      {projects.length > 0 && recentProject && (
        <div className="space-y-8">
          {/* Continue Learning Hero Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> Continue Learning
              </span>
              <span className="text-xs text-slate-400">Recently Active Project</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {recentProject.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                {recentProject.description || 'Continue where you left off with your AI Tutor, practice quizzes, and study notes.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/projects/${recentProject.id}`}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={`/projects/${recentProject.id}/tutor`}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>Ask AI Tutor</span>
              </Link>
              <Link
                to={`/projects/${recentProject.id}/quiz`}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Practice</span>
              </Link>
              <Link
                to={`/projects/${recentProject.id}/growth`}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>View Progress</span>
              </Link>
            </div>
          </div>

          {/* Quick Management & Creation Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <button
                  onClick={() => setIsSpaceModalOpen(true)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Space
                </button>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{spaces.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">Learning Spaces</div>
              </div>
              <Link to="/spaces" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <span>Manage Spaces in My Learning</span> →
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Compass className="w-4 h-4" />
                </div>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Project
                </button>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{projects.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">Focused Learning Projects</div>
              </div>
              <Link to="/spaces" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <span>View all projects</span> →
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">Analytics</div>
                <div className="text-xs text-slate-400 mt-0.5">Cross-Project Study Telemetry</div>
              </div>
              <Link to="/analytics" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <span>Open Global Analytics</span> →
              </Link>
            </div>
          </div>

          {/* Recommended Next Step */}
          {recommendation && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Recommended Next Step
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{recommendation.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{recommendation.reason}</p>
              <div className="pt-2">
                <Link
                  to={recommendation.action_url}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                  <span>Start Recommended Action</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivities.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Recent Activity in {recentProject.name}</span>
                </div>
                <Link
                  to={`/projects/${recentProject.id}/analytics`}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View All →
                </Link>
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

      {/* Reusable Modals */}
      <CreateSpaceModal
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        onSpaceCreated={(newSpace) => {
          loadDashboardData();
          navigate(`/spaces/${newSpace.id}`);
        }}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        spaces={spaces}
        onProjectCreated={(newProj) => {
          loadDashboardData();
          navigate(`/projects/${newProj.id}`);
        }}
      />
    </div>
  );
};
