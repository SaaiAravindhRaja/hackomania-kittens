import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import AuthShell from "@/components/auth-shell";
import { getStoredUser, setStoredUser } from "@/lib/auth-session";

const API_BASE = "/api";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseJsonSafe(response) {
  return response.json().catch(() => null);
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
        {label}
      </label>
      {children}
      <p className="min-h-[16px] text-xs text-red-400">{error || ""}</p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-emerald-500/70 focus:bg-slate-800 focus:outline-none";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authedUser = getStoredUser();
    if (authedUser) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!location.state?.registered) return;
    setValues((current) => ({
      ...current,
      email: location.state.email ?? current.email,
    }));
    setSuccessMsg("Account created — log in to continue.");
  }, [location.state]);

  const validate = () => {
    const e = {};
    if (!values.email.trim()) e.email = "Email is required.";
    else if (!emailPattern.test(values.email.trim())) e.email = "Enter a valid email address.";
    if (!values.password) e.password = "Password is required.";
    return e;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => { const n = { ...current }; delete n[name]; return n; });
    setGlobalError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        const msg = data?.error ?? "Login failed. Please try again.";
        if (res.status === 401) {
          setErrors({ email: " ", password: msg });
        } else if (res.status === 400 && msg.toLowerCase().includes("email")) {
          setErrors((c) => ({ ...c, email: msg }));
        } else if (res.status === 400 && msg.toLowerCase().includes("password")) {
          setErrors((c) => ({ ...c, password: msg }));
        }
        setGlobalError(msg);
        return;
      }

      setStoredUser(data.user);
      navigate("/", { replace: true });
    } catch {
      setGlobalError("Unable to reach server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="account login"
      title="Welcome back."
      description="Log in with your email and password."
      footerLabel="New here?"
      footerLinkLabel="Create an account"
      footerLinkTo="/register"
    >
      {successMsg && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-400">
          {successMsg}
        </div>
      )}
      {globalError && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {globalError}
        </div>
      )}

      <form className="space-y-1" onSubmit={handleSubmit} noValidate>
        <Field label="Email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
            className={inputCls}
          />
        </Field>

        <Field label="Password" error={errors.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={values.password}
            onChange={handleChange}
            className={inputCls}
          />
        </Field>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Log in"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
