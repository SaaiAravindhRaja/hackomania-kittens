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

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

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
      </main>

      <SiteFooter />
    </div>
  );
}
