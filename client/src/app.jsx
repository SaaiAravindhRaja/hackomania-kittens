import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/home.jsx'
import Dashboard from './pages/dashboard.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
