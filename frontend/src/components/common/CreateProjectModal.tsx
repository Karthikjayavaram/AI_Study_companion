import React, { useState, useEffect } from 'react';
import { X, Loader2, Compass, FolderKanban } from 'lucide-react';
import { api } from '../../api/client';

interface SpaceItem {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSpaceId?: string;
  spaces?: SpaceItem[];
  onProjectCreated?: (newProject: any) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  defaultSpaceId,
  spaces: passedSpaces,
  onProjectCreated,
}) => {
  const [spaces, setSpaces] = useState<SpaceItem[]>(passedSpaces || []);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(defaultSpaceId || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultSpaceId) {
      setSelectedSpaceId(defaultSpaceId);
    }
  }, [defaultSpaceId]);

  useEffect(() => {
    if (!passedSpaces || passedSpaces.length === 0) {
      api.getSpaces().then((res) => {
        const fetched = res.data || [];
        setSpaces(fetched);
        if (!selectedSpaceId && fetched.length > 0) {
          setSelectedSpaceId(fetched[0].id);
        }
      }).catch(() => {});
    } else {
      setSpaces(passedSpaces);
      if (!selectedSpaceId && passedSpaces.length > 0) {
        setSelectedSpaceId(passedSpaces[0].id);
      }
    }
  }, [passedSpaces, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !learningGoal.trim() || !selectedSpaceId) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.createProject({
        space_id: selectedSpaceId,
        name: name.trim(),
        description: description.trim(),
        learning_goal: learningGoal.trim(),
      });

      setName('');
      setDescription('');
      setLearningGoal('');
      onClose();
      if (onProjectCreated) {
        onProjectCreated(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Learning Project</h2>
              <p className="text-[11px] text-slate-400">A focused learning workspace inside your Space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Educational Callout */}
        <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
          <strong className="text-indigo-300">What is a Project?</strong> A dedicated workspace for a specific topic like{' '}
          <em>Machine Learning Fundamentals</em> or <em>Operating Systems</em>. It brings your study materials, AI Tutor, quizzes, and progress together.
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {spaces.length > 1 && !defaultSpaceId ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Parent Space <span className="text-indigo-400">*</span>
              </label>
              <select
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : spaces.length === 1 || defaultSpaceId ? (
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 text-xs flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-slate-400">Space:</span>
              <span className="text-white font-medium">
                {spaces.find((s) => s.id === selectedSpaceId)?.name || 'Current Space'}
              </span>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Project Name <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Machine Learning Fundamentals"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description <span className="text-indigo-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Core machine learning concepts, algorithms, and models"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Learning Goal <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master gradient descent, regression, and neural net intuition"
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !description.trim() || !learningGoal.trim() || !selectedSpaceId}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
