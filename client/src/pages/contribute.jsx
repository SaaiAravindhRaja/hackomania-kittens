import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { post, get } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, ArrowRight, CheckCircle, Loader2, Shield, Zap, AlertTriangle } from 'lucide-react'

const STEPS = [
  { label: 'Enter Amount', icon: Wallet },
  { label: 'Preparing', icon: Loader2 },
  { label: 'Authorize', icon: Shield },
  { label: 'Processing', icon: Loader2 },
  { label: 'Complete', icon: CheckCircle },
]

const QUICK_AMOUNTS = [5, 10, 25, 50]

export default function Contribute() {
  const { fundId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const [fund, setFund] = useState(null)

  useEffect(() => {
    get(`/funds/${fundId}`).then(d => setFund(d.fund)).catch(() => {})
  }, [fundId])

  const handleInitiate = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!user?.wallet_address) {
      setError('No wallet address found on your account.')
      return
    }

    setError(null)
    setStep(1)

    try {
      const _res = await fetch('/payments/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(Number(amount) * 100),
          walletAddress: user.wallet_address,
          userId: user.user_id,
          userEmail: user.email,
        }),
      })
      const data = await _res.json().catch(() => ({}))
      if (!_res.ok) throw new Error(data.error || 'Payment initiation failed')

      sessionStorage.setItem('op_nonce', data.nonce)
      sessionStorage.setItem('op_fundId', fundId)

      setStep(2)

      setTimeout(() => {
        window.location.href = data.redirectUrl
      }, 1200)
    } catch (err) {
      setError(err.message)
      setStep(0)
    }
  }

  const StepIcon = STEPS[step].icon
  const isSpinner = step === 1 || step === 3

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display italic text-3xl font-normal text-white">
          Contribute to fund
        </h1>
        {fund && (
          <p className="mt-1.5 font-mono text-sm text-emerald-400">{fund.name}</p>
        )}
        <p className="mt-1 text-sm text-slate-500">
          Secure Open Payments · Cross-currency via Interledger
        </p>
      </div>

      {/* Step progress */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          const SIcon = s.icon
          return (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-500 ${
                  done
                    ? 'border-emerald-500 bg-emerald-500/20'
                    : active
                    ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'border-slate-800 bg-slate-900'
                }`}>
                  <SIcon className={`h-3.5 w-3.5 transition-colors ${
                    done ? 'text-emerald-400' : active ? 'text-emerald-400' : 'text-slate-700'
                  } ${active && isSpinner ? 'animate-spin' : ''}`} />
                </div>
                <span className={`hidden text-[9px] font-medium uppercase tracking-widest sm:block ${
                  active ? 'text-emerald-400' : done ? 'text-slate-500' : 'text-slate-700'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mb-4 rounded transition-all duration-500 ${i < step ? 'bg-emerald-500/60' : 'bg-slate-800'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b0f13]">
        <div className="border-b border-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 ${step === 4 ? 'bg-emerald-500/20' : ''}`}>
              <StepIcon className={`h-4 w-4 ${step === 4 ? 'text-emerald-400' : 'text-slate-400'} ${isSpinner ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="font-semibold text-white">{STEPS[step].label}</p>
              <p className="text-xs text-slate-500">
                {step === 0 && 'Enter the amount to contribute via Open Payments'}
                {step === 1 && 'Creating incoming payment on the Interledger network…'}
                {step === 2 && 'Ready to authorize — you\'ll be redirected to your wallet\'s IDP'}
                {step === 3 && 'Completing your payment on the network…'}
                {step === 4 && 'Payment confirmed and recorded!'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                {/* Quick amounts */}
                <div>
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-slate-500">Quick select</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map(q => (
                      <button
                        key={q}
                        onClick={() => setAmount(String(q))}
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                          amount === String(q)
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        ${q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-500">Or enter amount</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-semibold text-slate-500">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="h-16 w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 font-mono text-3xl font-bold text-white placeholder:text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Wallet info */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    <span className="text-xs text-slate-500">Sending from:</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-300">
                    {user?.wallet_address || '(no wallet set)'}
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleInitiate}
                  disabled={!amount || Number(amount) <= 0}
                  className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950 transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Zap className="h-4 w-4" />
                  Contribute ${amount || '0.00'} via Open Payments
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </motion.div>
            )}

            {(step === 1 || step === 3) && (
              <motion.div
                key={`step${step}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-12"
              >
                <div className="relative">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-400" />
                  <div className="absolute inset-0 rounded-full bg-emerald-400/5 blur-xl" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-200">
                    {step === 1 ? 'Setting up on the Interledger network…' : 'Completing your payment…'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">This takes just a moment</p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-10"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-800/50 bg-emerald-500/[0.08] shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                  <Shield className="h-8 w-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white">Redirecting to your wallet…</p>
                  <p className="mt-2 text-sm text-slate-400 max-w-xs">
                    You'll land on your wallet's Identity Provider page. Click{' '}
                    <span className="font-semibold text-emerald-300">"Accept"</span> to authorize the payment.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-500">
                  <div className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                  Waiting for redirect…
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-600/40 bg-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.2)]"
                >
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">Payment confirmed!</p>
                  <p className="mt-1 text-sm text-slate-400">
                    ${amount} contributed to {fund?.name || 'the fund'}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/funds/${fundId}?payment=success`)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  View fund <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
