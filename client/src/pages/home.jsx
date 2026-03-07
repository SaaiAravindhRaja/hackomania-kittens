import React from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-sm font-semibold tracking-wide text-slate-800">
            kitten finance
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="shadow-sm">
              <Link to="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <section className="mx-auto max-w-3xl space-y-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Community-powered emergency funds with instant money payouts
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Kitten Finance is focused on open payments, disaster triggers, transparent payouts, and low-friction aid delivery.
          </p>
        </section>
      </main>
    </div>
  );
}
