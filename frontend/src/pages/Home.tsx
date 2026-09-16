import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FolderKanban,
  BookOpen,
  Brain,
  CheckCircle2,
} from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Learning & Growth Workspace
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Welcome back to your Study Companion
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Persistent, contextual learning grounded in your uploaded materials. Track mastery, practice adaptively, and receive targeted next steps.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/projects/demo/tutor"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50"
            >
              <Brain className="w-4 h-4" />
              Continue Learning
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/spaces"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              <FolderKanban className="w-4 h-4" />
              Explore Spaces
            </Link>
          </div>
        </div>
      </div>

      {/* Answers: Where was I? How am I doing? What should I do next? */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Where was I? */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Where was I</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Machine Learning Foundations</h3>
          <p className="text-xs text-slate-400">
            Last active in Chapter 3: Gradient Descent & Loss Optimization. 2 documents processed.
          </p>
          <Link
            to="/projects/demo"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5"
          >
            Resume Project <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: How am I doing? */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How am I doing</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">74%</span>
            <span className="text-xs text-emerald-400 font-medium">+8% this week</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full w-3/4"></div>
          </div>
          <p className="text-xs text-slate-400">
            3 concepts improving, 1 concept requires attention.
          </p>
        </div>

        {/* Card 3: What should I do next? */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Recommended Next Action</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-white">Review Regularization Concepts</h3>
          <p className="text-xs text-slate-300">
            Application-based quiz questions on L1/L2 penalties were missed. Take a short 3-question adaptive quiz.
          </p>
          <Link
            to="/projects/demo/quiz"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg"
          >
            Start Adaptive Quiz <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Core Learning Loop Visualizer */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Core Learning Loop Architecture</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { step: '1. Create Space', desc: 'Domain container', active: true },
            { step: '2. Create Project', desc: 'Context boundary', active: true },
            { step: '3. Add Material', desc: 'PDF / Text ingestion', active: true },
            { step: '4. AI Tutor', desc: 'Grounded citations', active: true },
            { step: '5. Adaptive Quiz', desc: 'MCQ & open-ended', active: true },
            { step: '6. Concept Mastery', desc: 'Growth estimation', active: true },
            { step: '7. Next Action', desc: 'Targeted practice', active: true },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-left transition-all ${
                item.active
                  ? 'bg-slate-800/60 border-slate-700 hover:border-indigo-500/40'
                  : 'bg-slate-900/40 border-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{item.step}</span>
              </div>
              <p className="text-[11px] text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
