/** Messages between pyodideRunner (main thread) and pyodide.worker. */
import type { ClientTestResult, ExampleTest } from '../types/contracts'

export interface WorkerRequest {
  type: 'run'
  code: string
  functionName: string
  tests: ExampleTest[]
}

export type WorkerEvent =
  | { type: 'ready' }
  | { type: 'load-error'; message: string }
  /** A timed step is starting: -1 = top-level code, >= 0 = example test index. */
  | { type: 'step'; index: number }
  | { type: 'setup'; stdout: string }
  | { type: 'test'; index: number; result: ClientTestResult; stdout: string; trace: string | null }
  /** Whole submission failed before/while loading (syntax error, blocked import, missing function...). */
  | { type: 'fatal'; error: string; trace: string | null; stdout: string }
  | { type: 'done' }
