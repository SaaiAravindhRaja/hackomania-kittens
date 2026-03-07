import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/home.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  )
}