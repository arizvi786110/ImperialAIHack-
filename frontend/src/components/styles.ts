/** Shared Tailwind class strings and small formatters (kept out of component files for fast refresh). */
const base =
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50'

export const btn = {
  primary: `${base} bg-indigo-600 text-white hover:bg-indigo-700`,
  dark: `${base} bg-slate-800 text-white hover:bg-slate-700`,
  secondary: `${base} bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50`,
  small: 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50',
}

export const input =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600'

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
