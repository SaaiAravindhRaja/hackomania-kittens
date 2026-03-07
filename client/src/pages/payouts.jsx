import React, { useState, useEffect } from 'react'
import { get } from '@/lib/api'
import { motion } from 'framer-motion'
import { ArrowUpRight, Zap, User, Clock, CheckCircle, Loader2 } from 'lucide-react'

function StatusBadge({ status }) {
  if (status === 'completed' || status === 'sent') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
        <CheckCircle className="h-3 w-3" />
        Sent
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pending
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
      {status || 'unknown'}
    </span>
  )
}

function TriggerBadge({ triggeredBy }) {
  if (!triggeredBy || triggeredBy === 'manual') {
    return (
      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">manual</span>
    )
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">
      <Zap className="h-2.5 w-2.5" />
      {triggeredBy.length > 30 ? triggeredBy.slice(0, 30) + '…' : triggeredBy}
    </span>
  )
}

export default function Payouts() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await get('/stats/transactions?type=payout&limit=100')
        const rows = data.transactions || []
        setPayouts(rows)
        setTotal(rows.reduce((s, r) => s + Number(r.amount || 0), 0))
      } catch (err) {
        console.error('[Payouts]', err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Disbursements sent when disaster triggers activated
          </p>
        </div>
        {payouts.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Total disbursed</p>
            <p className="text-xl font-bold text-blue-400">${total.toFixed(2)}</p>
          </div>
        )}
      </div>

      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-20 text-center">
          <ArrowUpRight className="mb-3 h-10 w-10 text-slate-700" />
          <p className="text-slate-400">No payouts yet</p>
          <p className="mt-1 text-sm text-slate-600">Payouts appear here when disasters trigger fund disbursements.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_110px_100px] gap-4 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <span>Recipient</span>
            <span>Fund</span>
            <span>Amount</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800">
            {payouts.map((p, i) => {
              const wallet = p.user || p.recipient_wallet || '—'
              const shortWallet = wallet.replace('https://ilp.interledger-test.dev/', '')
              return (
                <motion.div
                  key={p.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_140px_110px_100px] gap-4 items-center px-5 py-4"
                >
                  {/* Recipient */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-slate-300">{shortWallet}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock className="h-3 w-3" />
                          {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="mx-1">·</span>
                          <TriggerBadge triggeredBy={p.triggered_by || p.triggeredBy} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fund */}
                  <p className="truncate text-sm text-slate-400">{p.fund_name || '—'}</p>

                  {/* Amount */}
                  <p className="font-semibold text-blue-400">
                    −${Number(p.amount).toFixed(2)}
                    {p.currency && <span className="ml-1 text-xs font-normal text-slate-600">{p.currency}</span>}
                  </p>

                  {/* Status */}
                  <StatusBadge status={p.status} />
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
