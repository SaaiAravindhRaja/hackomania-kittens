import React from "react"
import { Link } from "react-router-dom"
import { Activity } from "lucide-react"

export default function AuthShell({
  title,
  description,
  eyebrow = "secure access",
  footerLabel,
  footerLinkLabel,
  footerLinkTo,
  children,
}) {
  return (
    <main className="grain-overlay relative min-h-screen bg-[#070a0d] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[25%] top-[35%] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.07] blur-[130px]" />
        <div className="absolute right-[15%] bottom-[25%] h-[400px] w-[400px] rounded-full bg-sky-600/[0.04] blur-[110px]" />
        <div className="absolute right-[40%] top-[10%] h-[200px] w-[200px] rounded-full bg-emerald-400/[0.03] blur-[70px]" />
      </div>

      {/* Grid lines */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          {/* Top nav */}
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.jpeg"
                alt="Kitten Finance"
                className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-700 transition-all group-hover:ring-emerald-500/50"
              />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 group-hover:text-slate-200 transition-colors">
                kitten finance
              </span>
            </Link>
            <Link
              to="/"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600 hover:text-slate-300 transition-colors"
            >
              ← home
            </Link>
          </div>

          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl shadow-black/40 backdrop-blur-sm">
            {/* Card header */}
            <div className="border-b border-slate-800/80 px-8 pb-6 pt-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/40 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                  <Activity className="h-2.5 w-2.5" />
                  {eyebrow}
                </span>
              </div>
              <h1 className="text-display italic text-3xl leading-tight text-slate-100">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
              )}
            </div>

            {/* Card body */}
            <div className="px-8 pb-8 pt-6">
              {children}

              {(footerLabel || footerLinkLabel) && (
                <p className="mt-6 text-center text-sm text-slate-600">
                  {footerLabel}{" "}
                  <Link
                    to={footerLinkTo}
                    className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    {footerLinkLabel}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
            Powered by Interledger Open Payments
          </p>
        </div>
      </div>
    </main>
  )
}
