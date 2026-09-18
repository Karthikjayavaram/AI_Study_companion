import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';

interface TopicSelectionRequiredProps {
  featureName: string;
  description?: string;
}

export const TopicSelectionRequired: React.FC<TopicSelectionRequiredProps> = ({
  featureName,
  description,
}) => {
  const defaultDesc = `Select a learning topic from My Learning to use ${featureName}.`;

  return (
    <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-5 max-w-lg mx-auto my-12 shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
        <BookOpen className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white tracking-tight">Choose a learning topic first</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {description || defaultDesc}
        </p>
      </div>
      <div className="pt-2">
        <Link
          to="/spaces"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50"
        >
          <span>Choose Topic in My Learning</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
