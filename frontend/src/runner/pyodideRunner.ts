import type { Runner, RunResult } from './types'

// A new worker is created for each execution so that a hung Python loop can be
// terminated safely. Loading Pyodide can be slow on first use, so loading and
// execution use separate deadlines.
const LOAD_TIMEOUT_MS = 45000
const EXECUTION_TIMEOUT_MS = 8000

export const pyodideRunner: Runner = {
  async run(code, functionName, tests): Promise<RunResult> {
    const worker = new Worker(new URL('./python.worker.js', import.meta.url), {type: 'classic'})
    const fail = (reason: string) => tests.map((_, index) => ({
      id: 'example-' + (index + 1), pass: false, actual: null, error: reason
    }))
    return await new Promise<RunResult>((resolve) => {
      let finished = false
      let timer: ReturnType<typeof setTimeout>
      const timeout = (reason: string) => done({
        stdout: '', results: fail(reason), timedOut: true, error: reason
      })
      function done(result: RunResult) {
        if (finished) return
        finished = true
        clearTimeout(timer)
        worker.terminate()
        resolve(result)
      }
      timer = setTimeout(() => timeout('Python engine failed to load within 45 seconds'), LOAD_TIMEOUT_MS)
      worker.onerror = e => done({
        stdout: '', results: fail(e.message), timedOut: false, error: e.message
      })
      worker.onmessage = e => {
        const message = e.data as {
          type: string, stdout?: string, results?: RunResult['results'], error?: string
        }
        if (message.type === 'ready') {
          clearTimeout(timer)
          timer = setTimeout(() => timeout('Python execution exceeded 8 seconds'), EXECUTION_TIMEOUT_MS)
        }
        if (message.type === 'result') done({
          stdout: message.stdout ?? '',
          results: message.results ?? fail('No results returned'),
          timedOut: false
        })
        if (message.type === 'error') done({
          stdout: '', results: fail(message.error ?? 'Runner error'),
          timedOut: false, error: message.error
        })
      }
      worker.postMessage({code, functionName, tests})
    })
  },
}
