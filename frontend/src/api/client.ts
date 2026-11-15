import type { ApiResponse, AssistResponse, AttemptRequest, AttemptResponse, SessionStartResponse, TeacherSessionView, TeacherReviewResponse, PublicQuestion } from '../types/contracts'

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data: ApiResponse<T> = await response.json().catch(() => {
    throw new Error('Backend did not return JSON. Check the API server.')
  })
  if (!response.ok || !data.ok || !data.data) throw new Error(data.error?.message ?? 'API request failed (' + response.status + ')')
  return data.data
}
export const startSession = (student_alias: string) => api<SessionStartResponse>('/api/session/start', {student_alias})
export const restoreSession = (id: string) => api<SessionStartResponse>('/api/session/' + encodeURIComponent(id))
export const submitAttempt = (body: AttemptRequest) => api<AttemptResponse>('/api/attempt', body)
export const requestHelp = (body: {session_id:string,question_id:string,mode:'lookup'|'hint'|'plan',query:string,current_attempt_id?:string}) => api<AssistResponse>('/api/assist',body)
export const nextQuestion = (session_id:string,previous_attempt_id:string) => api<{question:PublicQuestion,reason:string,state:SessionStartResponse['state']}>('/api/next',{session_id,previous_attempt_id})
export const getTeacher = (id:string) => api<TeacherSessionView>('/api/teacher/session/' + encodeURIComponent(id))
export const reviewAttempt = (attempt_id:string,override_concept_score:number,reviewer_note:string) => api<TeacherReviewResponse>('/api/teacher/review',{attempt_id,override_concept_score,reviewer_note,approved:true})
