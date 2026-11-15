import type { ClientTestResult, ExampleTest } from '../types/contracts'

export interface RunResult {
  stdout: string
  results: ClientTestResult[]
  /** Readable error (exception trace, syntax error, missing function). */
  error?: string
  timedOut: boolean
  /** Shown to the student when the runner itself is unavailable. */
  notice?: string
}

/**
 * Executes student code against public example tests.
 * D2 implements this with a Pyodide Web Worker (terminate-on-timeout,
 * fresh worker per run). PROTOTYPE ONLY: not a secure assessment sandbox.
 */
export interface Runner {
  run(code: string, functionName: string, tests: ExampleTest[]): Promise<RunResult>
}
