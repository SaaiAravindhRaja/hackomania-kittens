import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleDollarSign, Clock3, ShieldCheck, Users } from "lucide-react";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearStoredUser, getStoredUser } from "@/lib/auth-session";

const stats = [
  { label: "Active emergency pools", value: "08", icon: ShieldCheck },
  { label: "Verified contributors", value: "1,284", icon: Users },
  { label: "Funds allocated (30d)", value: "$412K", icon: CircleDollarSign },
  { label: "Average response cycle", value: "5.7 hrs", icon: Clock3 },
];

const recentActivity = [
  { title: "Southeast Asia Flood Response", amount: "$42,000", time: "2 hours ago", status: "Processing" },
  { title: "Coastal Storm Reserve Update", amount: "$19,500", time: "Today", status: "Queued" },
  { title: "Partner Wallet Verification Batch", amount: "24 wallets", time: "Yesterday", status: "Completed" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
    navigate("/login", { replace: true });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNavbar user={user} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Operations dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Welcome back, {user.username ?? "User"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            This workspace gives your team a clear view of pool readiness, current allocations, and operational
            throughput.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="flex items-start justify-between gap-4 py-5">
                  <div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
                  </div>
                  <div className="inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon className="size-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="gap-1">
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest operational updates across allocation and verification workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {recentActivity.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{item.amount}</p>
                    <p className="text-xs text-slate-500">{item.status}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="gap-1">
                <CardTitle>Account snapshot</CardTitle>
                <CardDescription>Signed-in account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-6 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Name:</span> {user.username ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Email:</span> {user.email ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">User ID:</span> {user.user_id ?? "-"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-slate-900 text-slate-100 shadow-sm">
              <CardHeader className="gap-1">
                <CardTitle className="text-white">Next recommended actions</CardTitle>
                <CardDescription className="text-slate-300">Suggested setup priorities for this week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-6 text-sm text-slate-200">
                <p>1. Review allocation limits for high-risk regions.</p>
                <p>2. Complete wallet verification backlog.</p>
                <p>3. Export weekly donor impact summary.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
