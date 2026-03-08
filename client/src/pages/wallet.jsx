import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { clearStoredUser, getStoredUser, setStoredUser } from "@/lib/auth-session";

const API_BASE = "/api";
const walletPattern = /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._~-]+$/;

function parseJsonSafe(response) {
  return response.json().catch(() => null);
}

const inputCls =
  "w-full rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-emerald-500/70 focus:bg-slate-800 focus:outline-none";

export default function WalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [walletAddress, setWalletAddress] = useState(() => String(getStoredUser()?.wallet_address ?? ""));
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [fetchingPending, setFetchingPending] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedInteractionIds, setSelectedInteractionIds] = useState([]);
  const [approvingPayouts, setApprovingPayouts] = useState(false);
  const [rejectingPayouts, setRejectingPayouts] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    } else {
      fetchPendingPayouts();
    }
  }, [navigate, user]);

  const fetchPendingPayouts = async () => {
    setFetchingPending(true);
    try {
      const response = await fetch("/payments/payout-pending");
      const data = await parseJsonSafe(response);
      if (response.ok && data?.success) {
        setPendingPayouts(data.items.filter(item => item.userId === user?.user_id) || []);
      }
    } catch (e) {
      console.error("Failed to fetch pending payouts", e);
    } finally {
      setFetchingPending(false);
    }
  };

  useEffect(() => {
    setWalletAddress(String(user?.wallet_address ?? ""));
  }, [user?.wallet_address]);

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedWallet = walletAddress.trim();
    setError("");
    setStatus(null);

    if (!trimmedWallet) {
      setError("Wallet address is required.");
      return;
    }

    if (!walletPattern.test(trimmedWallet)) {
      setError("Enter a valid Interledger wallet address (e.g. $ilp.interledger-test.dev/username).");
      return;
    }

    if (!user?.user_id || !user?.email) {
      setStatus({
        variant: "destructive",
        title: "Session is missing account details",
        description: "Please log in again before updating your wallet.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/wallet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.user_id,
          email: user.email,
          walletAddress: trimmedWallet,
        }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        const message = data?.error ?? "Unable to update wallet.";
        if (message.toLowerCase().includes("wallet")) {
          setError(message);
        }
        setStatus({ variant: "destructive", title: "Wallet update failed", description: message });
        return;
      }

      const updatedUser = {
        ...user,
        ...(data?.user ?? {}),
        wallet_address: trimmedWallet,
      };
      setStoredUser(updatedUser);
      setUser(updatedUser);
      setStatus({
        variant: "default",
        title: "Wallet updated",
        description: data?.message ?? "Your wallet address has been updated successfully.",
      });
    } catch {
      setStatus({
        variant: "destructive",
        title: "Unable to reach server",
        description: "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = () => {
    const initialIds = pendingPayouts
      .filter((item) => item?.userId === user?.user_id || item?.recipientWalletAddress === walletAddress)
      .map((item) => item.interactionId);
    setSelectedInteractionIds(initialIds);
    setApprovalModalOpen(true);
  };

  const closeApprovalModal = () => {
    if (approvingPayouts || rejectingPayouts) {
      return;
    }
    setApprovalModalOpen(false);
    fetchPendingPayouts();
  };

  const toggleInteractionSelection = (interactionId) => {
    setSelectedInteractionIds((current) => {
      if (current.includes(interactionId)) {
        return current.filter((item) => item !== interactionId);
      }
      return [...current, interactionId];
    });
  };

  const handleApproveSelected = async () => {
    const interactionIds = [...new Set(selectedInteractionIds.filter(Boolean))];
    if (interactionIds.length === 0) {
      setStatus({ variant: "destructive", title: "No recipients selected", description: "Select at least one pending payout to approve." });
      return;
    }

    setApprovingPayouts(true);
    setStatus(null);
    try {
      const response = await fetch("/payments/payout-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionIds }),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok) {
        setStatus({ variant: "destructive", title: "Unable to prepare approvals", description: data?.error ?? "Failed to prepare payout approvals." });
        return;
      }

      const readyItems = (data?.results ?? []).filter((item) => item?.status === "pending");
      let openedCount = 0;
      let blockedCount = 0;

      for (const item of readyItems) {
        const popupUrl = String(item?.popupUrl ?? item?.approvalUrl ?? "").trim();
        if (!popupUrl) continue;
        const popupWindow = window.open(popupUrl, "_blank", "popup=yes,width=540,height=760");
        if (popupWindow) {
          openedCount += 1;
        } else {
          blockedCount += 1;
        }
      }

      setStatus({
        variant: blockedCount > 0 ? "destructive" : "default",
        title: blockedCount > 0 ? "Some popups were blocked" : "Approval popups opened",
        description:
          blockedCount > 0
            ? `Opened ${openedCount} approval popup(s). ${blockedCount} were blocked by the browser. Return here once approvals are finalized to refresh the list.`
            : `Opened ${openedCount} approval popup(s). Return here once approvals are finalized to refresh the list.`,
      });

      fetchPendingPayouts();
    } catch {
      setStatus({ variant: "destructive", title: "Unable to reach server", description: "Please check your connection and try again." });
    } finally {
      setApprovingPayouts(false);
    }
  };

  const handleRejectSelected = async () => {
    const interactionIds = [...new Set(selectedInteractionIds.filter(Boolean))];
    if (interactionIds.length === 0) {
      setStatus({ variant: "destructive", title: "No recipients selected", description: "Select at least one pending payout to reject." });
      return;
    }

    setRejectingPayouts(true);
    setStatus(null);
    try {
      const response = await fetch("/payments/payout-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionIds }),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok) {
        setStatus({ variant: "destructive", title: "Unable to reject payouts", description: data?.error ?? "Failed to reject selected payouts." });
        return;
      }

      const rejectedInteractionIds = data?.rejectedInteractionIds ?? [];
      setSelectedInteractionIds((current) => current.filter((id) => !rejectedInteractionIds.includes(id)));
      setStatus({ variant: "default", title: "Payouts rejected", description: `Rejected ${rejectedInteractionIds.length} payout(s).` });

      fetchPendingPayouts();
    } catch {
      setStatus({ variant: "destructive", title: "Unable to reach server", description: "Please check your connection and try again." });
    } finally {
      setRejectingPayouts(false);
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
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Wallet settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Update your wallet address</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Keep your Interledger wallet up to date so donations and payouts can use the right account.
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

        {/* Wallet form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Wallet details</h2>
            <p className="mt-0.5 text-sm text-slate-500">Update the wallet linked to your account.</p>
          </div>
          <div className="p-6">
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
                  Interledger wallet address
                </label>
                <input
                  id="walletAddress"
                  name="walletAddress"
                  value={walletAddress}
                  onChange={(event) => {
                    setWalletAddress(event.target.value);
                    setError("");
                  }}
                  placeholder="$ilp.interledger-test.dev/username"
                  className={inputCls}
                />
                <p className="min-h-[16px] text-xs text-red-400">{error || " "}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating wallet..." : "Update wallet"}
                </button>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-white"
                >
                  Back to dashboard
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Payout approvals */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Disaster payout approvals</h2>
            <p className="mt-0.5 text-sm text-slate-500">Manage pending payout requests triggered by events.</p>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  <span className="font-semibold text-slate-200">Pending approvals:</span>{" "}
                  {fetchingPending ? "Loading..." : pendingPayouts.length}
                </p>
                <button
                  type="button"
                  onClick={fetchPendingPayouts}
                  disabled={fetchingPending}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>

              {pendingPayouts.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openApprovalModal}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500 sm:w-auto"
                  >
                    Manage approvals in popup modal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Approval modal */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Pending payout approvals</h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  Select one or more of your own pending payouts to approve or reject.
                </p>
              </div>
              <button
                type="button"
                onClick={closeApprovalModal}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedInteractionIds(
                  pendingPayouts
                    .filter((item) => item?.userId === user?.user_id || item?.recipientWalletAddress === walletAddress)
                    .map((item) => item.interactionId)
                )}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedInteractionIds([])}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                Clear selection
              </button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {pendingPayouts.map((item) => {
                const isOwnPayout = item?.userId === user?.user_id || item?.recipientWalletAddress === walletAddress;
                if (!isOwnPayout) return null;
                const checked = selectedInteractionIds.includes(item.interactionId);
                return (
                  <button
                    key={item.interactionId}
                    type="button"
                    onClick={() => toggleInteractionSelection(item.interactionId)}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                      checked
                        ? "border-emerald-600 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${checked ? "border-emerald-500 bg-emerald-500" : "border-slate-600 bg-slate-800"}`}>
                      {checked && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div className="text-sm">
                      <p className={`font-semibold ${checked ? "text-emerald-300" : "text-slate-200"}`}>
                        {item?.username ?? "Recipient"} for {item?.eventTitle ?? "Event"}
                      </p>
                      <p className={checked ? "text-emerald-400/80" : "text-slate-500"}>
                        Amount: ${item?.amountDollars ?? "-"} | Stage: {item?.stage ?? "-"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApproveSelected}
                disabled={approvingPayouts || rejectingPayouts}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approvingPayouts ? "Opening approvals..." : "Approve selected"}
              </button>
              <button
                type="button"
                onClick={handleRejectSelected}
                disabled={approvingPayouts || rejectingPayouts}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-60"
              >
                {rejectingPayouts ? "Rejecting..." : "Reject selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
