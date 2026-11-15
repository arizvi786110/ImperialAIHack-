import type { ClientTestResult, ExampleTest } from '../types/contracts'

export interface RunResult {
  stdout: string
  /** One entry per example test, in order, ids "example-1", "example-2", ... (RUNNER_CONTRACT.md). */
  results: ClientTestResult[]
  /** Readable error for the whole run (syntax error, blocked import, missing function, crash). */
  error?: string
  /** Full student-frame tracebacks for tests that raised, keyed by result id. UI only. */
  traces: Record<string, string>
  timedOut: boolean
  /** Shown to the student when the runner itself is unavailable. */
  notice?: string
}

export type RunStatus = 'loading' | 'running'

export interface RunOptions {
  /** 'loading' while Python is still downloading, then 'running'. */
  onStatus?: (status: RunStatus) => void
}

/**
 * Executes student code against public example tests.
 * Implemented by a Pyodide Web Worker (terminate-on-timeout, fresh worker per run).
 * PROTOTYPE ONLY: not a secure assessment sandbox; results are untrusted evidence.
 */
export interface Runner {
  run(code: string, functionName: string, tests: ExampleTest[], options?: RunOptions): Promise<RunResult>
  /** Start loading Python in the background so the first Run is fast. */
  warm?(): void
}
