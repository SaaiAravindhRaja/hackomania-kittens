import React from "react";
import { Link } from "react-router-dom";

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
    <main className="relative min-h-screen bg-[#070a0d] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.07),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-sm font-semibold tracking-[0.08em] text-white uppercase transition-colors hover:text-emerald-400"
            >
              kitten finance
            </Link>
            <Link
              to="/"
              className="text-sm text-slate-400 transition-colors hover:text-slate-200"
            >
              home
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-black/40">
            <div className="space-y-1.5 border-b border-slate-800 px-6 pt-6 pb-5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                {eyebrow}
              </p>
              <h1 className="text-2xl tracking-tight text-white">{title}</h1>
              <p className="text-slate-400">{description}</p>
            </div>

            <div className="space-y-6 px-6 pt-6 pb-6">
              {children}
              <p className="text-center text-sm text-slate-500">
                {footerLabel}{" "}
                <Link
                  to={footerLinkTo}
                  className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  {footerLinkLabel}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
