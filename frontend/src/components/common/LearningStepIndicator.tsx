import React from 'react';
import { Check } from 'lucide-react';

export type LearningStep = 'topic' | 'material' | 'tutor' | 'practice' | 'progress';

interface LearningStepIndicatorProps {
  currentStep: LearningStep;
  completedSteps?: LearningStep[];
}

const STEPS: { id: LearningStep; label: string }[] = [
  { id: 'topic', label: 'Learning Topic' },
  { id: 'material', label: 'Study Material' },
  { id: 'tutor', label: 'Learn with AI' },
  { id: 'practice', label: 'Practice' },
  { id: 'progress', label: 'Track Progress' },
];

export const LearningStepIndicator: React.FC<LearningStepIndicatorProps> = ({
  currentStep,
  completedSteps = [],
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full py-3 px-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm overflow-x-auto">
      <div className="flex items-center justify-between min-w-[560px] gap-2">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id) || idx < currentIndex;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-white font-bold'
                      : isCompleted
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    idx < currentIndex || (isCompleted && completedSteps.includes(STEPS[idx + 1].id))
                      ? 'bg-emerald-500/40'
                      : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
