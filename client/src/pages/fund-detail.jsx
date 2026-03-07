import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { api, get, post } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Wallet, TrendingUp, ArrowUpRight, AlertTriangle, Zap, CheckCircle, Shield, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

function Avatar({ name, size = 'md' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['bg-emerald-700', 'bg-blue-700', 'bg-purple-700', 'bg-amber-700', 'bg-red-700', 'bg-pink-700']
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  return (
    <div className={`flex items-center justify-center rounded-full font-bold text-white ${color} ${sz}`}>
      {initials}
    </div>
  )
}

export default function FundDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [fund, setFund] = useState(null)
  const [members, setMembers] = useState([])
  const [contributions, setContributions] = useState([])
  const [payouts, setPayouts] = useState([])
  const [activeDisasters, setActiveDisasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [joined, setJoined] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      showToast('Payment successful! Your contribution has been recorded.', 'success')
    }
  }, [])

  const loadData = async () => {
    try {
      const [fundRes, disastersRes] = await Promise.all([
        get(`/funds/${id}`),
        get('/disasters/active'),
      ])
      setFund(fundRes.fund)
      setMembers(fundRes.members || [])
      setContributions(fundRes.contributions || [])
      setPayouts(fundRes.payouts || [])
      setActiveDisasters(disastersRes.disasters || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const isMember = fund?.members?.includes(user?.id)
  const isCreator = fund?.createdBy === user?.id

  const handleJoin = async () => {
    try {
      await post(`/funds/${id}/join`, {})
      await loadData()
      showToast('You joined the fund!')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Check if any active disaster matches fund trigger rules
  const matchingDisasters = activeDisasters.filter(d => {
    const rules = fund?.triggerRules
    if (!rules?.disasterType) return false
    if (rules.disasterType === 'earthquake' && d.type === 'earthquake') {
      return d.magnitude >= (rules.minMagnitude || 5)
    }
    if (rules.disasterType === 'severe-weather' && d.type === 'weather-alert') {
      const map = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 }
      return (map[d.severity] || 0) >= (map[rules.minSeverity || 'Severe'] || 3)
    }
    return false
  })
  const isTriggered = matchingDisasters.length > 0

  const handlePayout = async () => {
    if (!fund) return
    setPayoutLoading(true)
    try {
      const fundMembers = members.filter(m => m.walletAddress)
      if (fund.payoutType === 'members' && fundMembers.length > 0) {
        const share = fund.currentAmount / fundMembers.length
        for (const m of fundMembers) {
          await post('/payouts/initiate', {
            fundId: id,
            recipientWalletAddress: m.walletAddress,
            recipientUserId: m.id,
            amount: share.toFixed(2),
            triggeredBy: matchingDisasters[0]?.title || 'manual',
          })
        }
        showToast(`Payout sent to ${fundMembers.length} members!`)
      } else if (fund.payoutType === 'designated' && fund.beneficiaryWallet) {
        await post('/payouts/initiate', {
          fundId: id,
          recipientWalletAddress: fund.beneficiaryWallet,
          amount: fund.currentAmount.toFixed(2),
          triggeredBy: matchingDisasters[0]?.title || 'manual',
        })
        showToast('Payout sent to designated beneficiary!')
      }
      await loadData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setPayoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-400" />
      </div>
    )
  }
  if (!fund) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Shield className="mx-auto mb-3 h-10 w-10 text-slate-700" />
        <p>Fund not found.</p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">← Back to dashboard</Link>
      </div>
    )
  }

  const pct = fund.targetAmount > 0 ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${
              toast.type === 'error'
                ? 'border-red-700 bg-red-950 text-red-200'
                : 'border-emerald-700 bg-emerald-950 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fund header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{fund.name}</h1>
              {isTriggered && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  TRIGGERED
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-400">{fund.description || 'Community emergency fund'}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!isMember && (
              <Button onClick={handleJoin} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Join Fund
              </Button>
            )}
            {isMember && (
              <Link
                to={`/contribute/${id}`}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Contribute
              </Link>
            )}
            {isCreator && fund.currentAmount > 0 && (
              <Button
                onClick={handlePayout}
                disabled={payoutLoading}
                className={`${isTriggered ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
              >
                {payoutLoading ? 'Sending...' : isTriggered ? '⚡ Trigger Payout' : 'Manual Payout'}
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-400">${fund.currentAmount?.toFixed(2) || '0.00'} raised</span>
            <span className="text-slate-500">goal ${fund.targetAmount?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${isTriggered ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
          <p className="mt-1.5 text-right text-xs font-bold text-emerald-400">{pct.toFixed(0)}% funded</p>
        </div>
      </div>

      {/* Disaster match alert */}
      {isTriggered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-700/50 bg-red-950/30 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Disaster trigger matched!</p>
              <p className="mt-1 text-sm text-red-400/80">
                {matchingDisasters.map(d => d.title).join(', ')} matches your fund's trigger rules.
                {isCreator ? ' You can now release the payout.' : ' The fund manager can release payouts.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contributions */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Contributions</h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
              {contributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <TrendingUp className="mb-2 h-7 w-7 text-slate-700" />
                  <p className="text-sm text-slate-500">No contributions yet. Be the first!</p>
                </div>
              ) : contributions.map((c, i) => (
                <div key={c.id || i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={members.find(m => m.id === c.userId)?.name || 'User'} size="sm" />
                    <div>
                      <p className="text-sm text-slate-200">{members.find(m => m.id === c.userId)?.name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-600">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-emerald-400">+${Number(c.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payouts */}
          {payouts.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Payouts</h2>
              <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
                {payouts.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm text-slate-200 font-mono">{p.recipientWalletAddress?.split('/').pop()}</p>
                      <p className="text-xs text-slate-600">{new Date(p.createdAt).toLocaleDateString()} · {p.triggeredBy}</p>
                    </div>
                    <span className="font-semibold text-blue-400">-${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Trigger rules */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Trigger Rules</h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-slate-300 capitalize">{fund.triggerRules?.disasterType || 'Any disaster'}</span>
              </div>
              {fund.triggerRules?.minMagnitude && (
                <p className="text-xs text-slate-500">Magnitude ≥ {fund.triggerRules.minMagnitude}</p>
              )}
              {fund.triggerRules?.minSeverity && (
                <p className="text-xs text-slate-500">Severity ≥ {fund.triggerRules.minSeverity}</p>
              )}
              <div className="pt-1 border-t border-slate-800">
                <p className="text-xs text-slate-500">Payout to: <span className="text-slate-300">
                  {fund.payoutType === 'designated' ? 'Designated org' : 'All members'}
                </span></p>
              </div>
            </div>
          </div>

          {/* Members */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Members ({members.length})
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              {members.map((m, i) => (
                <div key={m.id || i} className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <div>
                    <p className="text-sm text-slate-200">{m.name}</p>
                    <p className="text-xs text-slate-600 font-mono truncate max-w-[130px]">
                      {m.walletAddress?.replace('https://ilp.interledger-test.dev/', '')}
                    </p>
                  </div>
                  {m.id === fund.createdBy && (
                    <span className="ml-auto text-xs text-amber-400">creator</span>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No members yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
