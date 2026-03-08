import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const baseLinkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white";
const activeLinkClass = "bg-slate-800/60 text-white";

function navClass({ isActive }) {
  return `${baseLinkClass} ${isActive ? activeLinkClass : ""}`;
}

function NavbarActions({ user, onLogout, mobile = false, closeMenu }) {
  if (user) {
    return (
      <div className={`flex ${mobile ? "flex-col items-stretch" : "items-center"} gap-2`}>
        <div className={`rounded-md border border-slate-700/60 px-3 py-2 text-sm text-slate-400 ${mobile ? "" : "hidden md:block"}`}>
          Signed in as <span className="font-semibold text-slate-200">{user.username ?? "User"}</span>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            closeMenu?.();
            onLogout?.();
          }}
          className={mobile ? "h-10 w-full justify-center" : "h-9"}
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex ${mobile ? "flex-col items-stretch" : "items-center"} gap-2`}>
      <Button asChild variant="ghost" className={mobile ? "h-10 w-full justify-center" : "h-9"}>
        <Link to="/login" onClick={closeMenu}>
          Log in
        </Link>
      </Button>
      <Button asChild className={mobile ? "h-10 w-full justify-center" : "h-9"}>
        <Link to="/register" onClick={closeMenu}>
          Create account
        </Link>
      </Button>
    </div>
  );
}

export default function SiteNavbar({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-sm font-semibold tracking-[0.14em] text-white uppercase"
          onClick={closeMenu}
        >
          Kitten Finance
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/donation" className={navClass}>
            Donation
          </NavLink>
          <NavLink to="/wallet" className={navClass}>
            Wallet
          </NavLink>
        </nav>

        <div className="hidden md:block">
          <NavbarActions user={user} onLogout={onLogout} />
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 md:hidden sm:px-6">
          <div className="space-y-2">
            <NavLink to="/" end className={navClass} onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navClass} onClick={closeMenu}>
              Dashboard
            </NavLink>
            <NavLink to="/donation" className={navClass} onClick={closeMenu}>
              Donation
            </NavLink>
            <NavLink to="/wallet" className={navClass} onClick={closeMenu}>
              Wallet
            </NavLink>
          </div>
          <div className="mt-4">
            <NavbarActions user={user} onLogout={onLogout} mobile closeMenu={closeMenu} />
          </div>
        </div>
      )}
    </header>
  );
}
