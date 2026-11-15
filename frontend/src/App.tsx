import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { StudentPage } from './pages/StudentPage'
import { TeacherPage } from './pages/TeacherPage'

const navLink = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  ].join(' ')

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-dvh flex-col bg-[#f7f9fd]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <nav aria-label="Main" className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
            <span className="mr-4 flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">C</span>cognit<span className="text-indigo-600">.</span></span>
            <NavLink to="/student" className={navLink}>
              Student
            </NavLink>
            <NavLink to="/teacher" className={navLink}>
              Teacher
            </NavLink>
            <span className="ml-auto hidden text-xs text-slate-500 sm:inline">Prototype · not a secure exam environment</span>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/student" replace />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
