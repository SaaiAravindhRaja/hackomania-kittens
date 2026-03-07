import React from "react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-[0.12em] text-slate-700 uppercase">Kitten Finance</p>
        <p className="text-sm text-slate-500">
          Trusted infrastructure for transparent disaster-response funding and payout readiness.
        </p>
      </div>
    </footer>
  );
}
