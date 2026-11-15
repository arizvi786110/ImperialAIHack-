import Editor, { type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function CodeEditor({ value, onChange, onRun }: CodeEditorProps) {
  const runRef = useRef(onRun)
  useEffect(() => { runRef.current = onRun }, [onRun])

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.())
  }

  return (
    <div className="h-full min-h-[280px] overflow-hidden bg-white" aria-label="Python code editing area">
      <Editor
        height="100%"
        defaultLanguage="python"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        theme="vs"
        loading={<div className="flex h-full items-center justify-center bg-white text-sm text-slate-500">Preparing your Python editor…</div>}
        options={{
          fontSize: 14,
          lineHeight: 23,
          fontFamily: 'Consolas, "SFMono-Regular", Menlo, Monaco, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          wordWrap: 'on',
          renderLineHighlight: 'line',
          padding: { top: 17, bottom: 14 },
          overviewRulerLanes: 0,
          smoothScrolling: true,
          ariaLabel: 'Python code editor. Press Control or Command plus Enter to run.',
          accessibilitySupport: 'auto',
        }}
      />
    </div>
  )
}
