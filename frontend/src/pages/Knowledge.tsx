import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  FileText,
  Bot,
  FolderKanban,
  CheckSquare,
} from 'lucide-react';
import { api, ConceptItem, ConceptMastery } from '../api/client';
import { TopicSelectionRequired } from '../components/common/TopicSelectionRequired';

export const Knowledge: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const activeProjectId = routeProjectId || localStorage.getItem('last_active_project_id');

  const [projectName, setProjectName] = useState<string>('Study Topic');
  const [spaceName, setSpaceName] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>('');
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [masteries, setMasteries] = useState<Record<string, ConceptMastery>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!activeProjectId) return;

    const loadKnowledgeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projRes, conceptsRes, masteryRes] = await Promise.all([
          api.getProject(activeProjectId).catch(() => null),
          api.getProjectConcepts(activeProjectId).catch(() => ({ data: [] })),
          api.getMastery(activeProjectId).catch(() => ({ data: [] })),
        ]);

        if (projRes?.data) {
          setProjectName(projRes.data.name);
          setSpaceId(projRes.data.space_id);
          localStorage.setItem('last_active_project_id', activeProjectId);
          localStorage.setItem('last_active_project_name', projRes.data.name);

          if (projRes.data.space_id) {
            const spaceRes = await api.getSpace(projRes.data.space_id).catch(() => null);
            if (spaceRes?.data) {
              setSpaceName(spaceRes.data.name);
            }
          }
        }

        setConcepts(conceptsRes.data || []);

        const masteryMap: Record<string, ConceptMastery> = {};
        (masteryRes.data || []).forEach((m: ConceptMastery) => {
          masteryMap[m.concept_id] = m;
        });
        setMasteries(masteryMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load project knowledge base.');
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgeData();
  }, [activeProjectId]);

  if (!activeProjectId) {
    return (
      <TopicSelectionRequired
        featureName="Knowledge Base"
        description="Select a learning topic from My Learning to explore key concepts."
      />
    );
  }

  const categories = Array.from(
    new Set(concepts.map((c) => c.category || 'General').filter(Boolean))
  );

  const filteredConcepts =
    selectedCategory === 'all'
      ? concepts
      : concepts.filter((c) => (c.category || 'General') === selectedCategory);

  const getStatusBadge = (conceptId: string) => {
    const mastery = masteries[conceptId];
    if (!mastery) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          Not Tested Yet
        </span>
      );
    }
    const score = Math.round(mastery.score);
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Strong ({score}%)
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <TrendingUp className="w-3 h-3" /> Developing ({score}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-3 h-3" /> Needs Practice ({score}%)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Context Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/spaces" className="hover:text-white transition-colors">My Learning</Link>
        <span>/</span>
        {spaceId && (
          <>
            <Link to={`/spaces/${spaceId}`} className="hover:text-white transition-colors flex items-center gap-1">
              <FolderKanban className="w-3 h-3 text-indigo-400" />
              <span>{spaceName || 'Space'}</span>
            </Link>
            <span>/</span>
          </>
        )}
        <Link to={`/projects/${activeProjectId}`} className="hover:text-white transition-colors">
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-white font-semibold">Knowledge</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>Extracted Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Concepts & Knowledge</h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Key concepts and domain knowledge extracted from your uploaded study materials and adaptive quizzes for{' '}
            <strong className="text-slate-300">{projectName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/projects/${activeProjectId}/tutor`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Tutor</span>
          </Link>
          <Link
            to={`/projects/${activeProjectId}/quiz`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Practice</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Concepts ({concepts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-medium">Loading concept knowledge base...</span>
        </div>
      ) : concepts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Brain className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No Concepts Tracked Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Knowledge will appear as you learn and build understanding from your study materials. When you take quizzes or converse with your AI Tutor, key concepts are extracted automatically.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to={`/projects/${activeProjectId}/materials`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
            >
              <FileText className="w-4 h-4" />
              <span>Add Study Material</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConcepts.map((concept) => (
            <div
              key={concept.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/50">
                    {concept.category || 'Core Concept'}
                  </span>
                  {getStatusBadge(concept.id)}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{concept.name}</h3>
                {concept.description && (
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {concept.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Added {new Date(concept.created_at).toLocaleDateString()}
                </span>
                <Link
                  to={`/projects/${activeProjectId}/tutor`}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask Tutor</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
