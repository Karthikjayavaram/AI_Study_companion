import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, Sparkles, Target, AlertTriangle, CheckCircle, BookOpen, RefreshCw, BarChart3 } from 'lucide-react';
import { api, GrowthSummary, ConceptMastery } from '../api/client';

export const Growth: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrowthData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGrowthSummary(projectId);
      setSummary(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load growth data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGrowthData();
  }, [fetchGrowthData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'improving':
        return {
          label: 'Mastered',
          icon: <CheckCircle className="w-3 h-3" />,
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          barColor: 'bg-emerald-500',
        };
      case 'stable':
        return {
          label: 'Stable',
          icon: <TrendingUp className="w-3 h-3" />,
          className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          barColor: 'bg-indigo-500',
        };
      case 'requiring_attention':
      default:
        return {
          label: 'Needs Attention',
          icon: <AlertTriangle className="w-3 h-3" />,
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          barColor: 'bg-amber-500',
        };
    }
  };

  const getOverallGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30';
    if (score >= 50) return 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30';
    return 'from-amber-600/20 to-amber-900/10 border-amber-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading growth data…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/30 border border-red-500/30 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={fetchGrowthData}
          className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary || summary.total_concepts === 0) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Growth & Mastery</div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Concept Mastery Breakdown</h1>
        </div>
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-300 mb-2">No Concepts Tracked Yet</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Complete quizzes to automatically extract and track concepts. Your mastery data will appear here as you practice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Growth & Mastery</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Concept Mastery Breakdown</h1>
          <p className="text-xs text-slate-400">
            Mastery evolves dynamically based on quiz performance across {summary.total_concepts} tracked concept{summary.total_concepts !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchGrowthData}
          className="self-start sm:self-center px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Overall Mastery Summary */}
      <div className={`p-6 rounded-2xl bg-gradient-to-br ${getOverallGradient(summary.overall_mastery)} border space-y-4`}>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <BarChart3 className="w-4 h-4" />
          <span>Overall Project Mastery</span>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <span className="text-4xl font-black text-white tabular-nums">
              {Math.round(summary.overall_mastery)}
            </span>
            <span className="text-lg font-bold text-white/60 ml-1">%</span>
          </div>
          <div className="flex gap-4 pb-1">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400 tabular-nums">{summary.mastered_count}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-400 tabular-nums">{summary.improving_count}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Stable</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400 tabular-nums">{summary.needs_attention_count}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Attention</div>
            </div>
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-3 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(summary.overall_mastery, 100)}%` }}
          />
        </div>
      </div>

      {/* Individual Concept Progress */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tracked Concepts</h2>
        <div className="space-y-3">
          {summary.masteries.map((m: ConceptMastery) => {
            const badge = getStatusBadge(m.status);
            const conceptName = m.concept?.name || `Concept ${m.concept_id.slice(0, 8)}`;
            const attemptInfo = m.total_attempts > 0
              ? `${m.correct_attempts}/${m.total_attempts} correct`
              : 'No attempts';

            return (
              <div key={m.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5 hover:bg-slate-800/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{conceptName}</h3>
                    <span className="text-[11px] text-slate-400">{attemptInfo}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badge.className}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                    <span className="text-sm font-mono font-bold text-white tabular-nums">
                      {Math.round(m.score)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`${badge.barColor} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(m.score, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Growth Tip */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-4 h-4" />
          <span>Growth Insight</span>
        </div>
        {summary.needs_attention_count > 0 ? (
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            You have <strong>{summary.needs_attention_count} concept{summary.needs_attention_count !== 1 ? 's' : ''}</strong> that need{summary.needs_attention_count === 1 ? 's' : ''} attention.
            Focus on these by generating targeted quizzes and reviewing the related study materials to improve your mastery.
          </p>
        ) : summary.improving_count > 0 ? (
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Great progress! All concepts are at <strong>50% or above</strong>.
            Keep practicing with quizzes to push your stable concepts into the mastered range.
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Outstanding! You've achieved <strong>mastery across all tracked concepts</strong>.
            Continue reviewing to maintain your skills, or upload new materials to expand your knowledge.
          </p>
        )}
      </div>
    </div>
  );
};
