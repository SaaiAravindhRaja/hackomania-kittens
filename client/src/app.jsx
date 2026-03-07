import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import AppShell from '@/components/app-shell'

import Home from './pages/home.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'
import IDPCallback from './pages/idp-callback.jsx'
import Dashboard from './pages/dashboard.jsx'
import FundCreate from './pages/fund-create.jsx'
import FundDetail from './pages/fund-detail.jsx'
import Contribute from './pages/contribute.jsx'
import Disasters from './pages/disasters.jsx'
import Payouts from './pages/payouts.jsx'
import Transactions from './pages/transactions.jsx'
import Donation from './pages/donation.jsx'
import WalletPage from './pages/wallet.jsx'

// Wraps with AppShell sidebar — for saai-style pages
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

// Auth-only check — for pages that manage their own layout (donation, wallet)
function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/idp-callback" element={<IDPCallback />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/funds/create" element={<ProtectedRoute><FundCreate /></ProtectedRoute>} />
      <Route path="/funds/:id" element={<ProtectedRoute><FundDetail /></ProtectedRoute>} />
      <Route path="/contribute/:fundId" element={<ProtectedRoute><Contribute /></ProtectedRoute>} />
      <Route path="/disasters" element={<ProtectedRoute><Disasters /></ProtectedRoute>} />
      <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />

      {/* Integration pages — manage their own layout */}
      <Route path="/donation" element={<RequireAuth><Donation /></RequireAuth>} />
      <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
