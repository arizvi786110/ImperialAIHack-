import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { StudentPage } from './pages/StudentPage'
import { TeacherPage } from './pages/TeacherPage'

const navLink = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  ].join(' ')

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-dvh flex-col bg-[#f7f9fd] text-slate-800">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <nav aria-label="Main navigation" className="mx-auto flex w-full max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-8">
            <NavLink to="/student" aria-label="Cognit home" className="flex items-center gap-2.5 no-underline">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-xl font-black text-white shadow-[0_5px_16px_-6px_#4338ca]">C</span>
              <span className="text-xl font-black tracking-tight text-slate-900">cognit<span className="text-indigo-600">.</span></span>
            </NavLink>
            <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:block"/>
            <div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1">
              <NavLink to="/student" className={navLink}>Workspace</NavLink>
              <NavLink to="/teacher" className={navLink}>Teacher view</NavLink>
            </div>
            <div className="ml-auto hidden items-center gap-2 text-xs font-medium text-slate-500 md:flex">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true"/>
              Python assessment demo
            </div>
          </nav>
        </header>
        <div className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/student" replace />} />
            <Route path="/student" element={<StudentPage />} />
            <Route path="/teacher" element={<TeacherPage />} />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </div>
        <footer className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-slate-400 sm:px-8">
          <span>© Cognit · Built for learning, not invigilation.</span>
          <span>Demo environment · Use example student data only</span>
        </footer>
      </div>
    </BrowserRouter>
  )
}
