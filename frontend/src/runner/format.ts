/** Extracts the function name from a signature like "def foo(x: int) -> int:". */
export function functionNameFrom(signature: string): string {
  return /def\s+([A-Za-z_]\w*)\s*\(/.exec(signature)?.[1] ?? 'solution'
}

/** Renders a JSON value the way Python would print it (None/True/False, not null/true/false). */
export function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(', ')}]`
  if (typeof value === 'object') {
    return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyRepr(v)}`).join(', ')}}`
  }
  return String(value)
}

/** `input` is a list of positional args (RUNNER_CONTRACT.md): ("f", ["aab"]) -> f("aab"). */
export function callLabel(functionName: string, input: unknown): string {
  const args = Array.isArray(input) ? input : [input]
  return `${functionName}(${args.map(pyRepr).join(', ')})`
}

export function starterCode(signature: string): string {
  return `${signature}\n    # Your code here\n    pass\n`
}
