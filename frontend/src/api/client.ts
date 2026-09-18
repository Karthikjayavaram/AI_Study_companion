const rawBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE_URL = rawBaseUrl
  ? (rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl}/api/v1`)
  : '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export interface QuestionSanitized {
  id: string;
  quiz_id: string;
  concept_id?: string | null;
  question_order: number;
  question_text: string;
  question_type: string;
  options: string[];
  difficulty: string;
}

export interface QuizItem {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  quiz_type: string;
  difficulty: string;
  question_count: number;
  status: string;
  created_at: string;
  questions?: QuestionSanitized[];
}

export interface QuizAttemptStart {
  id: string;
  quiz_id: string;
  quiz_title: string;
  user_id: string;
  started_at: string;
  status: string;
  total_questions: number;
  questions: QuestionSanitized[];
}

export interface QuestionResult {
  question_id: string;
  question_order: number;
  question_text: string;
  options?: string[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
  source_material_id?: string;
  source_material_title?: string;
  source_chunk_id?: string;
  source_chunk_text?: string;
  source_page_number?: number | null;
  source_citation?: string | null;
}

export interface QuizAttemptResult {
  id: string;
  quiz_id: string;
  quiz_title: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  status: string;
  results: QuestionResult[];
}

export interface ConceptItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptMastery {
  id: string;
  concept_id: string;
  project_id: string;
  user_id: string;
  score: number;
  status: string; // improving, stable, requiring_attention
  total_attempts: number;
  correct_attempts: number;
  last_assessed_at?: string | null;
  concept?: ConceptItem | null;
}

export interface GrowthSummary {
  overall_mastery: number;
  total_concepts: number;
  mastered_count: number;
  improving_count: number;
  needs_attention_count: number;
  masteries: ConceptMastery[];
}

export interface NextActionResponse {
  id: string;
  project_id: string;
  user_id: string;
  recommendation_type: 'practice_concept' | 'review_concept' | 'mixed_review' | 'start_learning' | string;
  title: string;
  reason: string;
  target_concept_id?: string | null;
  priority: number;
  action_type: string;
  action_url: string;
  created_at?: string | null;
}

export interface ActivityEventItem {
  id: string;
  user_id: string;
  project_id?: string | null;
  event_type: string;
  details?: Record<string, any> | null;
  created_at: string;
}

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('study_companion_token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('study_companion_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('study_companion_token');
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    let data: any = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.detail ||
        (response.status === 502 || response.status === 503 || response.status === 504
          ? 'Backend server connection refused. Please ensure the backend server is running on port 8000.'
          : `Server error (${response.status})`);
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err.message === 'Failed to fetch'
        ? 'Cannot connect to backend server. Please verify backend is running on http://localhost:8000'
        : err.message || 'Network request failed',
      0
    );
  }
}

const isValidId = (id?: string | null): boolean => {
  return Boolean(id && id !== 'undefined' && id !== 'null');
};

// API methods
export const api = {
  // Auth
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),

  // Spaces
  getSpaces: () => apiRequest('/spaces'),
  createSpace: (body: any) => apiRequest('/spaces', { method: 'POST', body: JSON.stringify(body) }),
  getSpace: (id: string) => isValidId(id) ? apiRequest(`/spaces/${id}`) : Promise.resolve({ success: false, data: null }),
  updateSpace: (id: string, body: any) => apiRequest(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSpace: (id: string) => apiRequest(`/spaces/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: (spaceId?: string) => apiRequest(`/projects${isValidId(spaceId) ? `?space_id=${spaceId}` : ''}`),
  createProject: (body: any) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id: string) => isValidId(id) ? apiRequest(`/projects/${id}`) : Promise.resolve({ success: false, data: null }),
  updateProject: (id: string, body: any) => apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id: string) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),

  // Materials & Retrieval
  getMaterials: (projectId: string) =>
    isValidId(projectId) ? apiRequest(`/materials?project_id=${projectId}`) : Promise.resolve({ success: true, data: [] }),
  getMaterial: (id: string) => apiRequest(`/materials/${id}`),
  createTextMaterial: (projectId: string, body: any) =>
    apiRequest(`/materials/text?project_id=${projectId}`, { method: 'POST', body: JSON.stringify(body) }),
  uploadMaterial: (formData: FormData) => apiRequest('/materials/upload', { method: 'POST', body: formData }),
  deleteMaterial: (id: string) => apiRequest(`/materials/${id}`, { method: 'DELETE' }),
  searchRetrieval: (projectId: string, body: any) =>
    apiRequest(`/projects/${projectId}/retrieval/search`, { method: 'POST', body: JSON.stringify(body) }),

  // Tutor
  getConversations: (projectId: string) =>
    isValidId(projectId) ? apiRequest(`/tutor/conversations?project_id=${projectId}`) : Promise.resolve({ success: true, data: [] }),
  createConversation: (projectId: string, body?: any) =>
    apiRequest(`/tutor/conversations?project_id=${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
  getConversation: (conversationId: string) => apiRequest(`/tutor/conversations/${conversationId}`),
  sendTutorMessage: (conversationId: string, content: string) =>
    apiRequest(`/tutor/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  queryTutor: (body: any) => apiRequest('/tutor/query', { method: 'POST', body: JSON.stringify(body) }),

  // Quiz
  getQuizzes: (projectId: string) =>
    isValidId(projectId) ? apiRequest<QuizItem[]>(`/quiz?project_id=${projectId}`) : Promise.resolve({ success: true, data: [] as QuizItem[] }),
  generateQuiz: (projectId: string, body?: { title?: string; difficulty?: string; question_count?: number; material_ids?: string[] }) =>
    apiRequest<QuizItem>(`/projects/${projectId}/quizzes/generate`, { method: 'POST', body: JSON.stringify(body || {}) }),
  getQuiz: (quizId: string) => apiRequest<QuizItem>(`/quizzes/${quizId}`),
  startQuizAttempt: (quizId: string) => apiRequest<QuizAttemptStart>(`/quizzes/${quizId}/attempts`, { method: 'POST' }),
  submitQuizAttempt: (attemptId: string, answers: { question_id: string; user_answer: string }[]) =>
    apiRequest<QuizAttemptResult>(`/quiz-attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  getQuizAttemptResult: (attemptId: string) => apiRequest<QuizAttemptResult>(`/quiz-attempts/${attemptId}`),
  submitQuiz: (body: any) => apiRequest('/quiz/submit', { method: 'POST', body: JSON.stringify(body) }),

  // Growth & Mastery
  getMastery: (projectId: string) =>
    isValidId(projectId) ? apiRequest<ConceptMastery[]>(`/growth/mastery?project_id=${projectId}`) : Promise.resolve({ success: true, data: [] as ConceptMastery[] }),
  getGrowthSummary: (projectId: string) =>
    isValidId(projectId) ? apiRequest<GrowthSummary>(`/growth/summary?project_id=${projectId}`) : Promise.resolve({ success: true, data: null as any }),
  getProjectConcepts: (projectId: string) =>
    isValidId(projectId) ? apiRequest<ConceptItem[]>(`/growth/concepts?project_id=${projectId}`) : Promise.resolve({ success: true, data: [] as ConceptItem[] }),
  getRecommendations: (projectId: string) =>
    isValidId(projectId) ? apiRequest(`/growth/recommendations?project_id=${projectId}`) : Promise.resolve({ success: true, data: [] }),
  getNextRecommendation: (projectId: string) =>
    isValidId(projectId) ? apiRequest<NextActionResponse>(`/projects/${projectId}/recommendations/next`) : Promise.resolve({ success: true, data: null as any }),

  // Analytics
  getActivity: (projectId?: string) =>
    apiRequest(`/analytics/activity${isValidId(projectId) ? `?project_id=${projectId}` : ''}`),
  getProjectActivity: (projectId: string, limit: number = 20) =>
    isValidId(projectId) ? apiRequest<ActivityEventItem[]>(`/projects/${projectId}/activity?limit=${limit}`) : Promise.resolve({ success: true, data: [] as ActivityEventItem[] }),

  // Admin
  getAdminMetrics: () => apiRequest('/admin/metrics'),
  getAdminAiUsage: () => apiRequest('/admin/ai-usage'),
};

