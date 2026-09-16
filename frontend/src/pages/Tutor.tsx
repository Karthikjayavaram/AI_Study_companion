import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, Bookmark, AlertCircle, Sparkles, BookOpen } from 'lucide-react';

interface Citation {
  source_title: string;
  page_number?: number;
  snippet: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  has_sufficient_evidence?: boolean;
}

export const Tutor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'assistant',
      content:
        "Hello! I am your AI Study Companion for **Machine Learning Foundations**. I ground all responses in your uploaded documents and lecture notes. What would you like to explore today?",
    },
    {
      id: 'm2',
      sender: 'user',
      content: 'What is the intuition behind the learning rate in gradient descent?',
    },
    {
      id: 'm3',
      sender: 'assistant',
      content:
        "The learning rate determines the step size taken in the opposite direction of the gradient during optimization.\n\n- If the rate is **too small**, convergence becomes painfully slow and prone to getting trapped in saddle points.\n- If the rate is **too large**, the parameter updates overshoot the local minimum and may diverge entirely.",
      has_sufficient_evidence: true,
      citations: [
        {
          source_title: 'ML_Lecture_Notes_W1_W2.pdf',
          page_number: 14,
          snippet: 'Section 2.3: Hyperparameter tuning for Step Size (alpha) in Cost Minimization.',
        },
      ],
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Mock AI grounded reply
    setTimeout(() => {
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        content: `Here is a grounded explanation based on your active project materials:

In your notes, this mechanism relates directly to minimizing the loss function across training batches. By taking the partial derivative with respect to each weight, the gradient indicates the steepest ascent; subtracting this vector scaled by your learning rate achieves descent.`,
        has_sufficient_evidence: true,
        citations: [
          {
            source_title: 'ML_Lecture_Notes_W1_W2.pdf',
            page_number: 16,
            snippet: 'Gradient vector partial derivatives for multi-variable parameter spaces.',
          },
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 600);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Tutor Context Bar */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Grounded AI Tutor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Grounded in 2 Docs
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Context: {projectId || 'Machine Learning Foundations'}</div>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900/30 border-x border-slate-800 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'ml-auto justify-end' : ''}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className="space-y-2">
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>

              {/* Citations block */}
              {m.citations && m.citations.length > 0 && (
                <div className="p-3 bg-slate-900/80 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Supporting Evidence & Citations:</span>
                  </div>
                  {m.citations.map((c, i) => (
                    <div key={i} className="text-xs text-slate-300 bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <div className="font-semibold text-white">
                        Source: {c.source_title} {c.page_number ? `— Page ${c.page_number}` : ''}
                      </div>
                      <div className="text-slate-400 italic text-[11px] mt-0.5 font-mono">
                        "{c.snippet}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-slate-900 border border-slate-800 rounded-b-2xl flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question grounded in your study material..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
