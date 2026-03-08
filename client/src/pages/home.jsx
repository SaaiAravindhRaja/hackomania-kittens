import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Zap, Globe, Activity } from 'lucide-react'

function StatPill({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className={`font-mono text-2xl font-bold tabular-nums ${accent}`}>{value}</span>
      <span className="mt-0.5 text-xs uppercase tracking-[0.15em] text-slate-500">{label}</span>
    </div>
  )
}

export default function Home() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(s => setStats(s)).catch(() => {})
  }, [])

  return (
    <div className="grain-overlay relative min-h-screen overflow-hidden bg-[#070a0d] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[15%] top-[20%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.055] blur-[130px]" />
        <div className="absolute right-[10%] bottom-[20%] h-[500px] w-[500px] rounded-full bg-sky-600/[0.04] blur-[120px]" />
        <div className="absolute left-[60%] top-[60%] h-[300px] w-[300px] rounded-full bg-emerald-400/[0.03] blur-[80px]" />
      </div>

      {/* Subtle grid lines */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10">
        {/* Nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpeg" alt="Kitten Finance" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              kitten finance
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800/80 hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-950 transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)]"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-12 pt-12 lg:pt-20">
          {/* Eyebrow tag */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-500/[0.06] px-3.5 py-1.5 text-xs font-medium text-emerald-400">
              <Activity className="h-3 w-3" />
              Powered by Interledger Open Payments
            </span>
          </div>

          {/* Headline */}
          <div className="mb-8 max-w-4xl">
            <h1 className="leading-[1.06] text-white">
              <span className="block text-display italic text-5xl font-normal text-slate-100 lg:text-7xl">
                Community-powered
              </span>
              <span className="block text-5xl font-bold text-emerald-400 lg:text-7xl">
                emergency relief,
              </span>
              <span className="block text-display italic text-4xl font-normal text-slate-300 lg:text-6xl">
                automated.
              </span>
            </h1>
          </div>

          <p className="mb-10 max-w-xl text-base leading-relaxed text-slate-400 lg:text-lg">
            Pool micro-contributions. Watch the world. When disasters strike,
            funds move instantly — cross-currency, no banks, zero delays.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="group flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950 transition-all duration-300 hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(52,211,153,0.35)]"
            >
              Start contributing
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800/60 hover:text-white"
            >
              View dashboard
            </Link>
          </div>

          {/* Live stats bar */}
          <div className="mt-16 flex flex-wrap items-center gap-x-12 gap-y-5 border-t border-slate-800/70 pt-10">
            <StatPill
              label="Total raised"
              value={`$${Number(stats?.totalContributed || 0).toFixed(0)}`}
              accent="text-emerald-400"
            />
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <StatPill label="Active funds" value={stats?.fundCount || 0} accent="text-white" />
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <StatPill label="Members" value={stats?.memberCount || 0} accent="text-white" />
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <StatPill
              label="Paid out"
              value={`$${Number(stats?.totalPaidOut || 0).toFixed(0)}`}
              accent="text-sky-400"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-4">
          <div className="mb-10 flex items-center gap-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600">
              How it works
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                num: '01',
                Icon: TrendingUp,
                title: 'Pool contributions',
                desc: 'Members join emergency funds and contribute any amount via Interledger Open Payments — cross-border, cross-currency.',
                accent: 'text-emerald-400',
                border: 'hover:border-emerald-800/50',
                bg: 'bg-emerald-500/[0.06]',
              },
              {
                num: '02',
                Icon: Globe,
                title: 'Disaster detected',
                desc: 'Live feeds from USGS and NWS. When magnitude or severity crosses your threshold, the fund is flagged instantly.',
                accent: 'text-amber-400',
                border: 'hover:border-amber-800/50',
                bg: 'bg-amber-500/[0.06]',
              },
              {
                num: '03',
                Icon: Zap,
                title: 'Instant payout',
                desc: 'Open Payments releases funds to every member or a designated org — in seconds, traceable on-chain.',
                accent: 'text-sky-400',
                border: 'hover:border-sky-800/50',
                bg: 'bg-sky-500/[0.06]',
              },
            ].map((step) => (
              <div
                key={step.num}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all duration-300 ${step.border} hover:bg-slate-900/80`}
              >
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${step.bg} blur-2xl transition-all duration-500 group-hover:scale-150`} />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">{step.num}</span>
                    <div className={`rounded-lg bg-slate-800 p-2 ${step.accent} transition-transform duration-300 group-hover:scale-110`}>
                      <step.Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className={`mb-2.5 text-base font-semibold tracking-tight ${step.accent}`}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA strip */}
        <section className="border-t border-slate-800/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
            <div>
              <p className="text-sm font-semibold text-white">Ready to protect your community?</p>
              <p className="mt-0.5 text-xs text-slate-500">Create a fund in under 2 minutes.</p>
            </div>
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              Create a fund <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-800/40 px-6 py-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
              kitten finance
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-700">
              Powered by Interledger
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
