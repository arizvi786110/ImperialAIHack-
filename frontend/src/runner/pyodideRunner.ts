/**
 * Main-thread side of the Pyodide runner (D2), per backend/RUNNER_CONTRACT.md.
 *
 * - Fresh worker per Run/Submit: a worker runs one submission, then is terminated.
 * - Warm spare: one worker that has loaded Python but never run code is kept ready,
 *   so a fresh worker doesn't mean waiting for Pyodide on every click.
 * - Timeouts start only once Python is loaded: 2 s per step (top-level code or one
 *   test), 5 s for the whole run. On timeout the worker is terminated; finished
 *   test results are kept and the rest are marked TIMEOUT.
 *
 * PROTOTYPE ONLY: this is not a secure exam sandbox and results are untrusted.
 */
import type { ClientTestResult, ExampleTest } from '../types/contracts'
import type { WorkerEvent, WorkerRequest } from './protocol'
import type { RunOptions, RunResult, Runner } from './types'

const STEP_TIMEOUT_MS = 2_000
const RUN_TIMEOUT_MS = 5_000
const LOAD_TIMEOUT_MS = 90_000

let spare: Promise<Worker> | null = null

function spawn(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
    const fail = (message: string) => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error(message))
    }
    const timer = setTimeout(() => fail('Python took too long to load.'), LOAD_TIMEOUT_MS)
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      if (event.data.type === 'ready') {
        clearTimeout(timer)
        worker.onmessage = null
        worker.onerror = null
        resolve(worker)
      } else if (event.data.type === 'load-error') {
        fail(event.data.message)
      }
    }
    worker.onerror = (event) => fail(event.message || 'Python worker failed to start.')
  })
}

function warm(): void {
  if (spare) return
  const pending = spawn()
  spare = pending
  pending.catch(() => {
    if (spare === pending) spare = null // allow a retry on the next Run
  })
}

function takeWorker(): Promise<Worker> {
  const worker = spare ?? spawn()
  spare = null
  return worker
}

/** Result ids are 1-based "example-N" (matched by backend/app/scoring.py). */
export const resultId = (index: number) => `example-${index + 1}`

const resultFor = (index: number, error: string): ClientTestResult => ({
  id: resultId(index),
  pass: false,
  actual: null,
  error,
})

function execute(worker: Worker, code: string, functionName: string, tests: ExampleTest[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const results: (ClientTestResult | undefined)[] = new Array(tests.length)
    const traces: Record<string, string> = {}
    const stdout: string[] = []
    let stepTimer: ReturnType<typeof setTimeout> | undefined
    let settled = false

    const fillRest = (error: string) => tests.map((_, i) => results[i] ?? resultFor(i, error))

    const finish = (result: Omit<RunResult, 'stdout' | 'traces'> & { stdout?: string }) => {
      if (settled) return
      settled = true
      clearTimeout(stepTimer)
      clearTimeout(runTimer)
      worker.onmessage = null
      worker.onerror = null
      resolve({ traces, ...result, stdout: result.stdout ?? stdout.join('') })
    }

    const timeOut = (error: string) => {
      worker.terminate() // stop the runaway Python immediately
      finish({ results: fillRest(error), timedOut: true })
    }

    const armStep = () => {
      clearTimeout(stepTimer)
      stepTimer = setTimeout(() => timeOut(`TIMEOUT: exceeded ${STEP_TIMEOUT_MS / 1000}s`), STEP_TIMEOUT_MS)
    }
    const runTimer = setTimeout(() => timeOut(`TIMEOUT: run exceeded ${RUN_TIMEOUT_MS / 1000}s`), RUN_TIMEOUT_MS)
    armStep()

    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const msg = event.data
      switch (msg.type) {
        case 'step':
          armStep()
          break
        case 'setup':
          if (msg.stdout) stdout.push(msg.stdout)
          break
        case 'test': {
          results[msg.index] = msg.result
          if (msg.trace) traces[msg.result.id] = msg.trace
          if (msg.stdout) stdout.push(`── ${msg.result.id} ──\n${msg.stdout}`)
          break
        }
        case 'fatal':
          finish({
            stdout: [...stdout, msg.stdout].filter(Boolean).join(''),
            results: tests.map((_, i) => resultFor(i, msg.error)),
            error: msg.trace ?? msg.error,
            timedOut: false,
          })
          break
        case 'done':
          finish({ results: fillRest('not run'), timedOut: false })
          break
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      const error = `RUNNER_ERROR: ${event.message || 'Python worker crashed'}`
      finish({ results: fillRest(error), error, timedOut: false })
    }

    const request: WorkerRequest = { type: 'run', code, functionName, tests }
    worker.postMessage(request)
  })
}

export const pyodideRunner: Runner = {
  warm,

  async run(code, functionName, tests, options?: RunOptions) {
    options?.onStatus?.('loading')
    let worker: Worker
    try {
      worker = await takeWorker()
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      return {
        stdout: '',
        results: tests.map((_, i) => resultFor(i, 'RUNNER_UNAVAILABLE')),
        traces: {},
        timedOut: false,
        notice: `Python could not be loaded (${reason}). Check your internet connection and try again.`,
      }
    }

    options?.onStatus?.('running')
    try {
      return await execute(worker, code, functionName, tests)
    } finally {
      worker.terminate() // one submission per worker
      warm() // prepare a clean worker for the next run
    }
  },
}
