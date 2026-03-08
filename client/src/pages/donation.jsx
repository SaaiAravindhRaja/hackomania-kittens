import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { clearStoredUser, getStoredUser } from "@/lib/auth-session";

function parseJsonSafe(response) {
  return response.json().catch(() => null);
}

function parseAmountToCents(amountText) {
  const normalized = String(amountText ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function recalculatePayoutSummary(results) {
  const successCount = results.filter((item) => item?.success).length;
  const pendingCount = results.filter((item) => item?.pending).length;
  const failureCount = results.length - successCount - pendingCount;
  const totalPayoutCents = results
    .filter((item) => item?.success)
    .reduce((total, item) => total + Number(item?.paymentCents ?? 0), 0);

  return {
    successCount,
    pendingCount,
    failureCount,
    totalPayoutCents,
    totalPayoutDollars: (totalPayoutCents / 100).toFixed(2),
  };
}

const inputCls =
  "w-full rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-emerald-500/70 focus:bg-slate-800 focus:outline-none";

export default function Donation() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [amount, setAmount] = useState("50.00");
  const [walletAddress, setWalletAddress] = useState(() => String(getStoredUser()?.wallet_address ?? ""));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [triggeringPayout, setTriggeringPayout] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (user?.wallet_address) {
      setWalletAddress(user.wallet_address);
    }
  }, [user]);

  const amountCents = useMemo(() => parseAmountToCents(amount), [amount]);

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const handleDonationSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!walletAddress.trim()) {
      nextErrors.walletAddress = "Wallet address is required.";
    }

    if (!amountCents) {
      nextErrors.amount = "Enter a valid donation amount.";
    }

    setErrors(nextErrors);
    setStatus(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!user?.user_id || !user?.email) {
      setStatus({
        variant: "destructive",
        title: "Session is missing account details",
        description: "Please log in again before starting a donation.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/payments/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          walletAddress: walletAddress.trim(),
          userId: user.user_id,
          userEmail: user.email,
        }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        const message = data?.error ?? "Unable to start donation.";
        setStatus({ variant: "destructive", title: "Donation could not start", description: message });
        return;
      }

      if (!data?.redirectUrl) {
        setStatus({ variant: "destructive", title: "Donation could not start", description: "Missing authorization redirect URL from server." });
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch {
      setStatus({ variant: "destructive", title: "Unable to reach server", description: "Please check your connection and try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerTestPayouts = async () => {
    setStatus(null);
    setPayoutResult(null);
    setTriggeringPayout(true);

    try {
      const res = await fetch("/epicentre/trigger-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test" }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setStatus({ variant: "destructive", title: "Payout trigger failed", description: data?.error ?? "Unable to trigger payouts." });
        return;
      }

      setPayoutResult(data);
      const pendingCount = Number(data?.payoutSummary?.pendingCount ?? 0);
      setStatus({
        variant: "default",
        title: "Disaster payout run completed",
        description:
          pendingCount > 0
            ? `Processed ${data?.affectedCount ?? 0} eligible recipients. ${pendingCount} payout(s) need approval.`
            : `Processed ${data?.affectedCount ?? 0} eligible recipients.`,
      });

      if (pendingCount > 0) {
        // Payout approvals are now handled in the Wallet tab
      }
    } catch {
      setStatus({ variant: "destructive", title: "Unable to reach server", description: "Please check your connection and try again." });
    } finally {
      setTriggeringPayout(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#070a0d] text-white">
      <SiteNavbar user={user} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-6">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Donation operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Create a donation</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Donations use your registered Interledger wallet and route funds to the Kitten Disaster Fund.
          </p>
        </section>

        {/* Status alert */}
        {status && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status.variant === "destructive"
                ? "border-red-800/60 bg-red-950/40 text-red-300"
                : "border-emerald-800/40 bg-emerald-500/[0.06] text-emerald-400"
            }`}
          >
            <p className="font-semibold">{status.title}</p>
            <p className="mt-0.5 text-xs opacity-80">{status.description}</p>
          </div>
        )}

        {/* Donation form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Donation details</h2>
            <p className="mt-0.5 text-sm text-slate-500">Authorize an outgoing payment from your wallet.</p>
          </div>
          <div className="p-6">
            <form className="space-y-4" onSubmit={handleDonationSubmit} noValidate>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
                  Donor wallet address (linked account wallet)
                </label>
                <input
                  id="walletAddress"
                  name="walletAddress"
                  value={walletAddress}
                  readOnly
                  placeholder="$ilp.interledger-test.dev/username"
                  className={`${inputCls} cursor-not-allowed opacity-70`}
                />
                <p className="min-h-[16px] text-xs text-red-400">{errors.walletAddress ?? " "}</p>
                <p className="text-xs text-slate-600">Need to change it? Use the wallet page.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
                  Amount (USD)
                </label>
                <input
                  id="amount"
                  name="amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setErrors((current) => ({ ...current, amount: undefined }));
                  }}
                  placeholder="50.00"
                  className={inputCls}
                />
                <p className="min-h-[16px] text-xs text-red-400">{errors.amount ?? " "}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Starting donation..." : "Authorize donation"}
                </button>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white"
                >
                  Back to dashboard
                </Link>
                <Link
                  to="/wallet"
                  className="flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white"
                >
                  Update wallet
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Disaster trigger */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Disaster trigger (test event)</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Runs existing affected-recipient selection and payout execution for the built-in test disaster.
            </p>
          </div>
          <div className="space-y-3 p-6">
            <button
              type="button"
              onClick={handleTriggerTestPayouts}
              disabled={triggeringPayout}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {triggeringPayout ? "Running payouts..." : "Trigger test disaster payouts"}
            </button>

            {payoutResult && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 text-sm">
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-200">Event:</span> {payoutResult?.event?.title ?? "-"}
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Eligible recipients:</span> {payoutResult?.affectedCount ?? 0}
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Successful payouts:</span>{" "}
                  {payoutResult?.payoutSummary?.successCount ?? 0}
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Failed payouts:</span>{" "}
                  {payoutResult?.payoutSummary?.failureCount ?? 0}
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Pending approvals:</span>{" "}
                  {payoutResult?.payoutSummary?.pendingCount ?? 0}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
