/**
 * Student flow (D3): start or resume a session, then one Workspace per question.
 * The server is the source of truth; localStorage only remembers the session id and drafts.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiClientError, errorMessage } from '../api/client'
import { SessionGate } from '../components/SessionGate'
import { btn } from '../components/styles'
import { Card, ErrorBanner } from '../components/ui'
import { clearSnapshot, loadSnapshot, saveSnapshot, type StudentSnapshot } from '../student/storage'
import { Workspace } from '../student/Workspace'
import type { NextReason, NextResponse, PublicQuestion, SessionState } from '../types/contracts'

interface ActiveSession {
  id: string
  alias: string
  question: PublicQuestion
  state: SessionState
  questionNumber: number
  arrivalReason: NextReason | null
}

type Boot =
  | { kind: 'loading' }
  | { kind: 'gate'; error: string | null }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: ActiveSession }

export function StudentPage() {
  const [boot, setBoot] = useState<Boot>(() => (loadSnapshot() ? { kind: 'loading' } : { kind: 'gate', error: null }))
  const [starting, setStarting] = useState(false)

  /** Reload the saved session from the server (after a refresh, or when our view is stale). */
  const resumeFrom = useCallback(async (snap: StudentSnapshot) => {
    try {
      const s = await api.getSession(snap.sessionId)
      const moved = s.question.id !== snap.questionId // advanced elsewhere (other tab, lost response)
      const questionNumber = moved ? snap.questionNumber + 1 : snap.questionNumber
      const arrivalReason = moved ? null : snap.arrivalReason
      saveSnapshot({ ...snap, questionId: s.question.id, questionNumber, arrivalReason, draft: moved ? null : snap.draft })
      setBoot({
        kind: 'ready',
        session: { id: s.session_id, alias: snap.alias, question: s.question, state: s.state, questionNumber, arrivalReason },
      })
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'SESSION_NOT_FOUND') {
        clearSnapshot()
        setBoot({ kind: 'gate', error: 'Your previous session was not found (the demo database may have been reset). Start a new one.' })
      } else {
        setBoot({ kind: 'error', message: errorMessage(err) })
      }
    }
  }, [])

  useEffect(() => {
    const snap = loadSnapshot()
    // Fetch-on-mount: resumeFrom only sets state after its awaited request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    if (snap) void resumeFrom(snap)
  }, [resumeFrom])

  const resume = useCallback(() => {
    const snap = loadSnapshot()
    if (!snap) {
      setBoot({ kind: 'gate', error: null })
      return
    }
    setBoot({ kind: 'loading' })
    void resumeFrom(snap)
  }, [resumeFrom])

  async function start(alias: string) {
    setStarting(true)
    try {
      const s = await api.startSession(alias)
      saveSnapshot({ sessionId: s.session_id, alias, questionId: s.question.id, questionNumber: 1, arrivalReason: null, draft: null })
      setBoot({
        kind: 'ready',
        session: { id: s.session_id, alias, question: s.question, state: s.state, questionNumber: 1, arrivalReason: null },
      })
    } catch (err) {
      setBoot({ kind: 'gate', error: errorMessage(err) })
    } finally {
      setStarting(false)
    }
  }

  function startOver() {
    if (!window.confirm('Start a new session? Your current session stays saved for the teacher view.')) return
    clearSnapshot()
    setBoot({ kind: 'gate', error: null })
  }

  if (boot.kind === 'loading') {
    return <p className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">Loading your session…</p>
  }
  if (boot.kind === 'gate') return <SessionGate onStart={start} busy={starting} error={boot.error} />
  if (boot.kind === 'error') {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-10">
        <ErrorBanner message={boot.message} />
        <div className="flex gap-2">
          <button type="button" onClick={resume} className={btn.primary}>
            Try again
          </button>
          <button type="button" onClick={() => { clearSnapshot(); setBoot({ kind: 'gate', error: null }) }} className={btn.secondary}>
            Start a new session
          </button>
        </div>
      </div>
    )
  }

  const session = boot.session

  if (session.state.stage === 'complete') {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Assessment complete</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks, {session.alias}. Your attempts, explanations and help requests are saved. A teacher reviews the
            provisional scores, especially anything flagged for review.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/teacher?session=${encodeURIComponent(session.id)}`} className={btn.primary}>
              Open teacher view (demo)
            </Link>
            <button type="button" onClick={() => { clearSnapshot(); setBoot({ kind: 'gate', error: null }) }} className={btn.secondary}>
              Start a new session
            </button>
          </div>
        </Card>
      </div>
    )
  }

  function advanced(next: NextResponse) {
    if (boot.kind !== 'ready') return
    const s = boot.session
    const moved = next.question.id !== s.question.id
    const updated: ActiveSession = {
      ...s,
      question: next.question,
      state: next.state,
      questionNumber: moved ? s.questionNumber + 1 : s.questionNumber,
      arrivalReason: moved ? next.reason : s.arrivalReason,
    }
    const snap = loadSnapshot()
    if (snap) {
      saveSnapshot({
        ...snap,
        questionId: updated.question.id,
        questionNumber: updated.questionNumber,
        arrivalReason: updated.arrivalReason,
        draft: moved ? null : snap.draft,
      })
    }
    setBoot({ kind: 'ready', session: updated })
  }

  function stateChanged(state: SessionState) {
    setBoot((b) => (b.kind === 'ready' ? { kind: 'ready', session: { ...b.session, state } } : b))
  }

  return (
    <Workspace
      key={session.question.id}
      sessionId={session.id}
      alias={session.alias}
      question={session.question}
      state={session.state}
      questionNumber={session.questionNumber}
      arrivalReason={session.arrivalReason}
      onAdvanced={advanced}
      onStateChange={stateChanged}
      onResync={resume}
      onStartOver={startOver}
    />
  )
}
