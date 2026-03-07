import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/home.jsx'
import Dashboard from './pages/dashboard.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'
import Donation from './pages/donation.jsx'
import WalletPage from './pages/wallet.jsx'
import { getStoredUser } from './lib/auth-session.js'

function RequireAuth({ children }) {
  const user = getStoredUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function HomeRoute() {
  const user = getStoredUser()
  if (user) {
    return <Dashboard />
  }
  return <Home />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/donation"
        element={
          <RequireAuth>
            <Donation />
          </RequireAuth>
        }
      />
      <Route
        path="/wallet"
        element={
          <RequireAuth>
            <WalletPage />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
