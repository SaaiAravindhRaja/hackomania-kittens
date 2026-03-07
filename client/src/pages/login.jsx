import React, { useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "@/components/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [values, setValues] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
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

  const handleSubmit = (event) => {
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

    setStatus({
      variant: "default",
      title: "Form validated",
      description: "Connect your auth API to complete login.",
    });
  };

  return (
    <AuthShell
      eyebrow="account login"
      title="Log in to Kitten Finance"
      description="Use your email and password to access your workspace."
      footerLabel="New to Kitten Finance?"
      footerLinkLabel="Create an account"
      footerLinkTo="/register"
    >
      {status && (
        <Alert variant={status.variant} className={status.variant === "default" ? "border-slate-200 bg-slate-50 text-slate-700" : ""}>
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

        <div className="-mt-1 flex justify-end">
          <Link to="/login" className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="h-11 w-full rounded-xl">
          Log in
        </Button>
      </Form>
    </AuthShell>
  );
}
