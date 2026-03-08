import React from "react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/40 bg-[#070a0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-[0.12em] text-slate-400 uppercase">Kitten Finance</p>
        <p className="text-sm text-slate-600">
          Trusted infrastructure for transparent disaster-response funding and payout readiness.
        </p>
      </div>
    </footer>
  );
}
