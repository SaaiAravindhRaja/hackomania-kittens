import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, Zap, ArrowRight } from 'lucide-react'

function Particles() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    angle: (i / 16) * 360,
    dist: 60 + Math.random() * 40,
    size: 3 + Math.random() * 3,
    color: i % 3 === 0 ? '#34d399' : i % 3 === 1 ? '#6ee7b7' : '#a7f3d0',
    delay: Math.random() * 0.3,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
            y: Math.sin((p.angle * Math.PI) / 180) * p.dist,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: p.delay }}
        />
      ))}
    </div>
  )
}

export default function IDPCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const interactRef = params.get('interact_ref')
    const nonce = sessionStorage.getItem('op_nonce')
    const fundId = sessionStorage.getItem('op_fundId')

    if (!interactRef || !nonce) {
      setStatus('error')
      setError('Missing payment authorization data. Please try contributing again.')
      return
    }

    post('/payments/contribute/complete', { interact_ref: interactRef, nonce })
      .then(data => {
        sessionStorage.removeItem('op_nonce')
        sessionStorage.removeItem('op_fundId')
        setStatus('success')
        setShowParticles(true)
        setTimeout(() => {
          navigate(`/funds/${fundId}?payment=success`)
        }, 2800)
      })
      .catch(err => {
        setStatus('error')
        setError(err.message || 'Failed to complete payment')
      })
  }, [])

  return (
    <div className="grain-overlay flex min-h-screen items-center justify-center bg-[#070a0d]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
          status === 'success' ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-sm px-4">
        <AnimatePresence mode="wait">
          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              {/* Animated rings */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute h-full w-full animate-ping rounded-full border border-emerald-500/20" style={{ animationDuration: '2s' }} />
                <div className="absolute h-20 w-20 animate-ping rounded-full border border-emerald-400/15" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-400" />
              </div>

              <div>
                <h2 className="text-display italic text-2xl font-normal text-white">
                  Completing your payment
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Finalizing on the Interledger network…
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs text-slate-600">
                <Zap className="h-3 w-3 text-emerald-500" />
                Cross-currency payment in progress
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              {/* Success icon with particles */}
              <div className="relative">
                {showParticles && <Particles />}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className="flex h-24 w-24 items-center justify-center rounded-2xl border border-emerald-600/40 bg-emerald-500/[0.1] shadow-[0_0_50px_rgba(52,211,153,0.25)]"
                >
                  <CheckCircle className="h-12 w-12 text-emerald-400" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-display italic text-3xl font-normal text-white">
                  Payment confirmed!
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Your contribution was processed via Interledger.<br />
                  Redirecting you to the fund…
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-500/[0.07] px-5 py-2 text-sm font-medium text-emerald-300"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Transaction recorded
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </motion.div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-red-800/50 bg-red-500/[0.08]">
                <AlertTriangle className="h-10 w-10 text-red-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">Payment failed</h2>
                <p className="mt-2 text-sm text-red-300/80">{error}</p>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
              >
                Return to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
