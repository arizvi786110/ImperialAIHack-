import Editor, { type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  /** Ctrl/Cmd+Enter inside the editor. */
  onRun?: () => void
  /** Ctrl/Cmd+Shift+Enter inside the editor. */
  onSubmit?: () => void
}

/**
 * Monaco (Python). Uses @monaco-editor/react's default CDN loader.
 * Fallback if offline loading fails: bundle via loader.config({ monaco }).
 */
export function CodeEditor({ value, onChange, onRun, onSubmit }: CodeEditorProps) {
  // Keep latest callback without re-registering the Monaco command.
  const runRef = useRef(onRun)
  const submitRef = useRef(onSubmit)
  useEffect(() => {
    runRef.current = onRun
    submitRef.current = onSubmit
  }, [onRun, onSubmit])

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => submitRef.current?.())
  }

  return (
    <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Editor
        height="100%"
        defaultLanguage="python"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        theme="vs"
        loading={<div className="p-4 text-sm text-slate-500">Loading editor…</div>}
        options={{
          fontSize: 14,
          lineHeight: 23,
          renderLineHighlight: 'line',
          padding: { top: 16, bottom: 12 },
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          wordWrap: 'on',
          ariaLabel: 'Python code editor. Press Control or Command plus Enter to run, add Shift to submit.',
          accessibilitySupport: 'auto',
        }}
      />
    </div>
  )
}
