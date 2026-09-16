import React from 'react';
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
  Clock,
  Sparkles,
} from 'lucide-react';

export const ProjectDashboard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Active Learning Journey</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Machine Learning Foundations</h1>
            <p className="text-xs text-slate-400 mt-1">Project ID: {projectId || 'default'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              Active Context
            </span>
          </div>
        </div>
        <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
          <strong className="text-white">Goal:</strong> Master gradient descent, loss functions, and backpropagation mechanics.
        </div>
      </div>

      {/* Quick Navigation to Project Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Materials', icon: FileText, to: `/projects/${projectId}/materials`, count: '2 Docs' },
          { label: 'AI Tutor', icon: Bot, to: `/projects/${projectId}/tutor`, count: '3 Chats' },
          { label: 'Adaptive Quiz', icon: CheckSquare, to: `/projects/${projectId}/quiz`, count: '4 Attempts' },
          { label: 'Growth & Mastery', icon: TrendingUp, to: `/projects/${projectId}/growth`, count: '74% Mastery' },
          { label: 'Analytics', icon: BarChart3, to: `/projects/${projectId}/analytics`, count: '18 Events' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <item.icon className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] text-slate-400 font-medium">{item.count}</span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
              {item.label}
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
              { name: 'Gradient Descent Optimization', score: 88, status: 'improving', color: 'bg-emerald-500' },
              { name: 'Mean Squared Error vs Cross-Entropy', score: 72, status: 'stable', color: 'bg-indigo-500' },
              { name: 'Learning Rate & Momentum', score: 65, status: 'improving', color: 'bg-indigo-500' },
              { name: 'L1 & L2 Regularization Penalty', score: 42, status: 'requiring_attention', color: 'bg-amber-500' },
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
          <h3 className="text-base font-bold text-white">Reinforce Regularization</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your understanding of Concept 'L1/L2 Regularization' has stabilized at 42%. Review Page 14 of Machine Learning Notes and complete a 3-question adaptive quiz.
          </p>
          <div className="pt-2">
            <Link
              to={`/projects/${projectId}/quiz`}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              Start Practice Quiz
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
