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
} from 'lucide-react';
import { api, NextActionResponse, GrowthSummary } from '../api/client';

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

          const [recRes, growthRes] = await Promise.all([
            api.getNextRecommendation(project.id).catch(() => ({ data: null })),
            api.getGrowthSummary(project.id).catch(() => ({ data: null })),
          ]);

          if (recRes?.data) setRecommendation(recRes.data);
          if (growthRes?.data) setGrowthSummary(growthRes.data);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const continueLearningUrl = recentProject
    ? `/projects/${recentProject.id}/tutor`
    : '/spaces';

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Learning & Growth Workspace
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Welcome back to your Study Companion
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Persistent, contextual learning grounded in your uploaded materials. Track mastery, practice adaptively, and receive targeted next steps.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={continueLearningUrl}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50"
            >
              <Brain className="w-4 h-4" />
              {recentProject ? 'Continue Learning' : 'Get Started'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/spaces"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              <FolderKanban className="w-4 h-4" />
              Explore Spaces
            </Link>
          </div>
        </div>
      </div>

      {/* Answers: Where was I? How am I doing? What should I do next? */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Where was I? */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Where was I</span>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            {recentProject ? (
              <>
                <h3 className="text-lg font-bold text-white">{recentProject.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {recentProject.description || 'Active learning project with personalized knowledge graph and AI tutor.'}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white">No Active Projects Yet</h3>
                <p className="text-xs text-slate-400">
                  Create a learning space to organize materials and begin your study journey.
                </p>
              </>
            )}
          </div>
          <div className="pt-2">
            <Link
              to={recentProject ? `/projects/${recentProject.id}` : '/spaces'}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5"
            >
              {recentProject ? 'Resume Project' : 'Create Space'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: How am I doing? */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How am I doing</span>
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
                  ></div>
                </div>
                <p className="text-xs text-slate-400">
                  {growthSummary.improving_count} concepts improving, {growthSummary.needs_attention_count} requiring attention.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">--</span>
                  <span className="text-xs text-slate-400 font-medium">Ready to begin</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-slate-700 h-2 rounded-full w-0"></div>
                </div>
                <p className="text-xs text-slate-400">
                  Complete adaptive quizzes and study sessions to calculate your mastery score.
                </p>
              </>
            )}
          </div>
          <div className="pt-2">
            {recentProject ? (
              <Link
                to={`/projects/${recentProject.id}/growth`}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5"
              >
                View Growth Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-xs text-slate-500">Awaiting quiz data</span>
            )}
          </div>
        </div>

        {/* Card 3: What should I do next? */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Recommended Next Action</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            {recommendation ? (
              <>
                <h3 className="text-base font-bold text-white">{recommendation.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {recommendation.reason}
                </p>
              </>
            ) : recentProject ? (
              <>
                <h3 className="text-base font-bold text-white">Explore Project Materials</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload study documents or engage the AI tutor to extract learning concepts and unlock quizzes.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-white">Create Your First Space</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Spaces organize your learning materials by subject, domain, or coursework.
                </p>
              </>
            )}
          </div>
          <div className="pt-2">
            <Link
              to={
                recommendation
                  ? recommendation.action_url
                  : recentProject
                  ? `/projects/${recentProject.id}/materials`
                  : '/spaces'
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-600/20 border border-indigo-500/30 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
            >
              {recommendation ? 'Take Action' : recentProject ? 'Add Materials' : 'Get Started'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Core Learning Loop Visualizer */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Core Learning Loop Architecture</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { step: '1. Create Space', desc: 'Domain container', active: true },
            { step: '2. Create Project', desc: 'Context boundary', active: true },
            { step: '3. Add Material', desc: 'PDF / Text ingestion', active: true },
            { step: '4. AI Tutor', desc: 'Grounded citations', active: true },
            { step: '5. Adaptive Quiz', desc: 'MCQ & open-ended', active: true },
            { step: '6. Concept Mastery', desc: 'Growth estimation', active: true },
            { step: '7. Next Action', desc: 'Targeted practice', active: true },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-left transition-all ${
                item.active
                  ? 'bg-slate-800/60 border-slate-700 hover:border-indigo-500/40'
                  : 'bg-slate-900/40 border-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{item.step}</span>
              </div>
              <p className="text-[11px] text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
