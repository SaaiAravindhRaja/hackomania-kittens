import React, { useState, useEffect } from 'react'
import { get } from '@/lib/api'
import { motion } from 'framer-motion'
import { TrendingUp, ArrowUpRight, Activity, Filter } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const TYPE_LABELS = { all: 'All', contribution: 'Contributions', payout: 'Payouts' }

function TypeIcon({ type }) {
  if (type === 'contribution') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
      <ArrowUpRight className="h-3.5 w-3.5 text-blue-400" />
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm shadow-2xl">
      <p className="mb-2 font-medium text-slate-300">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: ${Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

function mergeVolumeData(contributions, payouts) {
  const map = {}
  for (const r of contributions) {
    if (!map[r.date]) map[r.date] = { date: r.date, contributions: 0, payouts: 0 }
    map[r.date].contributions = Number(r.total || 0)
  }
  for (const r of payouts) {
    if (!map[r.date]) map[r.date] = { date: r.date, contributions: 0, payouts: 0 }
    map[r.date].payouts = Number(r.total || 0)
  }
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }))
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [volumeData, setVolumeData] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [txRes, volRes] = await Promise.allSettled([
          get('/stats/transactions?limit=100'),
          get('/stats/volume?days=7'),
        ])
        if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || [])
        if (volRes.status === 'fulfilled') {
          const { contributions = [], payouts = [] } = volRes.value
          setVolumeData(mergeVolumeData(contributions, payouts))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  const totalContributed = transactions
    .filter(t => t.type === 'contribution')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  const totalPaidOut = transactions
    .filter(t => t.type === 'payout')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Transaction Ledger</h1>
        <p className="mt-0.5 text-sm text-slate-400">All contributions and disbursements across every fund</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total transactions', value: transactions.length, prefix: '', color: 'text-slate-300', decimals: 0 },
          { label: 'Total contributed', value: totalContributed, prefix: '$', color: 'text-emerald-400', decimals: 2 },
          { label: 'Total paid out', value: totalPaidOut, prefix: '$', color: 'text-blue-400', decimals: 2 },
        ].map(({ label, value, prefix, color, decimals }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>
              {prefix}{Number(value).toFixed(decimals)}
            </p>
          </div>
        ))}
      </div>

      {/* Volume chart */}
      {volumeData.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">7-Day Volume</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gContrib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPayout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
              />
              <Area
                type="monotone" dataKey="contributions" name="Contributions"
                stroke="#10b981" strokeWidth={2} fill="url(#gContrib)"
              />
              <Area
                type="monotone" dataKey="payouts" name="Payouts"
                stroke="#3b82f6" strokeWidth={2} fill="url(#gPayout)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-600">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
          <Activity className="mb-3 h-10 w-10 text-slate-700" />
          <p className="text-slate-400">No transactions yet</p>
          <p className="mt-1 text-sm text-slate-600">Start by joining a fund and making a contribution.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_1fr_120px_90px] gap-3 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <span />
            <span>Actor</span>
            <span>Fund</span>
            <span>Amount</span>
            <span>Date</span>
          </div>

          <div className="divide-y divide-slate-800">
            {filtered.map((tx, i) => {
              const isContrib = tx.type === 'contribution'
              const actorName = tx.actor_name || tx.user || '—'
              const shortActor = actorName.replace('https://ilp.interledger-test.dev/', '')

              return (
                <motion.div
                  key={tx.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="grid grid-cols-[2rem_1fr_1fr_120px_90px] gap-3 items-center px-5 py-3.5"
                >
                  <TypeIcon type={tx.type} />

                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">{shortActor}</p>
                    <p className="text-xs text-slate-600 capitalize">{tx.type}</p>
                  </div>

                  <p className="truncate text-sm text-slate-400">{tx.fund_name || '—'}</p>

                  <p className={`font-semibold tabular-nums ${isContrib ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {isContrib ? '+' : '−'}${Number(tx.amount).toFixed(2)}
                    {tx.currency && <span className="ml-1 text-xs font-normal text-slate-600">{tx.currency}</span>}
                  </p>

                  <p className="text-xs text-slate-500">
                    {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
