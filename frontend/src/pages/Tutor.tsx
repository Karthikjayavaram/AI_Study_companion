import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, Bookmark, AlertCircle, Loader2, Sparkles, Plus, MessageSquare } from 'lucide-react';
import { api, ApiError } from '../api/client';

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

export const Tutor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [projectName, setProjectName] = useState<string>('Project Tutor');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Project & Conversations on mount
  useEffect(() => {
    if (!projectId) return;

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Project details
        const projRes = await api.getProject(projectId);
        if (projRes.data?.name) {
          setProjectName(projRes.data.name);
        }

        // Fetch Project Conversations
        const convsRes = await api.getConversations(projectId);
        const fetchedConvs: Conversation[] = convsRes.data || [];
        setConversations(fetchedConvs);

        if (fetchedConvs.length > 0) {
          const firstId = fetchedConvs[0].id;
          setActiveConversationId(firstId);
          await loadMessagesForConversation(firstId);
        } else {
          // No conversation exists yet
          setMessages([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load AI Tutor workspace.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [projectId]);

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

  // Create a new fresh conversation session
  const handleStartNewConversation = async () => {
    if (!projectId || submitting) return;
    setError(null);
    try {
      const res = await api.createConversation(projectId, { title: 'New Study Session' });
      const newConv = res.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to start new conversation.');
    }
  };

  // Handle sending a user message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !projectId || submitting) return;

    const question = input.trim();
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
        // Send to existing conversation endpoint
        const res = await api.sendTutorMessage(currentConvId, question);
        responseData = res.data;
      } else {
        // Query endpoint creates new conversation implicitly if needed
        const res = await api.queryTutor({
          project_id: projectId,
          question,
        });
        responseData = res.data;
        if (responseData.conversation_id) {
          currentConvId = responseData.conversation_id;
          setActiveConversationId(currentConvId);
          // Refresh conversation list
          const convsRes = await api.getConversations(projectId);
          setConversations(convsRes.data || []);
        }
      }

      // Add assistant response to messages UI
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
      setError(err.message || 'Failed to get answer from AI Tutor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-t-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Grounded AI Tutor</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Grounded in Materials
              </span>
            </div>
            <div className="text-xs text-slate-400">Project: {projectName}</div>
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
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-500/10 border-x border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900/30 border-x border-slate-800 space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Loading AI Tutor workspace...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-200">Start Your Study Session</div>
            <div className="text-xs text-slate-400 max-w-md leading-relaxed">
              Ask any question about your learning materials. The AI Tutor retrieves relevant chunks from your active project to provide grounded, educational explanations.
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'ml-auto justify-end' : ''}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="space-y-2">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>

                {/* Citations & Sources Block */}
                {m.citations && m.citations.length > 0 && (
                  <div className="p-3 bg-slate-900/90 border border-indigo-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Supporting Material Sources & Citations:</span>
                    </div>
                    {m.citations.map((c, cIdx) => (
                      <div key={cIdx} className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="font-medium text-white flex items-center justify-between">
                          <span>Source: {c.source_title}</span>
                          {c.chunk_index !== undefined && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                              Chunk #{c.chunk_index}
                            </span>
                          )}
                        </div>
                        {c.snippet && (
                          <div className="text-slate-400 italic text-[11px] font-mono leading-normal bg-slate-950/40 p-1.5 rounded">
                            "{c.snippet}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-1">
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
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm flex items-center gap-2 rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Thinking & searching study materials...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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
          disabled={submitting || loading}
          placeholder="Ask something about your project's learning materials..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || submitting || loading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
