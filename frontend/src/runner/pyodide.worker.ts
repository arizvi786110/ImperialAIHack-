/**
 * Pyodide Web Worker. Loads Python once, then runs exactly ONE submission;
 * the main thread terminates this worker afterwards (fresh worker per run)
 * and kills it early on timeout. PROTOTYPE ONLY: not a secure exam sandbox.
 */
import harnessSource from './harness.py?raw'
import type { WorkerRequest, WorkerEvent } from './protocol'

const PYODIDE_VERSION = '314.0.8'
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

type RunAll = (code: string, functionName: string, testsJson: string, emit: (json: string) => void) => void

// Avoid pulling the WebWorker lib into the DOM-typed app tsconfig.
const ctx = self as unknown as {
  postMessage(message: WorkerEvent): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

let runAll: RunAll | null = null
let used = false

async function init() {
  try {
    const { loadPyodide } = await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)
    const pyodide = await loadPyodide({ indexURL: INDEX_URL, stdout: () => {}, stderr: () => {} })
    pyodide.setStdin({ error: true }) // input() raises instead of blocking
    pyodide.runPython(harnessSource)
    runAll = pyodide.globals.get('run_all') as RunAll
    ctx.postMessage({ type: 'ready' })
  } catch (err) {
    ctx.postMessage({ type: 'load-error', message: err instanceof Error ? err.message : String(err) })
  }
}

ctx.onmessage = (event) => {
  const msg = event.data
  if (msg.type !== 'run') return
  if (!runAll || used) {
    ctx.postMessage({ type: 'fatal', error: 'RUNNER_ERROR: worker not ready or already used', trace: null, stdout: '' })
    return
  }
  used = true
  try {
    runAll(msg.code, msg.functionName, JSON.stringify(msg.tests), (json) => ctx.postMessage(JSON.parse(json) as WorkerEvent))
  } catch (err) {
    ctx.postMessage({ type: 'fatal', error: `RUNNER_ERROR: ${err instanceof Error ? err.message : String(err)}`, trace: null, stdout: '' })
  }
}

void init()
