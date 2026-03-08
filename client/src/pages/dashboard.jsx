import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleDollarSign, Clock3, ShieldCheck, Users } from "lucide-react";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
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
    <div className="min-h-screen bg-[#070a0d] text-white">
      <SiteNavbar user={user} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome header */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-6">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Operations dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Welcome back, {user.username ?? "User"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            This workspace gives your team a clear view of pool readiness, current allocations, and operational
            throughput.
          </p>
        </section>

        {/* Stats grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                  <div className="inline-flex size-9 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                    <Icon className="size-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Activity + Account */}
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Recent activity */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-base font-semibold text-white">Recent activity</h2>
              <p className="mt-0.5 text-sm text-slate-500">Latest operational updates across allocation and verification workflows.</p>
            </div>
            <div className="space-y-3 p-6">
              {recentActivity.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-200">{item.amount}</p>
                    <p className="text-xs text-slate-500">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account snapshot */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-base font-semibold text-white">Account snapshot</h2>
              <p className="mt-0.5 text-sm text-slate-500">Signed-in account details</p>
            </div>
            <div className="space-y-2 p-6 text-sm text-slate-400">
              <p>
                <span className="font-semibold text-slate-200">Name:</span> {user.username ?? "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-200">Email:</span> {user.email ?? "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-200">User ID:</span> {user.user_id ?? "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-200">Wallet:</span>{" "}
                <span className="font-mono text-xs">{user.wallet_address ?? "-"}</span>
              </p>
              <div className="pt-2">
                <Link
                  to="/wallet"
                  className="flex w-full items-center justify-center rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white"
                >
                  Manage wallet
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
