import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  FolderKanban,
  Flame,
  Award,
  Clock,
  CheckCircle2,
  Brain,
  Plus,
  Upload,
  BookOpen,
  RefreshCw,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { api, NextActionResponse, ConceptMastery, ActivityEventItem, ConceptItem } from '../api/client';
import { ProjectSwitcher } from '../components/common/ProjectSwitcher';

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

interface MaterialData {
  id: string;
  project_id: string;
  title: string;
  material_type: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

export const ProjectDashboard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [recommendation, setRecommendation] = useState<NextActionResponse | null>(null);
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [activities, setActivities] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Direct upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Text note modal state
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [submittingText, setSubmittingText] = useState(false);
  const [textModalError, setTextModalError] = useState<string | null>(null);

  const fetchProjectData = async (isBackground = false) => {
    if (!projectId) return;
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const [projRes, matRes, conceptsRes, recRes, masteryRes, actRes] = await Promise.all([
        api.getProject(projectId),
        api.getMaterials(projectId).catch(() => ({ data: [] })),
        api.getProjectConcepts(projectId).catch(() => ({ data: [] })),
        api.getNextRecommendation(projectId).catch(() => ({ data: null })),
        api.getMastery(projectId).catch(() => ({ data: [] })),
        api.getProjectActivity(projectId, 8).catch(() => ({ data: [] })),
      ]);

      const proj = projRes.data;
      setProject(proj);
      if (proj?.name) {
        localStorage.setItem('last_active_project_id', proj.id);
        localStorage.setItem('last_active_project_name', proj.name);
      }

      setMaterials(matRes.data || []);
      setConcepts(conceptsRes.data || []);
      if (recRes?.data) setRecommendation(recRes.data);
      if (masteryRes?.data) setMasteries(masteryRes.data);
      if (actRes?.data) setActivities(actRes.data);

      if (proj?.space_id) {
        const spaceRes = await api.getSpace(proj.space_id).catch(() => null);
        if (spaceRes?.data) {
          setSpace(spaceRes.data);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Auto-poll if any material is in processing/queued status
  useEffect(() => {
    const isAnyProcessing = materials.some(
      (m) => m.status === 'processing' || m.status === 'queued' || m.status === 'uploaded'
    );
    if (!isAnyProcessing) return;

    const intervalId = setInterval(() => {
      fetchProjectData(true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [materials, projectId]);

  // Handle direct file upload
  const handleFileUpload = async (file: File) => {
    if (!projectId) return;
    setUploadError(null);

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB limit. Please select a smaller document.');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('title', file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    formData.append('file', file);

    try {
      setIsUploading(true);
      await api.uploadMaterial(formData);
      await fetchProjectData(true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload study material');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle direct text note submission
  const handleCreateTextNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !textTitle.trim() || !textContent.trim()) return;

    setSubmittingText(true);
    setTextModalError(null);
    try {
      await api.createTextMaterial(projectId, {
        title: textTitle.trim(),
        content: textContent.trim(),
      });
      setIsTextModalOpen(false);
      setTextTitle('');
      setTextContent('');
      await fetchProjectData(true);
    } catch (err: any) {
      setTextModalError(err.message || 'Failed to save note');
    } finally {
      setSubmittingText(false);
    }
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
          buttonText: 'Explore Study Materials',
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
    const d = (event.details || {}) as Record<string, any>;
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
      case 'tutor_interacted':
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
      <div className="flex items-center justify-center p-16 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" aria-hidden="true" />
        <span className="text-xs font-medium">Loading project workspace...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Link to="/spaces" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" aria-hidden="true" /> Back to My Learning
        </Link>
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
          <span>{error || 'Project not found'}</span>
        </div>
      </div>
    );
  }

  // Determine progressive stage derived strictly from real data
  const hasMaterials = materials.length > 0;
  const hasProcessingMaterials = materials.some(
    (m) => m.status === 'processing' || m.status === 'queued' || m.status === 'uploaded'
  );
  const hasReadyMaterials = materials.some(
    (m) => m.status === 'ready' || m.status === 'completed' || m.status === 'processed'
  );
  const hasQuizProgress =
    activities.some(
      (a) => a.event_type === 'quiz_completed' || a.event_type === 'quiz_attempt_completed'
    ) || masteries.length > 0;

  let currentStage: 'onboarding' | 'processing' | 'ready' | 'progress' = 'onboarding';
  if (hasQuizProgress) {
    currentStage = 'progress';
  } else if (hasReadyMaterials) {
    currentStage = 'ready';
  } else if (hasProcessingMaterials || hasMaterials) {
    currentStage = 'processing';
  } else {
    currentStage = 'onboarding';
  }

  // Calculate overall mastery percentage if available
  const overallMasteryScore =
    masteries.length > 0
      ? Math.round(masteries.reduce((acc, m) => acc + (m.score || 0), 0) / masteries.length)
      : 0;

  const recDetails = recommendation ? getRecommendationDetails(recommendation) : null;

  // Compact Journey Indicator
  const renderLearningJourney = () => {
    const steps = [
      {
        id: 'materials',
        label: 'Materials',
        status:
          currentStage === 'onboarding'
            ? 'current'
            : currentStage === 'processing'
            ? 'processing'
            : 'completed',
      },
      {
        id: 'learn',
        label: 'Learn',
        status:
          currentStage === 'ready'
            ? 'current'
            : currentStage === 'progress'
            ? 'completed'
            : 'upcoming',
      },
      {
        id: 'practice',
        label: 'Practice',
        status:
          currentStage === 'progress'
            ? 'completed'
            : currentStage === 'ready'
            ? 'next'
            : 'upcoming',
      },
      {
        id: 'progress',
        label: 'Progress',
        status: currentStage === 'progress' ? 'current' : 'upcoming',
      },
    ];

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-slate-900/50 border border-slate-800">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Your learning journey
        </span>
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-xs">
          {steps.map((step, idx) => {
            const isDone = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isProcessing = step.status === 'processing';
            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isProcessing
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse'
                        : isCurrent
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/60'
                    }`}
                  >
                    {isDone ? '✓' : isProcessing ? '●' : isCurrent ? '●' : '○'}
                  </span>
                  <span
                    className={`font-medium ${
                      isDone
                        ? 'text-slate-300'
                        : isCurrent || isProcessing
                        ? 'text-white font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                    {isProcessing ? ' (Processing)' : ''}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <span className="text-slate-700 select-none" aria-hidden="true">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hidden File Input for PDF / Notes upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      {/* Context Breadcrumb & Switcher */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/spaces" className="hover:text-white transition-colors">My Learning</Link>
          <span aria-hidden="true">/</span>
          {space ? (
            <Link to={`/spaces/${space.id}`} className="hover:text-white transition-colors flex items-center gap-1">
              <FolderKanban className="w-3 h-3 text-indigo-400" aria-hidden="true" />
              <span>{space.name}</span>
            </Link>
          ) : (
            <span>Space</span>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-white font-semibold">{project.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <ProjectSwitcher currentProjectId={project.id} currentSpaceId={space?.id} />
        </div>
      </div>

      {/* Project Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>Learning Workspace</span>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">
            {project.status || 'Active'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {project.description || 'Your focused learning workspace.'}
          </p>
        </div>

        {project.learning_goal && (
          <div className="p-3.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl text-xs text-slate-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-indigo-300">Learning Goal:</strong> {project.learning_goal}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STATE 1: BRAND NEW PROJECT (MATERIAL ONBOARDING)                           */}
      {/* ========================================================================= */}
      {currentStage === 'onboarding' && (
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto pt-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Let's get your learning started</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              First, add your study materials. I'll use them to help you understand the topic, answer questions, and create practice quizzes.
            </p>
          </div>

          {/* Primary Upload Card */}
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all text-center flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <FileText className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-white">Add your study material</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload lecture notes, PDFs, study documents, or write quick text notes to ground your AI companion.
              </p>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded-xl flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Uploading & Processing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>+ Add Study Material</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsTextModalOpen(true)}
                disabled={isUploading}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-3 rounded-xl border border-slate-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                <span>Write a Note</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500">Supports PDF, TXT, MD up to 15MB</span>
          </div>

          {/* Subtle Journey Indicator */}
          {renderLearningJourney()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 2: MATERIAL PROCESSING                                              */}
      {/* ========================================================================= */}
      {currentStage === 'processing' && (
        <div className="space-y-6">
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900/80 border border-indigo-500/30 text-center flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" aria-hidden="true" />
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-bold text-white tracking-tight">Understanding your study material...</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Preparing your material so I can help you learn from it. We are extracting knowledge vectors, building context, and discovering key study concepts.
              </p>
            </div>

            {/* List of processing documents */}
            <div className="w-full space-y-2 max-w-md">
              {materials.map((mat) => (
                <div key={mat.id} className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
                    <span className="text-slate-200 font-medium truncate">{mat.title || mat.file_name || 'Study Document'}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    {mat.status === 'uploaded' ? 'Queued' : 'Processing Vectors'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => fetchProjectData(true)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Check Status</span>
            </button>
          </div>

          {/* Subtle Journey Indicator */}
          {renderLearningJourney()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 3: MATERIAL READY — EXPLORE & LEARN                                  */}
      {/* ========================================================================= */}
      {currentStage === 'ready' && (
        <div className="space-y-8">
          {/* Material Ready Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Your material is ready!</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Start exploring what you're learning</h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Your study documents are indexed and ready. You can now explore discovered concepts or ask questions to your AI Tutor.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to={`/projects/${project.id}/tutor`}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                <Bot className="w-4 h-4" aria-hidden="true" />
                <span>Learn with AI Tutor</span>
              </Link>
              <Link
                to={`/projects/${project.id}/quiz`}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-700 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Take Quiz</span>
              </Link>
            </div>
          </div>

          {/* Uploaded Study Materials Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Study Materials</h3>
              <Link
                to={`/projects/${project.id}/materials`}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Manage Materials ({materials.length}) →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                      <FileText className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{m.title || m.file_name || 'Notes'}</p>
                      <span className="text-[10px] text-slate-400">{formatEventTime(m.created_at)}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Check className="w-3 h-3" aria-hidden="true" /> Ready
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Concepts Section (if any extracted) */}
          {concepts.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">What You're Learning</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Key concepts discovered from your study materials</p>
                </div>
                <Link
                  to={`/projects/${project.id}/knowledge`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View All ({concepts.length}) →
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {concepts.slice(0, 10).map((c) => (
                  <span
                    key={c.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {c.name}
                  </span>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Ready to learn? Ask your AI Tutor about any of these concepts.</span>
                <Link
                  to={`/projects/${project.id}/tutor`}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <span>Open AI Tutor</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}

          {/* AI Tutor Starter Prompts Section */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Bot className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Learn with AI Tutor</h3>
                  <p className="text-xs text-slate-400">Ask questions about your study materials and get explanations based on what you're learning.</p>
                </div>
              </div>
              <Link
                to={`/projects/${project.id}/tutor`}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/25 shrink-0"
              >
                <Bot className="w-4 h-4" aria-hidden="true" />
                <span>Chat with AI Tutor</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="pt-1">
              <p className="text-[11px] font-medium text-slate-400 mb-2.5">Or choose a starter question:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Explain the main concepts', desc: 'Get a clear breakdown of foundational ideas' },
                  { title: 'Summarize my notes', desc: 'Key takeaways and essential summaries' },
                  { title: 'Give me a real-world example', desc: 'Practical applications of study topics' },
                  { title: 'What should I remember for an exam?', desc: 'Core definitions, formulas, and concepts' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.title}
                    onClick={() => navigate(`/projects/${project.id}/tutor?prompt=${encodeURIComponent(suggestion.title)}`)}
                    className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 hover:border-indigo-500/40 border border-slate-800 text-left transition-all group"
                  >
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 flex items-center justify-between">
                      <span>{suggestion.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{suggestion.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ready to Test Yourself Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Ready to test yourself?</h3>
              <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                Take an adaptive quiz to check how well you understand the material. Your score will start tracking your concept mastery.
              </p>
            </div>
            <Link
              to={`/projects/${project.id}/quiz`}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-emerald-600/30 shrink-0"
            >
              <CheckSquare className="w-4 h-4" aria-hidden="true" />
              <span>Start Practice</span>
            </Link>
          </div>

          {/* Subtle Journey Indicator */}
          {renderLearningJourney()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 4: POST-QUIZ PROGRESS & FULL WORKSPACE                               */}
      {/* ========================================================================= */}
      {currentStage === 'progress' && (
        <div className="space-y-8">
          {/* Subtle Journey Indicator */}
          {renderLearningJourney()}

          {/* Top Learning Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Mastery</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">{overallMasteryScore}%</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Across all concepts</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Study Materials</span>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">{materials.length}</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Notes & documents</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Concepts Tracked</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1">{concepts.length}</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Discovered ideas</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activities</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{activities.length}</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Quizzes & sessions</span>
            </div>
          </div>

          {/* Recommended Next Step & Concept Mastery Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Concept Mastery Summary */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concept Mastery</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Performance breakdown across assessed concepts</p>
                </div>
                <Link to={`/projects/${projectId}/growth`} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                  View Detailed Growth →
                </Link>
              </div>

              {masteries.length > 0 ? (
                <div className="space-y-3">
                  {masteries.slice(0, 5).map((m) => {
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
                  <p className="text-xs text-slate-400">Take an adaptive quiz to start tracking concept mastery.</p>
                  <Link to={`/projects/${projectId}/quiz`} className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    Take an adaptive quiz →
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
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                        <span>Next Learning Action</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${recDetails.badgeColor}`}>
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
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      <span>Next Learning Action</span>
                    </div>
                    <h3 className="text-base font-bold text-white">Continue Your Practice</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Keep practicing with adaptive quizzes to strengthen your knowledge and address weak spots.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      to={`/projects/${projectId}/quiz`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                    >
                      <span>Take Practice Quiz</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Project Activity */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <span>Recent Activity</span>
              </div>
              <Link to={`/projects/${projectId}/analytics`} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
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
                          <EventIcon className="w-3.5 h-3.5" aria-hidden="true" />
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
                  No learning activity logged yet in this project.
                </p>
              </div>
            )}
          </div>

          {/* Learning Areas (7 Workspace Modules Quick Access) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Learning Areas
              </h2>
              <span className="text-[11px] text-slate-500">7 Core Workspace Modules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: 'Study Materials',
                  category: 'LEARN',
                  icon: FileText,
                  to: `/projects/${projectId}/materials`,
                  desc: `${materials.length} notes & documents uploaded`,
                  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                },
                {
                  label: 'Knowledge Base',
                  category: 'LEARN',
                  icon: Brain,
                  to: `/projects/${projectId}/knowledge`,
                  desc: `${concepts.length} concepts discovered`,
                  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                },
                {
                  label: 'AI Tutor',
                  category: 'LEARN',
                  icon: Bot,
                  to: `/projects/${projectId}/tutor`,
                  desc: 'Grounded question answering',
                  color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                },
                {
                  label: 'Adaptive Quiz',
                  category: 'PRACTICE',
                  icon: CheckSquare,
                  to: `/projects/${projectId}/quiz`,
                  desc: 'Adaptive knowledge assessments',
                  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                },
                {
                  label: 'Concept Mastery & Growth',
                  category: 'PROGRESS',
                  icon: TrendingUp,
                  to: `/projects/${projectId}/growth`,
                  desc: 'Skill tracking & growth insights',
                  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                },
                {
                  label: 'Project Analytics',
                  category: 'PROGRESS',
                  icon: BarChart3,
                  to: `/projects/${projectId}/analytics`,
                  desc: 'Telemetry & practice sessions',
                  color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${item.color}`}>
                        <item.icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                        {item.category}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {item.label}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1 pt-1">
                    <span>Open module</span> <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Write Note Modal */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Write a Study Note</h3>
              <button
                onClick={() => setIsTextModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Type or paste lecture notes, definitions, or study guides directly into your project.
            </p>

            {textModalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{textModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTextNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Machine Learning"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste or write your study notes here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTextModalOpen(false)}
                  disabled={submittingText}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingText}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-md shadow-indigo-600/30"
                >
                  {submittingText ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Saving Note...</span>
                    </>
                  ) : (
                    <span>Save Note</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
