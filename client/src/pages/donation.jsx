import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        setStatus({
          variant: "destructive",
          title: "Donation could not start",
          description: message,
        });
        return;
      }

      if (!data?.redirectUrl) {
        setStatus({
          variant: "destructive",
          title: "Donation could not start",
          description: "Missing authorization redirect URL from server.",
        });
        return;
      }

      window.location.assign(data.redirectUrl);
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
        setStatus({
          variant: "destructive",
          title: "Payout trigger failed",
          description: data?.error ?? "Unable to trigger payouts.",
        });
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
      setStatus({
        variant: "destructive",
        title: "Unable to reach server",
        description: "Please check your connection and try again.",
      });
    } finally {
      setTriggeringPayout(false);
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
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Donation operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Create a donation</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Donations use your registered Interledger wallet and route funds to the Kitten Disaster Fund.
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
            <CardTitle>Donation details</CardTitle>
            <CardDescription>Authorize an outgoing payment from your wallet.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Form className="space-y-4" onSubmit={handleDonationSubmit} noValidate>
              <FormField>
                <Label htmlFor="walletAddress" className="text-slate-700">
                  Donor wallet address (linked account wallet)
                </Label>
                <Input
                  id="walletAddress"
                  name="walletAddress"
                  value={walletAddress}
                  readOnly
                  placeholder="$ilp.interledger-test.dev/username"
                  aria-invalid={Boolean(errors.walletAddress)}
                  aria-describedby="donation-wallet-error"
                  className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-700 shadow-none"
                />
                <FormMessage id="donation-wallet-error">{errors.walletAddress ?? " "}</FormMessage>
                <p className="text-xs text-slate-500">Need to change it? Use the wallet page.</p>
              </FormField>

              <FormField>
                <Label htmlFor="amount" className="text-slate-700">
                  Amount (USD)
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setErrors((current) => ({ ...current, amount: undefined }));
                  }}
                  placeholder="50.00"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby="donation-amount-error"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
                />
                <FormMessage id="donation-amount-error">{errors.amount ?? " "}</FormMessage>
              </FormField>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={loading} className="h-11 rounded-xl px-5">
                  {loading ? "Starting donation..." : "Authorize donation"}
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                  <Link to="/wallet">Update wallet</Link>
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="gap-1">
            <CardTitle>Disaster trigger (test event)</CardTitle>
            <CardDescription>
              Runs existing affected-recipient selection and payout execution for the built-in test disaster.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-6 text-sm text-slate-600">
            <Button
              type="button"
              variant="outline"
              onClick={handleTriggerTestPayouts}
              disabled={triggeringPayout}
              className="h-10 rounded-xl"
            >
              {triggeringPayout ? "Running payouts..." : "Trigger test disaster payouts"}
            </Button>

            {payoutResult && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p>
                  <span className="font-semibold text-slate-800">Event:</span> {payoutResult?.event?.title ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Eligible recipients:</span> {payoutResult?.affectedCount ?? 0}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Successful payouts:</span>{" "}
                  {payoutResult?.payoutSummary?.successCount ?? 0}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Failed payouts:</span>{" "}
                  {payoutResult?.payoutSummary?.failureCount ?? 0}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Pending approvals:</span>{" "}
                  {payoutResult?.payoutSummary?.pendingCount ?? 0}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
