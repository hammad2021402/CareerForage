const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';


export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface CareerPath {
  id: string;
  name: string;
  description: string;
  average_salary: number;
  projected_growth: number;
  match_score: number;
}

type PrimitiveBody = BodyInit | null | undefined;

interface ApiRequestConfig extends Omit<RequestInit, 'body' | 'headers'> {
  token?: string;
  body?: PrimitiveBody | Record<string, unknown> | unknown;
  headers?: HeadersInit;
}

async function request<T>(path: string, config: ApiRequestConfig = {}): Promise<T> {
  const { token, headers, body, method, ...rest } = config;
  const finalHeaders = new Headers(headers ?? {});
  const httpMethod = method ?? (body ? 'POST' : 'GET');
  const isJsonBody = body && !(body instanceof FormData) && typeof body !== 'string';

  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (isJsonBody) {
    finalHeaders.set('Content-Type', 'application/json');
  } else if (typeof body === 'string' && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  const payload = isJsonBody ? JSON.stringify(body) : (body as PrimitiveBody);

  let response = await fetch(`${API_BASE_URL}${path}`, {
    method: httpMethod,
    headers: finalHeaders,
    body: httpMethod === 'GET' || httpMethod === 'HEAD' ? undefined : (payload ?? undefined),
    ...rest,
  });

  if (response.status === 401 && path !== '/auth/refresh') {
    const storedRefreshToken = localStorage.getItem('nexuslearn_refresh_token');
    if (storedRefreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json() as { access_token: string; refresh_token?: string };
          if (refreshData.access_token) {
            localStorage.setItem('nexuslearn_access_token', refreshData.access_token);
            if (refreshData.refresh_token) {
              localStorage.setItem('nexuslearn_refresh_token', refreshData.refresh_token);
            }
            window.dispatchEvent(new Event('auth_token_refreshed'));
            
            // Retry the request
            finalHeaders.set('Authorization', `Bearer ${refreshData.access_token}`);
            response = await fetch(`${API_BASE_URL}${path}`, {
              method: httpMethod,
              headers: finalHeaders,
              body: httpMethod === 'GET' || httpMethod === 'HEAD' ? undefined : (payload ?? undefined),
              ...rest,
            });
          }
        }
      } catch (refreshErr) {
        console.error('Auto token refresh failed:', refreshErr);
      }
    }
    
    if (response.status === 401) {
      localStorage.removeItem('nexuslearn_access_token');
      localStorage.removeItem('nexuslearn_refresh_token');
      window.dispatchEvent(new Event('auth_session_expired'));
      throw new ApiError('Session expired. Please sign in again.', 401);
    }
  }

  const rawText = await response.text();
  const isJson = rawText && response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? JSON.parse(rawText) : rawText ? rawText : null;

  if (!response.ok) {
    let errorMessage = response.statusText || 'Unexpected API error';

    if (isJson && data) {
      const parsedData = data as any;

      if (parsedData.message) {
        errorMessage = parsedData.message;
      } else if (parsedData.detail) {
        errorMessage = Array.isArray(parsedData.detail)
          ? parsedData.detail[0].msg
          : parsedData.detail;
      }
    }

    const isJwtError = 
      errorMessage.toLowerCase().includes('jwt') || 
      errorMessage.toLowerCase().includes('expired') || 
      errorMessage.toLowerCase().includes('credential') || 
      response.status === 401;

    if (isJwtError) {
      errorMessage = 'Session expired. Please sign in again.';
    }

    if (response.status >= 500) {
      errorMessage = 'A server error occurred. Please try again later.';
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  full_name: string;
  goals?: string[];
  learning_style?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  xp?: number;
  level?: number;
  preferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AssessmentAnswerPayload {
  question_id: number;
  prompt: string;
  type: string;
  response: string | string[];
}

export interface AssessmentSubmissionPayload {
  answers: AssessmentAnswerPayload[];
  submitted_at: string;
}

export interface CodeExecutionTestPayload {
  id: string;
  description?: string;
  input?: string;
  expected_output?: string;
}

export interface CodeExecutionRequest {
  language: string;
  code: string;
  stdin?: string;
  test_cases?: CodeExecutionTestPayload[];
}

export type CodeExecutionStatus = 'passed' | 'failed' | 'error';

export type CodeExecutionResult = {
  status: 'passed' | 'failed';
  stdout: string | null;   // mapped from actual_output
  stderr: string | null;   // mapped from error
  time: number | null;
  description?: string;
  expected_output?: string;
};

export type CodeExecutionResponse = {
  results: CodeExecutionResult[];
  summary?: {
    total: number;
    passed: number;
    failed: number;
  };
};

export interface ResumeReviewRequest {
  resume: string;
  role?: string;
  experience_level?: string;
  skills?: string[];
  company?: string;
  requirements?: string;
  mode?: 'analyze' | 'rebuild';
  resume_pdf_b64?: string;
}

export interface ResumeReviewFeedbackSection {
  title: string;
  bullets: string[];
}

export interface TailoredResume {
  candidate_name?: string;
  professional_summary: string;
  skills: string[];
  experience_bullets: string[];
  projects: string[];
}

export interface ResumeReviewFeedback {
  summary: string;
  highlights?: string[];
  improvements?: string[];
  ats_score?: number;
  keywords?: string[];
  next_steps?: string[];
  sections?: ResumeReviewFeedbackSection[];
  // New dynamic fields
  score_breakdown?: {
    Keywords: number;
    Skills: number;
    Experience: number;
    Education: number;
    Projects: number;
    Formatting: number;
  };
  matched_keywords?: string[];
  missing_keywords?: string[];
  keyword_match_pct?: number;
  tailored_resume?: TailoredResume | null;
}

export type InterviewSpeaker = 'candidate' | 'coach';

export interface MockInterviewTurn {
  role: InterviewSpeaker;
  message: string;
}

export interface MockInterviewRequest {
  role: string;
  seniority?: string;
  history: MockInterviewTurn[];
  skills?: string[];
  interview_id?: string;
}

export interface MockInterviewScores {
  confidence: number;
  technical: number;
  communication: number;
  clarity: number;
}

export interface MockInterviewReport {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  clarity_score: number;
  topics_covered: string[];
  strong_topics: string[];
  weak_topics: string[];
  question_coverage_pct: number;
  difficulty_reached: string;
  total_attempted: number;
  recommendation: string;
  suggestions: string[];
}

export interface MockInterviewResponse {
  question?: string;
  prompt?: string;
  feedback?: string;
  follow_up?: string;
  tips?: string[];
  strengths?: string[];
  improvements?: string[];
  scores?: MockInterviewScores;
  closing?: string;
  chat_message?: string;
  done?: boolean;
  interview_id?: string;
  report?: MockInterviewReport;
}

export interface JobSearchParams {
  search?: string;
  location?: string;
  remote?: boolean;
  type?: string;
  page?: number;
  skills?: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  remote?: boolean;
  type?: string;
  salary_min: number;
  salary_max: number;
  posted_at?: string;
  match_score: number;
  application_url: string;
  skills?: string[];
  description?: string;
  career_path_id: string;
}

export interface JobSearchResponse {
  jobs: JobListing[];
  total: number;
  next_page?: number | null;
}

export interface GamificationWeekActivity {
  day: string;
  active: boolean;
}

export interface GamificationAchievement {
  id: string;
  title?: string;
  label?: string;
  description?: string;
  type?: string;
  icon?: string;
}

export interface GamificationClaim {
  id: string;
  amount: number;
  source?: string;
  reason?: string;
  status?: string;
  description?: string;
  created_at?: string;
  createdAt?: string;
  expires_at?: string;
  expiresAt?: string;
}

export interface GamificationRawStreak {
  current?: number;
  current_streak?: number;
  longest?: number;
  longest_streak?: number;
  total_days?: number;
  totalDays?: number;
  week?: GamificationWeekActivity[];
  week_activity?: GamificationWeekActivity[];
  recent_activity?: GamificationWeekActivity[];
}

export interface GamificationStatusResponse {
  xp?: number;
  total_xp?: number;
  level?: number;
  current_level?: number;
  next_level_xp?: number;
  nextLevelXp?: number;
  current_level_xp?: number;
  currentLevelXp?: number;
  level_progress?: number;
  levelProgress?: number;
  xp_to_next?: number;
  streak?: GamificationRawStreak;
  current_streak?: number;
  longest_streak?: number;
  total_days?: number;
  week_activity?: GamificationWeekActivity[];
  achievements?: GamificationAchievement[];
  pending_claims?: GamificationClaim[];
  claims?: GamificationClaim[];
}

export interface ClaimXpPayload {
  claim_id: string;
}

export interface ClaimXpResponse {
  status?: string;
  awarded_xp?: number;
  total_xp?: number;
  level?: number;
  message?: string;
}

export interface AwardXpRequest {
  amount: number;
  reason?: string;
}

export interface AwardXpResponse {
  status?: string;
  awarded_xp: number;
  total_xp: number;
  level: number;
  leveled_up?: boolean;
  reason?: string;
  message?: string;
}

export interface GamificationStatus extends Required<Pick<GamificationStatusResponse, 'xp' | 'level'>> {
  next_level_xp?: number;
  current_level_xp?: number;
  level_progress?: number;
  xp_to_next?: number;
  streak?: {
    current: number;
    longest: number;
    total_days: number;
    week: GamificationWeekActivity[];
  };
  achievements?: GamificationAchievement[];
  pending_claims: GamificationClaim[];
}

export interface StoreReward {
  id: string;
  name: string;
  description?: string;
  cost: number;
  category?: string;
  image?: string;
  in_stock?: boolean;
  stock?: number;
  metadata?: Record<string, unknown>;
}

export interface StoreInventoryResponse {
  balance: number;
  rewards: StoreReward[];
}

export interface StoreTransaction {
  id: string;
  reward_id?: string;
  reward_name?: string;
  amount: number;
  status?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface StoreTransactionsResponse {
  transactions: StoreTransaction[];
}

export interface RedeemRewardPayload {
  reward_id: string;
}

export interface RedeemRewardResponse {
  balance: number;
  transaction: StoreTransaction;
  message?: string;
}

export interface RoadmapNodeData {
  label: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | string;
  estimatedHours?: number;
  status?: string;
  description?: string;
  recommendedCareer?: string;
  [key: string]: unknown;
}

export interface RoadmapNode {
  id: string;
  type?: string;
  position: {
    x: number;
    y: number;
  };
  data: RoadmapNodeData;
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface RoadmapGenerationRequest {
  target_role: string;
  current_skills?: string[] | string;
  resume_text?: string;
  resume_pdf_base64?: string;
  max_nodes?: number;
}

export interface RoadmapGenerationResponse {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  meta?: {
    targetRole?: string;
    source?: string;
    model?: string;
    [key: string]: unknown;
  };
}

export interface NodeInterviewTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface NodeInterviewRequest {
  topic: string;
  message: string;
  target_role?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | string;
  conversation_history?: NodeInterviewTurn[];
}

export interface NodeInterviewResponse {
  response: string;
  follow_up_question?: string;
  score: number;
  strengths: string[];
  improvements: string[];
  topic: string;
  strict_mode: boolean;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    }),
  register: (payload: RegisterPayload) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    }),
  me: (token: string) =>
    request<UserProfile>('/auth/me', {
      method: 'GET',
      token,
    }),
  logout: (token: string) =>
    request<void>('/auth/logout', {
      method: 'POST',
      token,
    }),
  refresh: (refreshToken: string) =>
    request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    }),
};

export const assessmentApi = {
  submitInitial: (payload: AssessmentSubmissionPayload, token: string) =>
    request<{ status: string; message?: string }>('/assessments/initial', {
      method: 'POST',
      body: payload,
      token,
    }),
};

export const profileApi = {
  updatePreferences: (payload: Record<string, unknown>, token: string) =>
    request<UserProfile>('/users/preferences', {
      method: 'PUT',
      body: payload,
      token,
    }),
};

export const codeApi = {
  runSnippet: (payload: CodeExecutionRequest, token?: string) =>
    request<CodeExecutionResponse>('/code/execute', {
      method: 'POST',
      body: payload,
      token,
    }),
};

export const careerApi = {
  getCareerPaths: (token: string) =>
    request<CareerPath[]>('/career/paths', {
      method: 'GET',
      token,
    }),
  getJobListings: (token: string) =>
    request<JobListing[]>('/career/jobs', {
      method: 'GET',
      token,
    }),
  reviewResume: (payload: ResumeReviewRequest, token?: string) =>
    request<ResumeReviewFeedback>('/career/resume-review', {
      method: 'POST',
      body: payload,
      token,
    }),
  extractPdf: (pdfBase64: string, fileType = 'pdf', token?: string) =>
    request<{ text: string; length: number }>('/career/extract-pdf', {
      method: 'POST',
      body: { pdf_base64: pdfBase64, file_type: fileType },
      token,
    }),
  continueMockInterview: (payload: MockInterviewRequest, token?: string) =>
    request<MockInterviewResponse>('/career/mock-interview', {
      method: 'POST',
      body: payload,
      token,
    }),
  searchJobs: (params: JobSearchParams, token?: string) => {
    const query = new URLSearchParams();

    if (params.search) {
      query.set('search', params.search);
    }
    if (params.location) {
      query.set('location', params.location);
    }
    if (typeof params.remote === 'boolean') {
      query.set('remote', params.remote ? 'true' : 'false');
    }
    if (params.type) {
      query.set('type', params.type);
    }
    if (params.page) {
      query.set('page', params.page.toString());
    }
    if (params.skills?.length) {
      query.set('skills', params.skills.join(','));
    }

    const suffix = query.toString();
    const path = `/career/jobs${suffix ? `?${suffix}` : ''}`;

    return request<JobSearchResponse>(path, {
      method: 'GET',
      token,
    });
  },
};

export const gamificationApi = {
  getStatus: (token?: string, stats?: { total: number; mastered: number }) => {
    const query = stats ? `?total_topics=${stats.total}&mastered_topics=${stats.mastered}` : '';
    return request<GamificationStatusResponse>(`/gamification/status${query}`, {
      method: 'GET',
      token,
    });
  },
  claimXp: (payload: ClaimXpPayload, token?: string) =>
    request<ClaimXpResponse>('/gamification/claim-xp', {
      method: 'POST',
      body: payload,
      token,
    }),
  awardXp: (payload: AwardXpRequest, token?: string) =>
    request<AwardXpResponse>('/gamification/award-xp', {
      method: 'POST',
      body: payload,
      token,
    }),
  getAchievements: (token?: string) =>
    request<GamificationAchievement[]>('/gamification/achievements', {
      method: 'GET',
      token,
    }),
  getClaims: (token?: string) =>
    request<GamificationClaim[]>('/gamification/claims', {
      method: 'GET',
      token,
    }),
  getStreak: (token?: string) =>
    request<GamificationRawStreak>('/gamification/streak', {
      method: 'GET',
      token,
    }),
};

export const storeApi = {
  getInventory: (token?: string) =>
    request<StoreInventoryResponse>('/store/inventory', {
      method: 'GET',
      token,
    }),
  redeemReward: (payload: RedeemRewardPayload, token?: string) =>
    request<RedeemRewardResponse>('/store/redeem', {
      method: 'POST',
      body: payload,
      token,
    }),
  getTransactions: (token?: string) =>
    request<StoreTransactionsResponse>('/store/transactions', {
      method: 'GET',
      token,
    }),
};

export const aiApi = {
  generateRoadmap: (payload: RoadmapGenerationRequest, token?: string) =>
    request<RoadmapGenerationResponse>('/api/generate-roadmap', {
      method: 'POST',
      body: payload,
      token,
    }),
  nodeInterview: (payload: NodeInterviewRequest, token?: string) =>
    request<NodeInterviewResponse>('/api/node-interview', {
      method: 'POST',
      body: payload,
      token,
    }),
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  lesson_id?: string;
  code_context?: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
}

export const chatApi = {
  send: (payload: ChatRequest, token?: string) =>
    request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: payload,
      token,
    }),
};

/* ── Notes API ──────────────────────────────────────────── */
export interface NotesSummaryRequest {
  title: string;
  content: string;
}

export interface NotesSummaryResponse {
  summary: string;
  key_points: string[];
  topics: string[];
  difficulty: string;
}

export interface NotesQuizRequest {
  title: string;
  content: string;
  num_questions?: number;
}

export interface NotesQuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface NotesQuizResponse {
  questions: NotesQuizQuestion[];
  topic: string;
  difficulty: string;
}

export const notesApi = {
  summary: (payload: NotesSummaryRequest, token?: string) =>
    request<NotesSummaryResponse>('/notes/summary', { method: 'POST', body: payload, token }),
  quiz: (payload: NotesQuizRequest, token?: string) =>
    request<NotesQuizResponse>('/notes/quiz', { method: 'POST', body: payload, token }),
};

export interface CompletedLessonInfo {
  id: string;
  title: string;
}

export const learningApi = {
  getCompletedLessons: (token: string) =>
    request<CompletedLessonInfo[]>('/learning/completed-lessons', {
      method: 'GET',
      token,
    }),
  completeLesson: (lessonId: string, token: string, codeSubmission?: string) =>
    request<{ message: string; xp_earned: number; total_xp: number; level: number; leveled_up: boolean }>(
      `/learning/lessons/${encodeURIComponent(lessonId)}/complete`,
      {
        method: 'POST',
        body: codeSubmission ? { code_submission: codeSubmission } : {},
        token,
      }
    ),
};
