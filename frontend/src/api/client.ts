const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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

export const getAuthToken = (): string | null => {
  return localStorage.getItem('study_companion_token');
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

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data?.message || data?.detail || 'An unexpected API error occurred',
        response.status,
        data
      );
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network request failed', 0);
  }
}

// API methods
export const api = {
  // Auth
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),

  // Spaces
  getSpaces: () => apiRequest('/spaces'),
  createSpace: (body: any) => apiRequest('/spaces', { method: 'POST', body: JSON.stringify(body) }),
  getSpace: (id: string) => apiRequest(`/spaces/${id}`),

  // Projects
  getProjects: (spaceId?: string) => apiRequest(`/projects${spaceId ? `?space_id=${spaceId}` : ''}`),
  createProject: (body: any) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id: string) => apiRequest(`/projects/${id}`),

  // Materials
  getMaterials: (projectId: string) => apiRequest(`/materials?project_id=${projectId}`),
  uploadMaterial: (formData: FormData) => apiRequest('/materials/upload', { method: 'POST', body: formData }),

  // Tutor
  getConversations: (projectId: string) => apiRequest(`/tutor/conversations?project_id=${projectId}`),
  queryTutor: (body: any) => apiRequest('/tutor/query', { method: 'POST', body: JSON.stringify(body) }),

  // Quiz
  getQuizzes: (projectId: string) => apiRequest(`/quiz?project_id=${projectId}`),
  generateQuiz: (projectId: string) => apiRequest(`/quiz/generate?project_id=${projectId}`, { method: 'POST' }),
  submitQuiz: (body: any) => apiRequest('/quiz/submit', { method: 'POST', body: JSON.stringify(body) }),

  // Growth & Mastery
  getMastery: (projectId: string) => apiRequest(`/growth/mastery?project_id=${projectId}`),
  getRecommendations: (projectId: string) => apiRequest(`/growth/recommendations?project_id=${projectId}`),

  // Analytics
  getActivity: (projectId?: string) => apiRequest(`/analytics/activity${projectId ? `?project_id=${projectId}` : ''}`),

  // Admin
  getAdminMetrics: () => apiRequest('/admin/metrics'),
  getAdminAiUsage: () => apiRequest('/admin/ai-usage'),
};
