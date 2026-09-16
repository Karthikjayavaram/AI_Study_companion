import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckSquare,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Flame,
  Award,
  Clock,
  Layers,
  FileText,
  Loader2,
  Plus,
} from 'lucide-react';
import { api, QuizItem, QuestionSanitized, QuizAttemptStart, QuizAttemptResult, ApiError } from '../api/client';

type ViewMode = 'list' | 'taking' | 'results';

export const Quiz: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // State
  const [projectName, setProjectName] = useState<string>('Project Assessment');
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Generator Modal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [genTitle, setGenTitle] = useState<string>('');
  const [genDifficulty, setGenDifficulty] = useState<string>('adaptive');
  const [genQuestionCount, setGenQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Active Quiz Attempt state
  const [activeAttempt, setActiveAttempt] = useState<QuizAttemptStart | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Results state
  const [evaluatedResult, setEvaluatedResult] = useState<QuizAttemptResult | null>(null);

  // 1. Fetch project info and existing quizzes
  const loadQuizzes = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      // Get project details
      try {
        const pRes = await api.getProject(projectId);
        if (pRes.data?.name) {
          setProjectName(pRes.data.name);
        }
      } catch {
        // Fallback gracefully if project detail endpoint fails
      }

      const res = await api.getQuizzes(projectId);
      setQuizzes(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quizzes for this project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [projectId]);

  // 2. Handle Quiz Generation
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setIsGenerating(true);
    setGenError(null);

    try {
      const res = await api.generateQuiz(projectId, {
        title: genTitle.trim() || undefined,
        difficulty: genDifficulty,
        question_count: genQuestionCount,
      });

      setIsGeneratorOpen(false);
      setGenTitle('');
      await loadQuizzes();

      // Automatically launch attempt for newly generated quiz
      if (res.data?.id) {
        await handleStartQuiz(res.data.id);
      }
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate quiz. Ensure project materials are uploaded.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Start a Quiz Attempt
  const handleStartQuiz = async (quizId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.startQuizAttempt(quizId);
      setActiveAttempt(res.data);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setViewMode('taking');
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz attempt.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Record student option choice
  const handleSelectOption = (questionId: string, option: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // 5. Submit Quiz Attempt
  const handleSubmitAttempt = async () => {
    if (!activeAttempt) return;

    setIsSubmitting(true);
    setError(null);

    const submissionPayload = activeAttempt.questions.map((q) => ({
      question_id: q.id,
      user_answer: userAnswers[q.id] || '',
    }));

    try {
      const res = await api.submitQuizAttempt(activeAttempt.id, submissionPayload);
      setEvaluatedResult(res.data);
      setViewMode('results');
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyBadge = (diff: string) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (d === 'hard') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (d === 'adaptive') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  // ---------------------------------------------------------------------------
  // VIEW: TAKING ACTIVE QUIZ
  // ---------------------------------------------------------------------------
  if (viewMode === 'taking' && activeAttempt) {
    const currentQ: QuestionSanitized | undefined = activeAttempt.questions[currentQuestionIndex];
    const totalQ = activeAttempt.questions.length;
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <div>
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              {activeAttempt.quiz_title}
            </span>
            <div className="text-xs text-slate-400">
              Question {currentQuestionIndex + 1} of {totalQ}
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to exit? Your attempt progress will be lost.')) {
                setViewMode('list');
                setActiveAttempt(null);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
          >
            Exit Quiz
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Card */}
        {currentQ ? (
          <div className="p-6 md:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Question {currentQuestionIndex + 1}
              </span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium uppercase ${getDifficultyBadge(currentQ.difficulty)}`}>
                {currentQ.difficulty}
              </span>
            </div>

            <h2 className="text-base md:text-lg font-medium text-white leading-relaxed">
              {currentQ.question_text}
            </h2>

            {/* Multiple Choice Options (Conceals correct answer) */}
            <div className="space-y-3 pt-2">
              {(currentQ.options || []).map((option, idx) => {
                const isSelected = userAnswers[currentQ.id] === option;
                const optionLetter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, option)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {optionLetter}
                    </span>
                    <span className="leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation & Submission Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs text-slate-400">
            {answeredCount} of {totalQ} Answered
          </span>

          {currentQuestionIndex < totalQ - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQ - 1, prev + 1))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md shadow-indigo-600/20"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitAttempt}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scoring Answers...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Submit Assessment
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: RESULTS & SOURCE ATTRIBUTION REVIEW
  // ---------------------------------------------------------------------------
  if (viewMode === 'results' && evaluatedResult) {
    const isPassing = evaluatedResult.score >= 70;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Score Banner */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Assessment Completed
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {evaluatedResult.quiz_title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Server-evaluated score based strictly on project learning materials.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {evaluatedResult.score}%
                </div>
                <div className="text-[11px] font-medium text-slate-400">
                  {evaluatedResult.correct_answers} / {evaluatedResult.total_questions} Correct
                </div>
              </div>
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg ${
                  isPassing
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <Award className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Quizzes
            </button>
            <button
              onClick={() => handleStartQuiz(evaluatedResult.quiz_id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake Quiz
            </button>
          </div>
        </div>

        {/* Detailed Question Review Breakdown */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">
            Question Explanations & Citations
          </h2>

          {evaluatedResult.results.map((res, index) => (
            <div
              key={res.question_id || index}
              className={`p-6 rounded-2xl border space-y-4 transition-all ${
                res.is_correct
                  ? 'bg-slate-900/60 border-emerald-500/30'
                  : 'bg-slate-900/60 border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {res.is_correct ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      <XCircle className="w-3.5 h-3.5" />
                      Incorrect
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-medium">
                    Question {index + 1}
                  </span>
                </div>
              </div>

              <p className="text-sm font-semibold text-white leading-relaxed">
                {res.question_text}
              </p>

              {/* Answers Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Your Answer:</div>
                  <div className={`font-medium ${res.is_correct ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {res.user_answer || '(No answer provided)'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Correct Answer:</div>
                  <div className="font-medium text-emerald-300">
                    {res.correct_answer}
                  </div>
                </div>
              </div>

              {/* Explanation */}
              {res.explanation && (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-300">Explanation: </span>
                    {res.explanation}
                  </div>
                </div>
              )}

              {/* Source Grounding Citation */}
              {(res.source_material_title || res.source_chunk_text) && (
                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Grounded in Source: {res.source_material_title || 'Project Study Material'}</span>
                  </div>
                  {res.source_chunk_text && (
                    <p className="text-slate-400 italic text-[11px] leading-relaxed pl-5 border-l-2 border-indigo-500/30">
                      "{res.source_chunk_text}..."
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW: QUIZ LIST & GENERATOR (DEFAULT)
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            {projectName}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Adaptive Quizzes & Assessments</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Test your knowledge with quizzes generated dynamically from your study materials.
          </p>
        </div>

        <button
          onClick={() => setIsGeneratorOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Generate New Quiz
        </button>
      </div>

      {/* Global error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quizzes List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading project quizzes...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center p-12 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No Quizzes Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Generate an AI quiz from your project's notes and documents to test your recall and evaluate mastery.
            </p>
          </div>
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Your First Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase ${getDifficultyBadge(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {q.title}
                </h3>
                {q.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {q.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  {q.question_count || q.questions?.length || 0} Questions
                </span>

                <button
                  onClick={() => handleStartQuiz(q.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
                >
                  <Play className="w-3 h-3" />
                  Take Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Generate Adaptive Quiz</span>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {genError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Quiz Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Key Concepts Quiz"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Difficulty
                </label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="adaptive">Adaptive (Auto-tuned to prior performance)</option>
                  <option value="easy">Easy (Foundational Recall)</option>
                  <option value="medium">Medium (Standard Comprehension)</option>
                  <option value="hard">Hard (Deep Analysis & Nuance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Number of Questions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGenQuestionCount(count)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        genQuestionCount === count
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {count} Questions
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-indigo-300 leading-relaxed">
                Questions will be synthesized strictly from your uploaded study materials with verifiable source citations.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGeneratorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Quiz
                    </>
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
