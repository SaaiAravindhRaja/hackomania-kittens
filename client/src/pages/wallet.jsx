import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearStoredUser, getStoredUser, setStoredUser } from "@/lib/auth-session";

const API_BASE = "/api";
const walletPattern = /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._~-]+$/;

function parseJsonSafe(response) {
  return response.json().catch(() => null);
}

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
        setPendingPayouts(data.items || []);
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
        setStatus({
          variant: "destructive",
          title: "Wallet update failed",
          description: message,
        });
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
    const initialIds = pendingPayouts.map((item) => item.interactionId);
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
      setStatus({
        variant: "destructive",
        title: "No recipients selected",
        description: "Select at least one pending payout to approve.",
      });
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
        setStatus({
          variant: "destructive",
          title: "Unable to prepare approvals",
          description: data?.error ?? "Failed to prepare payout approvals.",
        });
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

      // Also refresh the pending list
      fetchPendingPayouts();
    } catch {
      setStatus({
        variant: "destructive",
        title: "Unable to reach server",
        description: "Please check your connection and try again.",
      });
    } finally {
      setApprovingPayouts(false);
    }
  };

  const handleRejectSelected = async () => {
    const interactionIds = [...new Set(selectedInteractionIds.filter(Boolean))];
    if (interactionIds.length === 0) {
      setStatus({
        variant: "destructive",
        title: "No recipients selected",
        description: "Select at least one pending payout to reject.",
      });
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
        setStatus({
          variant: "destructive",
          title: "Unable to reject payouts",
          description: data?.error ?? "Failed to reject selected payouts.",
        });
        return;
      }

      const rejectedInteractionIds = data?.rejectedInteractionIds ?? [];
      
      setSelectedInteractionIds((current) => current.filter((id) => !rejectedInteractionIds.includes(id)));
      setStatus({
        variant: "default",
        title: "Payouts rejected",
        description: `Rejected ${rejectedInteractionIds.length} payout(s).`,
      });

      fetchPendingPayouts();
    } catch {
      setStatus({
        variant: "destructive",
        title: "Unable to reach server",
        description: "Please check your connection and try again.",
      });
    } finally {
      setRejectingPayouts(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNavbar user={user} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Wallet settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Update your wallet address</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Keep your Interledger wallet up to date so donations and payouts can use the right account.
          </p>
        </section>

        {status && (
          <Alert
            variant={status.variant}
            className={status.variant === "default" ? "border-slate-200 bg-slate-50 text-slate-700" : ""}
          >
            <AlertTitle>{status.title}</AlertTitle>
            <AlertDescription>{status.description}</AlertDescription>
          </Alert>
        )}

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="gap-1">
            <CardTitle>Wallet details</CardTitle>
            <CardDescription>Update the wallet linked to your account.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <FormField>
                <Label htmlFor="walletAddress" className="text-slate-700">
                  Interledger wallet address
                </Label>
                <Input
                  id="walletAddress"
                  name="walletAddress"
                  value={walletAddress}
                  onChange={(event) => {
                    setWalletAddress(event.target.value);
                    setError("");
                  }}
                  placeholder="$ilp.interledger-test.dev/username"
                  aria-invalid={Boolean(error)}
                  aria-describedby="wallet-update-error"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
                />
                <FormMessage id="wallet-update-error">{error || " "}</FormMessage>
              </FormField>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={loading} className="h-11 rounded-xl px-5">
                  {loading ? "Updating wallet..." : "Update wallet"}
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Global Payout Approvals */}
        <Card className="border-slate-200 bg-white shadow-sm mt-6">
          <CardHeader className="gap-1">
            <CardTitle>Disaster payout approvals</CardTitle>
            <CardDescription>
              Manage pending payout requests triggered by events.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-800">Pending approvals:</span>{" "}
                    {fetchingPending ? "Loading..." : pendingPayouts.length}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchPendingPayouts}
                    disabled={fetchingPending}
                    className="h-8 rounded-lg px-3 text-xs"
                  >
                    Refresh
                  </Button>
                </div>

                {pendingPayouts.length > 0 && (
                  <div className="mt-4">
                    <Button type="button" onClick={openApprovalModal} className="h-9 rounded-lg px-4 text-sm w-full sm:w-auto">
                      Manage approvals in popup modal
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pending payout approvals</h2>
                <p className="text-sm text-slate-600">
                  Select one or more recipients, then approve or reject in one flow.
                </p>
              </div>
              <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={closeApprovalModal}>
                Close
              </Button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => setSelectedInteractionIds(pendingPayouts.map((item) => item.interactionId))}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => setSelectedInteractionIds([])}
              >
                Clear selection
              </Button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {pendingPayouts.map((item) => {
                const checked = selectedInteractionIds.includes(item.interactionId);
                return (
                  <label
                    key={item.interactionId}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInteractionSelection(item.interactionId)}
                      className="mt-1"
                    />
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{item?.username ?? "Recipient"} for {item?.eventTitle ?? "Event"}</p>
                      <p>
                        Amount: ${item?.amountDollars ?? "-"} | Stage: {item?.stage ?? "-"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleApproveSelected}
                disabled={approvingPayouts || rejectingPayouts}
                className="h-10 rounded-lg px-4 text-sm"
              >
                {approvingPayouts ? "Opening approvals..." : "Approve selected"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRejectSelected}
                disabled={approvingPayouts || rejectingPayouts}
                className="h-10 rounded-lg px-4 text-sm"
              >
                {rejectingPayouts ? "Rejecting..." : "Reject selected"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
