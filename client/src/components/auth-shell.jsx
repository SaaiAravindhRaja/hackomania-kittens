import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearStoredUser, getStoredUser } from "@/lib/auth-session";

const highlights = [
  { icon: ShieldCheck, text: "Verification-first account onboarding" },
  { icon: LockKeyhole, text: "Secure access for finance operations teams" },
  { icon: CheckCircle2, text: "Clear records for trust and accountability" },
];

export default function AuthShell({
  title,
  description,
  eyebrow = "secure access",
  footerLabel,
  footerLinkLabel,
  footerLinkTo,
  children,
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteNavbar user={user} onLogout={handleLogout} />

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <section className="hidden rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-sm lg:block">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Kitten Finance Platform</p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-slate-900">
            Manage trusted donation and relief workflows from one secure workspace.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
            Built for teams that need clear accountability, structured operational controls, and readiness when response
            funding needs to move quickly.
          </p>

          <div className="mt-8 space-y-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="inline-flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon className="size-4" />
                  </div>
                  <p className="pt-1 text-sm text-slate-700">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <Card className="border-slate-200/90 bg-white shadow-xl shadow-slate-900/5">
            <CardHeader className="gap-2 border-b border-slate-100 pb-5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">{eyebrow}</p>
              <CardTitle className="text-2xl tracking-tight text-slate-900">{title}</CardTitle>
              <CardDescription className="text-slate-500">{description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {children}
              <p className="text-center text-sm text-slate-500">
                {footerLabel}{" "}
                <Link to={footerLinkTo} className="font-semibold text-slate-800 transition-colors hover:text-slate-900">
                  {footerLinkLabel}
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
