import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Wallet, Waves } from "lucide-react";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearStoredUser, getStoredUser } from "@/lib/auth-session";

const trustStats = [
  { label: "Response readiness", value: "< 6 hrs" },
  { label: "Transparent records", value: "100%" },
  { label: "Regional coverage", value: "42 regions" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Verification-first operations",
    description:
      "Account onboarding and wallet checks ensure funding can be allocated to validated recipients with clear controls.",
  },
  {
    icon: Waves,
    title: "Disaster-aware funding logic",
    description:
      "Prepared for event-driven workflows where fund release can follow geographic and severity signals from trusted data feeds.",
  },
  {
    icon: Wallet,
    title: "Open payment rails",
    description:
      "Interoperable wallet architecture supports faster payout execution and clean auditability across transactions.",
  },
];

const recentUpdates = [
  { title: "Emergency pool rebalanced", detail: "Southeast Asia reserve increased by 12% this week." },
  { title: "Wallet verification SLA improved", detail: "Average onboarding verification time reduced to 9 minutes." },
  { title: "Donor reporting refreshed", detail: "Weekly impact summaries now include allocation snapshots." },
];

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  const primaryAction = useMemo(() => {
    if (user) {
      return {
        label: "Open dashboard",
        to: "/dashboard",
      };
    }

    return {
      label: "Get started",
      to: "/register",
    };
  }, [user]);

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNavbar user={user} onLogout={handleLogout} />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_70%)]">
          <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-12 h-52 w-52 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div className="space-y-6">
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">Finance for resilience</p>
              <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Fund disaster response with clarity, speed, and accountability.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Kitten Finance is built for donation and relief teams that need trustworthy workflows, transparent
                records, and reliable payout readiness from day one.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="h-11 rounded-xl px-5">
                  <Link to={primaryAction.to}>
                    {primaryAction.label}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                {trustStats.map((item) => (
                  <Card key={item.label} className="border-slate-200 bg-white/90 shadow-sm">
                    <CardContent className="space-y-1 py-4">
                      <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5">
              <CardHeader className="gap-2">
                <CardTitle className="text-xl">Operational priorities</CardTitle>
                <CardDescription>
                  Align funding governance with execution speed before the next critical event.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Prepared allocation pools</p>
                  <p className="mt-1 text-sm text-slate-600">Segment funds by region and risk profile.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Verified payout routes</p>
                  <p className="mt-1 text-sm text-slate-600">Ensure recipients can be reached without friction.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Real-time visibility</p>
                  <p className="mt-1 text-sm text-slate-600">Track donation flow and disbursement outcomes clearly.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-7">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Platform capabilities</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
              Core components are designed for finance and operations teams managing high-trust donation workflows.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="gap-3">
                    <div className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
            <Card className="border-slate-200 bg-slate-50 shadow-none">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">Recent platform activity</CardTitle>
                <CardDescription>Illustrative updates from ongoing operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                {recentUpdates.map((update) => (
                  <div key={update.title} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <p className="text-sm font-semibold text-slate-800">{update.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{update.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-900 text-slate-100 shadow-none">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg text-white">Trust and impact posture</CardTitle>
                <CardDescription className="text-slate-300">
                  Operational discipline that stakeholders can evaluate clearly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                {[
                  "Documented funding movement for each payout cycle",
                  "Clear onboarding rules for recipient wallets",
                  "Traceable account and transaction records",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                    <p>{line}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Ready to operate with confidence?</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
              Move from static fundraising pages to a platform designed for operational readiness and transparent relief
              finance.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-xl px-5">
                <Link to={primaryAction.to}>{primaryAction.label}</Link>
              </Button>
              {!user && (
                <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                  <Link to="/login">Log in to existing account</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
