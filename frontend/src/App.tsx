import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { StudentPage } from './pages/StudentPage'
import { TeacherPage } from './pages/TeacherPage'

function navigation({ isActive }: { isActive: boolean }) {
  return 'c-nav-link' + (isActive ? ' c-nav-active' : '')
}
export default function App() {
  return <BrowserRouter><div className="cognit-shell min-h-dvh">
    <header className="c-header sticky top-0 z-30">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <NavLink to="/" className="inline-flex items-center gap-3" aria-label="Cognit home">
          <span className="c-logo grid size-9 place-items-center rounded-lg text-lg font-bold">C</span>
          <span className="text-lg font-semibold tracking-[-.045em] text-[#F4F4F6]">COGNIT<span className="text-[#8B7CF6]">.</span></span>
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink end to="/" className={navigation}>Overview</NavLink>
          <NavLink to="/student" className={navigation}>Learn</NavLink>
          <NavLink to="/teacher" className={navigation}>Educator</NavLink>
        </div>
        <span className="hidden text-xs text-[#A1A5B0] md:block"><span className="mr-2 text-[#59C7B5]">●</span>Adaptive Python lab</span>
      </nav>
    </header>
    <Routes>
      <Route path="/" element={<LandingPage/>} />
      <Route path="/student" element={<StudentPage/>} />
      <Route path="/teacher" element={<TeacherPage/>} />
      <Route path="*" element={<Navigate to="/" replace/>} />
    </Routes>
    <footer className="c-footer mx-auto flex max-w-[1500px] flex-wrap justify-between gap-2 px-5 py-6 text-xs text-[#767C8A] sm:px-8">
      <span>© 2026 COGNIT · Intelligence is a process.</span>
      <span>Hackathon prototype · demo data only</span>
    </footer>
  </div></BrowserRouter>
}
