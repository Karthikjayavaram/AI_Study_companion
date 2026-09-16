import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';

export const Materials: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isUploading, setIsUploading] = useState(false);

  const [materials] = useState([
    {
      id: 'mat-1',
      title: 'Machine Learning Lecture Notes - Week 1 & 2',
      file_name: 'ML_Lecture_Notes_W1_W2.pdf',
      file_size: '2.4 MB',
      status: 'ready',
      chunks: 34,
      uploaded_at: '2 hours ago',
    },
    {
      id: 'mat-2',
      title: 'Gradient Descent & Backprop Deep Dive',
      file_name: 'Optimization_Calculus.pdf',
      file_size: '4.8 MB',
      status: 'processing',
      chunks: 0,
      uploaded_at: '10 minutes ago',
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for AI Tutor
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Processing / OCR
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Learning Materials</h1>
          <p className="text-xs text-slate-400">PDFs, notes, and documents grounded for Project: {projectId || 'default'}</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center bg-slate-900/30 transition-all cursor-pointer group">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Click or drag & drop learning materials here</p>
            <p className="text-xs text-slate-400 mt-1">PDF format supported (OCR, structured chunking, vector embedding)</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            Select PDF Document
          </button>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Project Documents</h2>
        <div className="space-y-3">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{mat.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{mat.file_name}</span>
                    <span>•</span>
                    <span>{mat.file_size}</span>
                    <span>•</span>
                    <span>{mat.uploaded_at}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                {getStatusBadge(mat.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
