"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

interface NavbarProps {
  user: { name?: string | null; email?: string | null; role?: string };
}

const employeeLinks = [
  { href: "/dashboard", label: "Ana Sayfa" },
  { href: "/leave/new", label: "İzin Talebi" },
];

const managerLinks = [
  { href: "/dashboard", label: "Ana Sayfa" },
  { href: "/leave/new", label: "İzin Talebi" },
  { href: "/manager/dashboard", label: "Onaylar" },
  { href: "/manager/calendar", label: "Ekip Takvimi" },
];

function Initials({ name }: { name?: string | null }) {
  const init = name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
      style={{ background: "var(--primary)" }}
    >
      {init}
    </div>
  );
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const isManager = user.role === "MANAGER" || user.role === "HR_ADMIN";
  const links = isManager ? managerLinks : employeeLinks;
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "rgba(var(--surface-rgb, 255,255,255), 0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              İzin Portalı
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background: active ? "var(--primary-light)" : "transparent",
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Profile dropdown desktop */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-colors"
                style={{ background: profileOpen ? "var(--bg-secondary)" : "transparent" }}
              >
                <Initials name={user.name} />
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {user.name?.split(" ")[0]}
                </span>
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl p-1 z-20"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{user.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{user.email}</p>
                    </div>
                    <div className="divider mx-2 mb-1" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{ color: "var(--error)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--error-light)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hamburger mobile */}
            <button
              className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ color: "var(--text)" }}
            >
              <span
                className="block w-5 h-0.5 transition-all"
                style={{
                  background: "var(--text)",
                  transform: menuOpen ? "rotate(45deg) translate(3px, 4px)" : "none",
                }}
              />
              <span
                className="block w-5 h-0.5 transition-all"
                style={{
                  background: "var(--text)",
                  opacity: menuOpen ? 0 : 1,
                }}
              />
              <span
                className="block w-5 h-0.5 transition-all"
                style={{
                  background: "var(--text)",
                  transform: menuOpen ? "rotate(-45deg) translate(3px, -4px)" : "none",
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="nav-overlay md:hidden" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed top-14 inset-x-0 z-40 md:hidden rounded-b-2xl overflow-hidden"
            style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
          >
            <nav className="p-3 space-y-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium"
                    style={{
                      background: active ? "var(--primary-light)" : "transparent",
                      color: active ? "var(--primary)" : "var(--text)",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="divider" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Initials name={user.name} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{user.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm font-medium"
                style={{ color: "var(--error)" }}
              >
                Çıkış
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
