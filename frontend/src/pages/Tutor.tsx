import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  AlertCircle,
  Loader2,
  Sparkles,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowLeft,
  Lightbulb,
  HelpCircle,
  BookOpen,
  FolderKanban,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { TopicSelectionRequired } from '../components/common/TopicSelectionRequired';

interface Citation {
  material_id?: string;
  source_title: string;
  chunk_id?: string;
  chunk_index?: number;
  page_number?: number;
  snippet: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const STARTER_PROMPTS = [
  { label: 'Explain simply', query: 'Explain the core concepts from my study materials in simple, beginner-friendly terms.' },
  { label: 'Key takeaways', query: 'What are the most important formulas, definitions, and takeaways in this project?' },
  { label: 'Practical examples', query: 'Can you provide real-world practical examples illustrating the concepts in my notes?' },
  { label: 'Test my knowledge', query: 'Ask me a challenging conceptual question based on my materials to test my understanding.' },
];

export const Tutor: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const activeProjectId = routeProjectId || localStorage.getItem('last_active_project_id');

  const [projectName, setProjectName] = useState<string>('Study Topic');
  const [spaceName, setSpaceName] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [materialsCount, setMaterialsCount] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const promptQuery = params.get('prompt');
    if (promptQuery) {
      setInput(promptQuery);
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [location.search]);

  // 1. Fetch Project, Space, Materials & Conversations on mount
  useEffect(() => {
    if (!activeProjectId) return;

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projRes, matRes, convsRes] = await Promise.all([
          api.getProject(activeProjectId).catch(() => null),
          api.getMaterials(activeProjectId).catch(() => ({ data: [] })),
          api.getConversations(activeProjectId).catch(() => ({ data: [] })),
        ]);

        if (projRes?.data) {
          setProjectName(projRes.data.name);
          setSpaceId(projRes.data.space_id);
          localStorage.setItem('last_active_project_id', activeProjectId);
          localStorage.setItem('last_active_project_name', projRes.data.name);

          if (projRes.data.space_id) {
            const spaceRes = await api.getSpace(projRes.data.space_id).catch(() => null);
            if (spaceRes?.data) setSpaceName(spaceRes.data.name);
          }
        }

        const fetchedMaterials = matRes.data || [];
        setMaterialsCount(fetchedMaterials.length);

        const fetchedConvs: Conversation[] = convsRes.data || [];
        setConversations(fetchedConvs);

        if (fetchedConvs.length > 0) {
          const firstId = fetchedConvs[0].id;
          setActiveConversationId(firstId);
          await loadMessagesForConversation(firstId);
        } else {
          setMessages([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load AI Tutor workspace.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [activeProjectId]);

  // Load messages for a specific conversation ID
  const loadMessagesForConversation = async (convId: string) => {
    try {
      const res = await api.getConversation(convId);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      } else {
        setMessages([]);
      }
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation history.');
    }
  };

  // Create a fresh conversation session
  const handleStartNewConversation = async () => {
    if (!activeProjectId || submitting) return;
    setError(null);
    try {
      const res = await api.createConversation(activeProjectId, { title: 'New Study Session' });
      const newConv = res.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to start new conversation.');
    }
  };

  // Handle sending a user message
  const handleSendQuery = async (customText?: string) => {
    const question = (customText !== undefined ? customText : input).trim();
    if (!question || !activeProjectId || submitting) return;

    setInput('');
    setError(null);
    setSubmitting(true);

    let currentConvId = activeConversationId;

    // Optimistically add user message to UI
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      let responseData: any;
      if (currentConvId) {
        const res = await api.sendTutorMessage(currentConvId, question);
        responseData = res.data;
      } else {
        const res = await api.queryTutor({
          project_id: activeProjectId,
          question,
        });
        responseData = res.data;
        if (responseData.conversation_id) {
          currentConvId = responseData.conversation_id;
          setActiveConversationId(currentConvId);
          const convsRes = await api.getConversations(activeProjectId);
          setConversations(convsRes.data || []);
        }
      }

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        content: responseData.message,
        citations: responseData.citations || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setError(err.message || 'The AI Tutor could not answer at this moment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const cleanDocTitle = (title: string) => {
    return title
      .replace(/\.(pdf|txt|docx|pptx)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
  };

  if (!activeProjectId) {
    return <TopicSelectionRequired featureName="AI Tutor" description="Select a learning topic from My Learning to use the AI Tutor." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-5xl mx-auto space-y-3">
      {/* Context Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/spaces" className="hover:text-white transition-colors">My Learning</Link>
        <span>/</span>
        {spaceId && (
          <>
            <Link to={`/spaces/${spaceId}`} className="hover:text-white transition-colors flex items-center gap-1">
              <FolderKanban className="w-3 h-3 text-indigo-400" />
              <span>{spaceName || 'Space'}</span>
            </Link>
            <span>/</span>
          </>
        )}
        <Link to={`/projects/${activeProjectId}`} className="hover:text-white transition-colors">
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-white font-semibold">AI Tutor</span>
      </div>

      {/* Top Header */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${activeProjectId}`}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Topic Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white">AI Study Tutor</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Grounded in Materials
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {projectName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversations.length > 0 && (
            <select
              value={activeConversationId || ''}
              onChange={async (e) => {
                const id = e.target.value;
                setActiveConversationId(id);
                await loadMessagesForConversation(id);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleStartNewConversation}
            disabled={submitting}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs text-white font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>

          <Link
            to={`/projects/${activeProjectId}/quiz`}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/25"
            title="Generate & Take Practice Quiz"
            id="tutor-take-quiz-header-btn"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Take Quiz</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Loading study session...</span>
          </div>
        ) : materialsCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-lg font-bold text-white">Let's give your AI Tutor something to learn from first.</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your study material so I can explain concepts and answer questions based on what you're learning.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to={`/projects/${activeProjectId}/materials`}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                <FileText className="w-4 h-4" />
                <span>Add Study Material</span>
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                <span>Go to My Learning</span>
              </Link>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Bot className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-base font-bold text-white">Ask anything about your study material</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your AI Tutor answers using semantic retrieval from your uploaded notes and documents, citing sources with each explanation.
              </p>
            </div>

            {/* Suggested Starter Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg pt-2">
              {STARTER_PROMPTS.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSendQuery(starter.query)}
                  className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/40 text-left transition-all group"
                >
                  <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {starter.label}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {starter.query}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'ml-auto justify-end' : ''}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-md shadow-indigo-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="space-y-2.5 max-w-full">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
                  }`}
                >
                  {m.sender === 'user' ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                </div>

                {/* Grounded Citations Component */}
                {m.citations && m.citations.length > 0 && (
                  <CitationBox citations={m.citations} cleanTitleFn={cleanDocTitle} />
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Submitting Thinking Indicator */}
        {submitting && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-center gap-2 rounded-tl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Searching study materials and formulating grounded explanation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }} className="p-2 bg-slate-900 border border-slate-800 rounded-2xl flex items-end gap-2 shadow-lg">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          placeholder="Ask a question about your study materials... (Press Enter to send)"
          className="flex-1 px-3 py-2 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[38px] leading-relaxed"
        />
        <button
          type="submit"
          disabled={submitting || !input.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shadow-sm shrink-0"
          title="Send question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

// Clean Collapsible Citation Cards
const CitationBox: React.FC<{ citations: Citation[]; cleanTitleFn: (s: string) => string }> = ({ citations, cleanTitleFn }) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedSnippet, setExpandedSnippet] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-slate-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-indigo-300 font-semibold">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Supporting Material ({citations.length} {citations.length === 1 ? 'source' : 'sources'})</span>
        </div>
        <div className="text-slate-400">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-slate-800/60 space-y-2 bg-slate-950/40">
          {citations.map((c, idx) => {
            const isSnippetOpen = expandedSnippet === idx;
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
                    <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{cleanTitleFn(c.source_title)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {c.page_number ? `Page ${c.page_number}` : 'Reference'}
                    </span>
                    {c.snippet && (
                      <button
                        type="button"
                        onClick={() => setExpandedSnippet(isSnippetOpen ? null : idx)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        {isSnippetOpen ? 'Hide' : 'Excerpt'}
                      </button>
                    )}
                  </div>
                </div>

                {isSnippetOpen && c.snippet && (
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 italic leading-relaxed font-mono">
                    "{c.snippet}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
