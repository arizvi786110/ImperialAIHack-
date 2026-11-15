/**
 * Typed client for the COGNIT FastAPI backend. Every response is the
 * {ok, data?, error?:{code,message}} envelope; this unwraps it and throws
 * ApiClientError on failure so callers can branch on `code`.
 */
import type {
  ApiResponse,
  AssistRequest,
  AssistResponse,
  AttemptRequest,
  AttemptResponse,
  NextRequest,
  NextResponse,
  SessionStartResponse,
  TeacherReviewRequest,
  TeacherReviewResponse,
  TeacherSessionView,
  ConceptProbe,
} from '../types/contracts'

/**
 * Backend origin. Empty = same origin (in dev, Vite proxies /api to http://localhost:8000).
 * VITE_API_URL is accepted as an alias (used by the integration branch).
 */
export const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '') as string).replace(/\/+$/, '')
const API_LABEL = API_BASE_URL || 'this site (dev proxy to http://localhost:8000)'

export class ApiClientError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiClientError('NETWORK_ERROR', `Can't reach the COGNIT API at ${API_LABEL}. Is the backend running?`, 0)
  }

  let envelope: ApiResponse<T> | null = null
  try {
    envelope = (await res.json()) as ApiResponse<T>
  } catch {
    // fall through: non-JSON response
  }
  if (!envelope) throw new ApiClientError(`HTTP_${res.status}`, `Unexpected response from the API (HTTP ${res.status}).`, res.status)
  if (!res.ok || !envelope.ok || envelope.data === undefined || envelope.data === null) {
    const code = envelope.error?.code ?? `HTTP_${res.status}`
    throw new ApiClientError(code, envelope.error?.message ?? 'Request failed.', res.status)
  }
  return envelope.data
}

const enc = encodeURIComponent

export const api = {
  startSession: (student_alias: string) => request<SessionStartResponse>('POST', '/api/session/start', { student_alias }),
  /** Reload saved progress after a refresh. Same shape as startSession. */
  getSession: (sessionId: string) => request<SessionStartResponse>('GET', `/api/session/${enc(sessionId)}`),
  /** One idempotency key per Submit click: a retry/double click won't grade twice. */
  submitAttempt: (req: AttemptRequest, idempotencyKey: string) =>
    request<AttemptResponse>('POST', '/api/attempt', req, { 'Idempotency-Key': idempotencyKey }),
  assist: (req: AssistRequest) => request<AssistResponse>('POST', '/api/assist', req),
  startConceptProbe: (req: { session_id: string; attempt_id: string }) =>
    request<ConceptProbe>('POST', '/api/probe/start', req),
  answerConceptProbe: (req: { session_id: string; attempt_id: string; answer: string }) =>
    request<ConceptProbe>('POST', '/api/probe/answer', req),
  next: (req: NextRequest) => request<NextResponse>('POST', '/api/next', req),
  getTeacherSession: (sessionId: string) => request<TeacherSessionView>('GET', `/api/teacher/session/${enc(sessionId)}`),
  submitReview: (req: TeacherReviewRequest) => request<TeacherReviewResponse>('POST', '/api/teacher/review', req),
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message
  return err instanceof Error ? err.message : String(err)
}
