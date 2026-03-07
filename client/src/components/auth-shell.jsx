import React from "react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="relative min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-sm font-semibold tracking-[0.08em] text-slate-700 uppercase transition-colors hover:text-slate-900">
              kitten finance
            </Link>
            <Link to="/" className="text-sm text-slate-500 transition-colors hover:text-slate-800">
              home
            </Link>
          </div>

          <Card className="border-slate-200/90 bg-white shadow-xl shadow-slate-900/5">
            <CardHeader className="gap-2 border-b border-slate-100 pb-5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                {eyebrow}
              </p>
              <CardTitle className="text-2xl tracking-tight text-slate-900">{title}</CardTitle>
              <CardDescription className="text-slate-500">{description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {children}
              <p className="text-center text-sm text-slate-500">
                {footerLabel}{" "}
                <Link to={footerLinkTo} className="font-semibold text-slate-800 transition-colors hover:text-slate-900">
                  {footerLinkLabel}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
