import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthShell from "@/components/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = "/api";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*\d).{8,}$/;
const postalCodePattern = /^[0-9A-Za-z\s\-]{3,10}$/;
const walletPattern = /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._~-]+$/;

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    country: "",
    postalcode: "",
    walletAddress: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = "Name is required.";
    } else if (values.name.trim().length < 2) {
      nextErrors.name = "Name must be at least 2 characters.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.country.trim()) {
      nextErrors.country = "Country is required.";
    }

    if (!values.postalcode.trim()) {
      nextErrors.postalcode = "Postal code is required.";
    } else if (!postalCodePattern.test(values.postalcode)) {
      nextErrors.postalcode = "Enter a valid postal code.";
    }

    if (!values.walletAddress.trim()) {
      nextErrors.walletAddress = "Wallet address is required.";
    } else if (!walletPattern.test(values.walletAddress)) {
      nextErrors.walletAddress = "Enter a valid Interledger wallet address (e.g. $ilp.interledger-test.dev/username).";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (!passwordPattern.test(values.password)) {
      nextErrors.password = "Use at least 8 characters and include one number.";
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  };

  const clearFieldError = (name) => {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
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
        title: "Please review your details",
        description: "There are validation issues in the form.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.name,
          email: values.email,
          password: values.password,
          country: values.country,
          postalcode: values.postalcode,
          walletAddress: values.walletAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          variant: "destructive",
          title: "Registration failed",
          description: data.error ?? "Something went wrong.",
        });
        return;
      }

      // Account created and redirection to login
      navigate("/login", {
        state: { registered: true, email: values.email },
      });
    } catch (err) {
      setStatus({
        variant: "destructive",
        title: "Something went wrong",
        description: "Could not reach the server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="account onboarding"
      title="Create your account"
      description="Set up secure access to your Kitten Finance workspace."
      footerLabel="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
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
          <Label htmlFor="name" className="text-slate-700">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Alex Morgan"
            value={values.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby="register-name-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-name-error">{errors.name ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="email" className="text-slate-700">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={values.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="register-email-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-email-error">{errors.email ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="country" className="text-slate-700">Country</Label>
          <Input
            id="country"
            name="country"
            autoComplete="country-name"
            placeholder="Singapore"
            value={values.country}
            onChange={handleChange}
            aria-invalid={Boolean(errors.country)}
            aria-describedby="register-country-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-country-error">{errors.country ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="postalcode" className="text-slate-700">Postal code</Label>
          <Input
            id="postalcode"
            name="postalcode"
            autoComplete="postal-code"
            placeholder="123456"
            value={values.postalcode}
            onChange={handleChange}
            aria-invalid={Boolean(errors.postalcode)}
            aria-describedby="register-postalcode-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-postalcode-error">{errors.postalcode ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="walletAddress" className="text-slate-700">Interledger Wallet Address</Label>
          <Input
            id="walletAddress"
            name="walletAddress"
            autoComplete="off"
            placeholder="$ilp.interledger-test.dev/username"
            value={values.walletAddress}
            onChange={handleChange}
            aria-invalid={Boolean(errors.walletAddress)}
            aria-describedby="register-wallet-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-wallet-error">{errors.walletAddress ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="password" className="text-slate-700">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="register-password-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-password-error">{errors.password ?? " "}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="confirmPassword" className="text-slate-700">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={values.confirmPassword}
            onChange={handleChange}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby="register-confirm-password-error"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage id="register-confirm-password-error">{errors.confirmPassword ?? " "}</FormMessage>
        </FormField>

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
          {loading ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs text-slate-500">
          By creating an account, you agree to your team security and access policies.
        </p>
      </Form>
    </AuthShell>
  );
}