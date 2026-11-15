import type { Runner } from './types'

/** Placeholder until the Pyodide worker lands (D2). Executes nothing. */
export const stubRunner: Runner = {
  async run(_code, functionName, tests) {
    await new Promise((r) => setTimeout(r, 300))
    return {
      stdout: '',
      results: tests.map((_, i) => ({
        id: `example-${i + 1}`,
        pass: false,
        actual: null,
        error: 'not run',
      })),
      timedOut: false,
      notice: `Python runner not connected yet (D2). Would call ${functionName}() on ${tests.length} example tests.`,
    }
  },
}

/** Extracts the function name from a signature like "def foo(x: int) -> int:". */
export function functionNameFrom(signature: string): string {
  return /def\s+([A-Za-z_]\w*)\s*\(/.exec(signature)?.[1] ?? 'solution'
}
