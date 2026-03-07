import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AuthShell from "@/components/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredUser, setStoredUser } from "@/lib/auth-session";

const API_BASE = "/api";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseJsonSafe(response) {
  return response.json().catch(() => null);
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
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
    setStatus({
      variant: "default",
      title: "Account created",
      description: "Your account is ready. Log in to continue.",
    });
  }, [location.state]);

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const clearFieldError = (name) => {
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    clearFieldError(name);
    setStatus(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus({
        variant: "destructive",
        title: "Unable to sign in",
        description: "Fix the highlighted fields and try again.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
        }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        const errorMessage = data?.error ?? "Login failed. Please try again.";

        if (res.status === 401) {
          setErrors({
            email: " ",
            password: errorMessage,
          });
        } else if (res.status === 400 && errorMessage.toLowerCase().includes("email")) {
          setErrors((current) => ({ ...current, email: errorMessage }));
        } else if (res.status === 400 && errorMessage.toLowerCase().includes("password")) {
          setErrors((current) => ({ ...current, password: errorMessage }));
        }

        setStatus({
          variant: "destructive",
          title: "Login failed",
          description: errorMessage,
        });
        return;
      }

      setStoredUser(data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setStatus({
        variant: "destructive",
        title: "Unable to reach server",
        description: "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="account login"
      title="Log in to Kitten Finance"
      description="Use your registered email and password to access operational dashboards."
      footerLabel="New to Kitten Finance?"
      footerLinkLabel="Create an account"
      footerLinkTo="/register"
    >
      {status && (
        <Alert
          variant={status.variant}
          className={status.variant === "default" ? "border-slate-200 bg-slate-50 text-slate-700" : ""}
        >
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.description}</AlertDescription>
        </Alert>
      )}

      <Form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField>
          <Label htmlFor="email" className="text-slate-700">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={values.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="login-email-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="login-email-error">{errors.email ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="password" className="text-slate-700">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="login-password-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="login-password-error">{errors.password ?? " "}</FormMessage>
        </FormField>

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </Form>
    </AuthShell>
  );
}
