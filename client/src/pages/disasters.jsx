import React, { useState, useEffect, useCallback } from 'react'
import { get } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Activity, Wind, RefreshCw, Clock } from 'lucide-react'

function SeverityBadge({ severity }) {
  const map = {
    Extreme: 'bg-red-500/20 text-red-300 border-red-700/50',
    Severe: 'bg-orange-500/20 text-orange-300 border-orange-700/50',
    Moderate: 'bg-yellow-500/20 text-yellow-300 border-yellow-700/50',
    Minor: 'bg-slate-500/20 text-slate-400 border-slate-700/50',
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[severity] || map.Minor}`}>
      {severity}
    </span>
  )
}

function LiveDot({ severity }) {
  const color = severity === 'Extreme' ? 'bg-red-400' : severity === 'Severe' ? 'bg-orange-400' : 'bg-yellow-400'
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  )
}

function TimeAgo({ iso }) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return <span>just now</span>
  if (mins < 60) return <span>{mins}m ago</span>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return <span>{hrs}h ago</span>
  return <span>{Math.floor(hrs / 24)}d ago</span>
}

function EarthquakeCard({ d, index }) {
  const barW = Math.min(((d.magnitude - 3) / 5) * 100, 100)
  const barColor = d.severity === 'Extreme' ? 'bg-red-500' : d.severity === 'Severe' ? 'bg-orange-500' : 'bg-yellow-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <LiveDot severity={d.severity} />
          <div>
            <p className="font-semibold text-white leading-tight">{d.place || d.title}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              <TimeAgo iso={d.time} />
            </div>
          </div>
        </div>
        <SeverityBadge severity={d.severity} />
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div className="flex-1">
          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
            <span>magnitude</span>
            <span className="font-bold text-white">{d.magnitude?.toFixed(1)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${barW}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.04 + 0.2 }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
        </div>
        {d.location && (
          <div className="text-right text-xs text-slate-600">
            <p>{d.location.lat?.toFixed(2)}°, {d.location.lng?.toFixed(2)}°</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function WeatherCard({ d, index }) {
  const colorMap = {
    Extreme: 'border-red-800/60 bg-red-950/20',
    Severe: 'border-orange-800/60 bg-orange-950/20',
    Moderate: 'border-yellow-800/60 bg-yellow-950/20',
  }
  const border = colorMap[d.severity] || 'border-slate-800 bg-slate-900'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-xl border p-5 hover:brightness-110 transition-all ${border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <LiveDot severity={d.severity} />
          <p className="font-semibold text-white leading-tight line-clamp-2">{d.title}</p>
        </div>
        <SeverityBadge severity={d.severity} />
      </div>
      {d.areaDesc && (
        <p className="mt-2 text-xs text-slate-400 line-clamp-2">{d.areaDesc}</p>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        <Clock className="h-3 w-3" />
        <TimeAgo iso={d.time} />
      </div>
    </motion.div>
  )
}

export default function Disasters() {
  const [disasters, setDisasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const data = await get('/disasters/active')
      setDisasters(data.disasters || [])
      setLastUpdate(new Date())
    } catch (err) {
      console.error('[Disasters] load error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(), 30000)
    return () => clearInterval(interval)
  }, [load])

  const earthquakes = disasters.filter(d => d.type === 'earthquake')
  const weatherAlerts = disasters.filter(d => d.type === 'weather-alert')
  const extremeCount = disasters.filter(d => d.severity === 'Extreme').length

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Disaster Monitor</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Live feed from USGS and National Weather Service — auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary banner */}
      {disasters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 ${extremeCount > 0 ? 'border-red-800/60 bg-red-950/30' : 'border-orange-800/60 bg-orange-950/20'}`}
        >
          <div className="flex items-center gap-3">
            <LiveDot severity={extremeCount > 0 ? 'Extreme' : 'Severe'} />
            <div className="flex-1">
              <p className={`font-semibold ${extremeCount > 0 ? 'text-red-300' : 'text-orange-300'}`}>
                {disasters.length} active event{disasters.length !== 1 ? 's' : ''} detected
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {earthquakes.length} earthquake{earthquakes.length !== 1 ? 's' : ''} · {weatherAlerts.length} weather alert{weatherAlerts.length !== 1 ? 's' : ''}
                {lastUpdate && ` · Updated ${lastUpdate.toLocaleTimeString()}`}
              </p>
            </div>
            <AlertTriangle className={`h-5 w-5 shrink-0 ${extremeCount > 0 ? 'text-red-400' : 'text-orange-400'}`} />
          </div>
        </motion.div>
      )}

      {disasters.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-20 text-center">
          <Activity className="mb-3 h-10 w-10 text-slate-700" />
          <p className="text-slate-400">No active disasters detected</p>
          <p className="mt-1 text-sm text-slate-600">The world is calm right now. Funds remain on standby.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Earthquakes */}
        {earthquakes.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Earthquakes
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-400">
                {earthquakes.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {earthquakes.map((d, i) => (
                  <EarthquakeCard key={d.id} d={d} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Weather Alerts */}
        {weatherAlerts.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Weather Alerts
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-400">
                {weatherAlerts.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {weatherAlerts.map((d, i) => (
                  <WeatherCard key={d.id} d={d} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
