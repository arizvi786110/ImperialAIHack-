import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { StudentPage } from './pages/StudentPage'
import { TeacherPage } from './pages/TeacherPage'

const navLink = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white',
  ].join(' ')

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-dvh flex-col bg-slate-100">
        <header className="bg-slate-900">
          <nav aria-label="Main" className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
            <span className="mr-4 font-semibold tracking-wide text-white">COGNIT</span>
            <NavLink to="/student" className={navLink}>
              Student
            </NavLink>
            <NavLink to="/teacher" className={navLink}>
              Teacher
            </NavLink>
            <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Prototype · not a secure exam environment</span>
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
