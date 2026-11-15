import type { ReactNode } from 'react'

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs font-medium underline">
          Dismiss
        </button>
      )}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_-20px_rgba(30,41,59,0.28)] ${className}`}>{children}</section>
}

export function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${className}`}>{children}</span>
}
