import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, AlertTriangle, ArrowUpDown, History, Menu, X, LogOut, Plus, Wallet } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/funds/create', label: 'Create Fund', icon: Plus },
  { to: '/disasters', label: 'Disasters', icon: AlertTriangle },
  { to: '/payouts', label: 'Payouts', icon: ArrowUpDown },
  { to: '/transactions', label: 'Transactions', icon: History },
]

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-800/80 bg-[#0b0f13] transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/60 px-5">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <img src="/logo.jpeg" alt="Kitten Finance" className="h-7 w-7 rounded-full object-cover" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 group-hover:text-white transition-colors">
              kitten finance
            </span>
          </Link>
          <button className="lg:hidden text-slate-500 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2.5 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to + '/'))
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-emerald-500/[0.08] text-emerald-300'
                    : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {/* Active left bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                )}
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                {label}
                {to === '/disasters' && (
                  <span className="ml-auto flex h-1.5 w-1.5 items-center justify-center">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                    </span>
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-slate-800/60 p-3">
            <div className="mb-2 rounded-lg bg-slate-800/40 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-slate-200">{user.name}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-600">
                <Wallet className="h-2.5 w-2.5 shrink-0" />
                {user.walletAddress?.replace('https://ilp.interledger-test.dev/', '')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-red-950/40 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-800/60 bg-slate-950/80 px-4 backdrop-blur-sm lg:px-6">
          <button className="lg:hidden text-slate-500 hover:text-white transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {user && (
            <span className="hidden font-mono text-[11px] text-slate-600 sm:block">
              {user.email}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
