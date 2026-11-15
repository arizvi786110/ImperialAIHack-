import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface TabDef {
  id: string
  label: string
  disabled?: boolean
  disabledReason?: string
}
interface TabsProps {
  tabs: TabDef[]
  active: string
  onChange: (id: string) => void
  children: ReactNode
  label: string
}

export function Tabs({ tabs, active, onChange, children, label }: TabsProps) {
  const baseId = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const enabled = tabs.filter((t) => !t.disabled)
  function onKeyDown(e: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const idx = enabled.findIndex((t) => t.id === active)
    let next = idx
    if (e.key === 'ArrowRight') next = (idx + 1) % enabled.length
    if (e.key === 'ArrowLeft') next = (idx - 1 + enabled.length) % enabled.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = enabled.length - 1
    if (!enabled[next]) return
    onChange(enabled[next].id)
    refs.current[enabled[next].id]?.focus()
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label={label} className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1.5" onKeyDown={onKeyDown}>
        {tabs.map((t) => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              aria-disabled={t.disabled || undefined}
              tabIndex={selected ? 0 : -1}
              title={t.disabled ? t.disabledReason : undefined}
              onClick={() => !t.disabled && onChange(t.id)}
              className={[
                'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                selected
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/60'
                  : t.disabled
                    ? 'cursor-not-allowed text-slate-400'
                    : 'text-slate-500 hover:text-slate-900',
              ].join(' ')}
            >
              {t.label}{t.disabled && <span className="ml-1 text-xs">🔒</span>}
              {t.disabled && <span className="sr-only"> (locked: {t.disabledReason})</span>}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active}`} className="flex min-h-0 flex-1 flex-col pt-4">
        {children}
      </div>
    </div>
  )
}
