import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Eye,
  ArrowLeft,
  BookOpen,
  Bot,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { TopicSelectionRequired } from '../components/common/TopicSelectionRequired';

interface MaterialData {
  id: string;
  project_id: string;
  title: string;
  material_type: string;
  file_name?: string;
  file_size: number;
  mime_type: string;
  extracted_text?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

export const Materials: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const activeProjectId = routeProjectId || localStorage.getItem('last_active_project_id');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState<string>('');
  const [spaceName, setSpaceName] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>('');
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [submittingText, setSubmittingText] = useState(false);
  const [textModalError, setTextModalError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);

  const fetchMaterials = async () => {
    if (!activeProjectId) return;
    try {
      setLoading(true);
      setError(null);
      const [matRes, projRes] = await Promise.all([
        api.getMaterials(activeProjectId),
        api.getProject(activeProjectId).catch(() => null),
      ]);
      setMaterials(matRes.data || []);

      if (projRes?.data) {
        setProjectName(projRes.data.name);
        setSpaceId(projRes.data.space_id);
        if (projRes.data.space_id) {
          const spaceRes = await api.getSpace(projRes.data.space_id).catch(() => null);
          if (spaceRes?.data) setSpaceName(spaceRes.data.name);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [activeProjectId]);

  if (!activeProjectId) {
    return (
      <TopicSelectionRequired
        featureName="Study Materials"
        description="Select a learning topic from My Learning to manage study notes and PDFs."
      />
    );
  }

  const formatErrorMessage = (rawError: string | null): string => {
    if (!rawError) return 'An unexpected error occurred. Please try again.';
    const lower = rawError.toLowerCase();
    if (lower.includes('422') || lower.includes('unprocessable')) {
      return 'Please upload a supported PDF or text file (.pdf, .txt, .md).';
    }
    if (lower.includes('413') || lower.includes('payload') || lower.includes('too large')) {
      return 'File exceeds the 15MB limit. Please select a smaller document.';
    }
    if (lower.includes('500') || lower.includes('internal server')) {
      return 'Something went wrong while processing this document. Please try again.';
    }
    return rawError;
  };

  const handleFileUpload = async (file: File) => {
    if (!activeProjectId) return;
    setUploadError(null);

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB limit. Please select a smaller document.');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', activeProjectId);
    formData.append('title', file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    formData.append('file', file);

    try {
      setIsUploading(true);
      await api.uploadMaterial(formData);
      await fetchMaterials();
    } catch (err: any) {
      setUploadError(formatErrorMessage(err.message));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCreateTextMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !textTitle.trim() || !textContent.trim()) return;

    try {
      setSubmittingText(true);
      setTextModalError(null);
      await api.createTextMaterial(activeProjectId, {
        title: textTitle.trim(),
        content: textContent.trim(),
      });

      setTextTitle('');
      setTextContent('');
      setIsTextModalOpen(false);
      await fetchMaterials();
    } catch (err: any) {
      setTextModalError(formatErrorMessage(err.message));
    } finally {
      setSubmittingText(false);
    }
  };

  const handleDeleteMaterial = async (e: React.MouseEvent, materialId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await api.deleteMaterial(materialId);
      if (selectedMaterial?.id === materialId) {
        setSelectedMaterial(null);
      }
      await fetchMaterials();
    } catch (err: any) {
      alert(formatErrorMessage(err.message));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Learning
          </span>
        );
      case 'processing':
      case 'queued':
      case 'uploaded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Processing Vectors
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Processing Failed
          </span>
        );
    }
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
              <BookOpen className="w-3 h-3 text-indigo-400" />
              <span>{spaceName || 'Space'}</span>
            </Link>
            <span>/</span>
          </>
        )}
        <Link to={`/projects/${activeProjectId}`} className="hover:text-white transition-colors">
          {projectName || 'Project Workspace'}
        </Link>
        <span>/</span>
        <span className="text-white font-semibold">Study Materials</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            {projectName || 'Learning Project'}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Study Materials</h1>
          <p className="text-xs text-slate-400">Add course notes and PDFs to ground your AI Tutor and adaptive quizzes</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTextModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Text Notes
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.md"
            className="hidden"
          />
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center bg-slate-900/30 transition-all cursor-pointer group"
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {isUploading ? 'Uploading & Extracting Text...' : 'Click or drag & drop files here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Supports PDF, TXT, and MD formats (up to 15MB)</p>
          </div>
        </div>
      </div>

      {/* Post-Upload / Materials Ready Quick Action Callout */}
      {!loading && materials.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-emerald-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Your study materials are ready!</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready for Learning
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ask your AI Tutor questions grounded in your notes or take an adaptive practice quiz.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={`/projects/${activeProjectId}/tutor`}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              id="materials-learn-with-tutor-btn"
            >
              <Bot className="w-4 h-4" />
              <span>Learn with AI Tutor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={`/projects/${activeProjectId}/quiz`}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Take Quiz</span>
            </Link>
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Project Documents & Notes</h2>
          <span className="text-xs text-slate-400">{materials.length} Materials</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs font-medium">Loading project materials...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-xs">
            {error}
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Learning Materials Added</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Add PDF study guides or write text notes to build context for your AI tutor.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsTextModalOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors border border-slate-700"
              >
                <Plus className="w-4 h-4" />
                Add Text Note
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((mat) => (
              <div
                key={mat.id}
                onClick={() => setSelectedMaterial(mat)}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/40 hover:bg-slate-900 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0 font-semibold text-xs">
                    {mat.material_type === 'text' ? <BookOpen className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-indigo-400" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {mat.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700">
                        {mat.material_type === 'text' ? 'Study Note' : 'PDF Document'}
                      </span>
                      {mat.file_size > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(mat.file_size)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(mat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center shrink-0">
                  {getStatusBadge(mat.status)}
                  <Link
                    to={`/projects/${activeProjectId}/tutor`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/10 rounded-lg transition-colors"
                    title="Ask AI Tutor about this"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMaterial(mat);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="View Document Excerpts"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteMaterial(e, mat.id, mat.title)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Text Note Modal */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">Add Text Note</h2>
              <button
                onClick={() => setIsTextModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {textModalError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-xs">
                {textModalError}
              </div>
            )}

            <form onSubmit={handleCreateTextMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python OOP Concepts & Inheritance"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Text Content *</label>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste or write key notes, definitions, formulas..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono resize-y"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTextModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingText || !textTitle.trim() || !textContent.trim()}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                  {submittingText && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Detail & Extracted Text Preview Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl space-y-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedMaterial.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">
                  {selectedMaterial.material_type} • {formatFileSize(selectedMaterial.file_size)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-2">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Status:</span>
                {getStatusBadge(selectedMaterial.status)}
              </div>

              {selectedMaterial.error_message && (
                <div className="p-3 bg-red-950/40 border border-red-800/50 text-red-200 text-xs rounded-xl">
                  {selectedMaterial.error_message}
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Extracted Content / Notes Preview
                </h3>
                {selectedMaterial.extracted_text ? (
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96">
                    {selectedMaterial.extracted_text}
                  </pre>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950 border border-slate-800">
                    No text extracted for this material.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={(e) => handleDeleteMaterial(e, selectedMaterial.id, selectedMaterial.title)}
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Material
              </button>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
