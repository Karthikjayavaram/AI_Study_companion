import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  Sparkles,
  Target,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  RefreshCw,
  BarChart3,
  ArrowRight,
  Flame,
  Award,
  Compass,
} from 'lucide-react';
import { api, GrowthSummary, ConceptMastery, NextActionResponse } from '../api/client';

export const Growth: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [recommendation, setRecommendation] = useState<NextActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrowthData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, recRes] = await Promise.all([
        api.getGrowthSummary(projectId),
        api.getNextRecommendation(projectId).catch(() => ({ data: null })),
      ]);
      setSummary(summaryRes.data);
      if (recRes?.data) {
        setRecommendation(recRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load growth data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGrowthData();
  }, [fetchGrowthData]);

  const getStatusBadge = (score: number, status?: string) => {
    if (score >= 80) {
      return {
        label: 'Strong',
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        barColor: 'bg-emerald-500',
      };
    }
    if (score >= 50) {
      return {
        label: 'Developing',
        icon: <TrendingUp className="w-3 h-3" />,
        className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        barColor: 'bg-indigo-500',
      };
    }
    return {
      label: 'Needs Practice',
      icon: <AlertTriangle className="w-3 h-3" />,
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      barColor: 'bg-amber-500',
    };
  };

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
          buttonText: 'Review Concept with Tutor',
          icon: Sparkles,
        };
      case 'mixed_review':
        return {
          badge: 'Strong / Ready',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          buttonText: 'Take Challenge Quiz',
          icon: Award,
        };
      case 'start_learning':
      default:
        return {
          badge: 'Getting Started',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          buttonText: 'Explore Study Materials',
          icon: Compass,
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

  const recDetails = recommendation ? getRecommendationDetails(recommendation) : null;

  if (!summary || summary.total_concepts === 0) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Growth & Mastery</div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Concept Mastery Breakdown</h1>
        </div>
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mb-2" />
          <h3 className="text-lg font-bold text-slate-300">No Concepts Tracked Yet</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Complete quizzes to automatically extract and track concepts. Your mastery data will appear here as you practice.
          </p>
          {recommendation && recDetails && (
            <div className="pt-2">
              <Link
                to={recommendation.action_url}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                <span>{recDetails.buttonText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
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

      {/* Recommended Next Action Card */}
      {recommendation && recDetails && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span>Next Learning Action</span>
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${recDetails.badgeColor}`}>
              {recDetails.badge}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h2 className="text-lg font-bold text-white tracking-tight">{recommendation.title}</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {recommendation.reason}
              </p>
            </div>
            <div className="shrink-0">
              <Link
                to={recommendation.target_concept_id ? `${recommendation.action_url}?concept_id=${recommendation.target_concept_id}` : recommendation.action_url}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                <span>{recDetails.buttonText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300 font-semibold">{summary.mastered_count}</span>
              <span className="text-slate-400">Strong</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-slate-300 font-semibold">{summary.improving_count}</span>
              <span className="text-slate-400">Developing</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300 font-semibold">{summary.needs_attention_count}</span>
              <span className="text-slate-400">Needs Practice</span>
            </div>
          </div>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-white transition-all duration-500"
            style={{ width: `${Math.min(summary.overall_mastery, 100)}%` }}
          />
        </div>
      </div>

      {/* Individual Concepts */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Target className="w-4 h-4 text-indigo-400" />
            <span>Tracked Concepts ({summary.masteries.length})</span>
          </div>
          <span className="text-xs text-slate-500">Sorted by mastery score</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {summary.masteries.map((m: ConceptMastery) => {
            const badge = getStatusBadge(m.score, m.status);
            const conceptName = m.concept?.name || 'Unknown Concept';
            return (
              <div key={m.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{conceptName}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${badge.className}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      {m.correct_attempts}/{m.total_attempts} correct ({Math.round(m.score)}%)
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
