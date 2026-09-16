import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare, Sparkles, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export const Quiz: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openAnswer, setOpenAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Adaptive Assessment</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Machine Learning Foundations Quiz</h1>
          <p className="text-xs text-slate-400">Adaptive difficulty tailored to your mastery levels</p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setSelectedOption(null);
            setOpenAnswer('');
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate Quiz
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question 1: MCQ */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Question 1 (MCQ)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Medium</span>
          </div>

          <p className="text-sm font-semibold text-white">
            What is the primary role of a loss function during gradient descent optimization?
          </p>

          <div className="space-y-2.5">
            {[
              'To measure model error and compute gradients for parameter updates',
              'To normalize input features between 0 and 1',
              'To store persistent user conversation history',
              'To serialize data into JSON format',
            ].map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedOption === option
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <input
                  type="radio"
                  name="q1"
                  value={option}
                  checked={selectedOption === option}
                  onChange={() => setSelectedOption(option)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 2: Open-Ended Question */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Question 2 (Open-Ended)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Hard</span>
          </div>

          <p className="text-sm font-semibold text-white">
            Explain the trade-off between bias and variance in machine learning models and how regularization impacts it.
          </p>

          <textarea
            rows={4}
            value={openAnswer}
            onChange={(e) => setOpenAnswer(e.target.value)}
            placeholder="Write your explanation in detail..."
            className="w-full p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {!submitted ? (
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30"
          >
            Submit for AI Assessment & Grading
          </button>
        ) : (
          /* Evaluated Feedback Card */
          <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Assessment Completed • Overall Score: 92%</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2">
                <strong className="text-white">AI Qualitative Feedback (Open-Ended Evaluation):</strong>
                <p className="text-slate-300 leading-relaxed">
                  "Good conceptual clarity on variance. You correctly identified that high variance leads to overfitting. To reach full mastery, remember to highlight how L2 (Ridge) penalizes large squared weights while L1 encourages sparsity."
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Covered: Bias, Variance, Overfitting
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Missing: L1 vs L2 Weight Decay Sparsity
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
