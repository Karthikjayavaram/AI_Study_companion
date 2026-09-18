import React, { useState } from 'react';
import { X, Loader2, FolderKanban } from 'lucide-react';
import { api } from '../../api/client';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated?: (newSpace: any) => void;
}

const COLOR_OPTIONS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#ef4444', // Red
];

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({
  isOpen,
  onClose,
  onSpaceCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorCode, setColorCode] = useState('#4f46e5');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.createSpace({
        name: name.trim(),
        description: description.trim() || undefined,
        color_code: colorCode,
      });

      setName('');
      setDescription('');
      setColorCode('#4f46e5');
      onClose();
      if (onSpaceCreated) {
        onSpaceCreated(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create learning space. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Learning Space</h2>
              <p className="text-[11px] text-slate-400">A broad subject or area you want to explore</p>
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
          <strong className="text-indigo-300">What is a Space?</strong> A broad field or goal like{' '}
          <em>Computer Science</em>, <em>Placement Preparation</em>, or <em>Data Science</em>. Inside each Space, you'll organize focused learning projects.
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Space Name <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Computer Science or Placement Preparation"
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
              placeholder="e.g. Core coursework, coding foundations, and interview prep"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Visual Accent</label>
            <div className="flex items-center gap-2.5">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorCode(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    colorCode === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
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
              disabled={submitting || !name.trim() || !description.trim()}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Space</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
