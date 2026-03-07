import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { api, get } from '@/lib/api'
import { motion } from 'framer-motion'
import {
  TrendingUp, ArrowUpRight, AlertTriangle, Users, Wallet,
  Plus, ChevronRight, Zap, Clock, Shield
} from 'lucide-react'

function AnimatedNumber({ value, prefix = '', decimals = 2 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) return
    let start = 0
    const step = value / 40
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(start)
    }, 25)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{display.toFixed(decimals)}</span>
}

function StatCard({ icon: Icon, label, value, prefix = '', sub, color = 'emerald', decimals = 2 }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    red: 'text-red-400 bg-red-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">
            <AnimatedNumber value={Number(value) || 0} prefix={prefix} decimals={decimals} />
          </p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

function FundCard({ fund, onContribute, onJoin, userId }) {
  const pct = fund.targetAmount > 0 ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) : 0
  const isMember = fund.members?.includes(userId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-semibold text-white">{fund.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-400">{fund.description || 'Emergency community fund'}</p>
        </div>
        <Link
          to={`/funds/${fund.id}`}
          className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>${fund.currentAmount?.toFixed(2) || '0.00'} raised</span>
          <span>goal ${fund.targetAmount?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
        <p className="mt-1 text-right text-xs font-medium text-emerald-400">{pct.toFixed(0)}%</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" />
          {fund.members?.length || 0} members
        </div>
        <div className="flex gap-2">
          {!isMember && (
            <button
              onClick={() => onJoin(fund.id)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Join
            </button>
          )}
          {isMember && (
            <Link
              to={`/contribute/${fund.id}`}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Contribute
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [funds, setFunds] = useState([])
  const [disasters, setDisasters] = useState([])
  const [recentTx, setRecentTx] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, fundsData, disastersData, txData] = await Promise.allSettled([
          get('/stats'),
          get('/funds'),
          get('/disasters/active'),
          get('/stats/transactions?limit=6'),
        ])
        if (statsData.status === 'fulfilled') setStats(statsData.value)
        if (fundsData.status === 'fulfilled') setFunds(fundsData.value.funds || [])
        if (disastersData.status === 'fulfilled') setDisasters(disastersData.value.disasters || [])
        if (txData.status === 'fulfilled') setRecentTx(txData.value.transactions || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleJoin = async (fundId) => {
    try {
      await api('/funds/' + fundId + '/join', { method: 'POST' })
      const data = await get('/funds')
      setFunds(data.funds || [])
    } catch (err) {
      console.error('join error:', err)
    }
  }

  const activeDisasters = disasters.slice(0, 3)
  const myFunds = funds.filter(f => f.members?.includes(user?.id))
  const otherFunds = funds.filter(f => !f.members?.includes(user?.id))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">Community emergency fund platform</p>
        </div>
        <Link
          to="/funds/create"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          New Fund
        </Link>
      </div>

      {/* Active disaster banner */}
      {activeDisasters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-800/60 bg-red-950/40 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300">
                {activeDisasters.length} active disaster{activeDisasters.length > 1 ? 's' : ''} detected
              </p>
              <p className="mt-0.5 text-xs text-red-400/70">
                {activeDisasters.map(d => d.title).join(' · ')}
              </p>
            </div>
            <Link
              to="/disasters"
              className="flex items-center gap-1 text-xs font-medium text-red-300 hover:text-red-100"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp} label="Total Raised" color="emerald"
          value={stats?.totalContributed || 0} prefix="$"
          sub={`${stats?.contributionCount || 0} contributions`}
        />
        <StatCard
          icon={ArrowUpRight} label="Total Paid Out" color="blue"
          value={stats?.totalPaidOut || 0} prefix="$"
          sub={`${stats?.payoutCount || 0} payouts`}
        />
        <StatCard
          icon={AlertTriangle} label="Active Disasters" color="red"
          value={activeDisasters.length} prefix="" decimals={0}
          sub="live monitoring"
        />
        <StatCard
          icon={Users} label="Community Members" color="amber"
          value={stats?.memberCount || 0} prefix="" decimals={0}
          sub={`across ${stats?.fundCount || 0} funds`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Funds section */}
        <div className="lg:col-span-2 space-y-5">
          {myFunds.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">My Funds</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {myFunds.map(f => (
                  <FundCard key={f.id} fund={f} onJoin={handleJoin} userId={user?.id} />
                ))}
              </div>
            </div>
          )}

          {otherFunds.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                  {myFunds.length > 0 ? 'Other Funds' : 'Available Funds'}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherFunds.slice(0, 4).map(f => (
                  <FundCard key={f.id} fund={f} onJoin={handleJoin} userId={user?.id} />
                ))}
              </div>
            </div>
          )}

          {funds.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
              <Shield className="mb-3 h-10 w-10 text-slate-700" />
              <p className="text-slate-400">No funds yet.</p>
              <p className="mt-1 text-sm text-slate-600">Create the first emergency fund for your community.</p>
              <Link
                to="/funds/create"
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Create a fund
              </Link>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Recent Activity</h2>
            <Link to="/transactions" className="text-xs text-slate-500 hover:text-slate-300">View all</Link>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
            {recentTx.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="mb-2 h-7 w-7 text-slate-700" />
                <p className="text-sm text-slate-500">No activity yet</p>
              </div>
            )}
            {recentTx.map((tx, i) => (
              <div key={tx.id || i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    tx.type === 'contribution' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {tx.type === 'contribution' ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      {tx.type === 'contribution' ? 'Contribution' : 'Payout'}
                    </p>
                    <p className="text-xs text-slate-600 truncate max-w-[100px]">{tx.fund_name || 'Fund'}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${
                  tx.type === 'contribution' ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  {tx.type === 'contribution' ? '+' : '-'}${Number(tx.amount || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { to: '/funds/create', icon: Plus, label: 'Create Fund', color: 'bg-emerald-600 hover:bg-emerald-500' },
          { to: '/disasters', icon: AlertTriangle, label: 'View Disasters', color: 'bg-red-900/60 hover:bg-red-900 border border-red-800' },
          { to: '/transactions', icon: Zap, label: 'Transactions', color: 'bg-slate-800 hover:bg-slate-700' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-sm font-medium text-white transition-colors ${color}`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
