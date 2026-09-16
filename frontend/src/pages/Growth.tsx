import React from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, Sparkles, CheckCircle, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';

export const Growth: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const concepts = [
    {
      id: 'c1',
      name: 'Gradient Descent Optimization',
      score: 88,
      status: 'improving',
      history: '+12% over 3 quizzes',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      barColor: 'bg-emerald-500',
    },
    {
      id: 'c2',
      name: 'Cross-Entropy & Log Loss',
      score: 72,
      status: 'stable',
      history: 'Consistent across 2 quizzes',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      barColor: 'bg-indigo-500',
    },
    {
      id: 'c3',
      name: 'Learning Rate Schedules & Momentum',
      score: 51,
      status: 'improving',
      history: '+6% after Tutor session',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      barColor: 'bg-indigo-500',
    },
    {
      id: 'c4',
      name: 'L1/L2 Regularization Penalty Mechanics',
      score: 42,
      status: 'requiring_attention',
      history: 'Repeated mistakes on application questions',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      barColor: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Growth & Mastery</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Concept Mastery Breakdown</h1>
          <p className="text-xs text-slate-400">
            Estimates evolve dynamically based on quiz attempts, tutor sessions, and active practice
          </p>
        </div>
      </div>

      {/* Concept Progress Bars */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tracked Concepts</h2>
        <div className="space-y-4">
          {concepts.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{c.name}</h3>
                  <span className="text-[11px] text-slate-400">{c.history}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${c.badgeClass}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-mono font-bold text-white">{c.score}%</span>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`${c.barColor} h-2.5 rounded-full transition-all duration-500`}
                  style={{ width: `${c.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations (Answers 'What should I do next?') */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-4 h-4" />
          <span>Automated Growth Recommendation</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          "Your understanding of <strong>Concept C (Learning Rate Schedules)</strong> has improved, but application-based questions on <strong>L1/L2 Regularization</strong> remain difficult. Review Section 4.2 in your notes and complete another short 3-question assessment."
        </p>
      </div>
    </div>
  );
};
