"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  LogOutIcon,
  MenuIcon,
  LayoutDashboardIcon,
  Share2Icon,
  UploadIcon,
  CloudUpload,
  Repeat,
  Sparkles,
  XIcon,
} from "lucide-react";

const sidebarItems = [
  { href: "/home", icon: LayoutDashboardIcon, label: "Dashboard" },
  { href: "/compress-media", icon: UploadIcon, label: "Compress Media" },
  { href: "/resize-image", icon: Share2Icon, label: "Resize Image" },
  { href: "/convert", icon: Repeat, label: "Convert" },
];

const comingSoonItems = [
  { icon: Sparkles, label: "Usage & Quota" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-base-100">
      {/* ── Mobile overlay ─────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-base-200/80 border-r border-base-300/50
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* logo */}
        <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-base-300/40">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold"
          >
            <CloudUpload className="w-5 h-5 text-primary" />
            Cloud<span className="text-primary">Media</span>
          </Link>
          <button
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-widest opacity-40 mb-2">
            Tools
          </p>
          {sidebarItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-primary text-primary-content shadow-sm"
                      : "hover:bg-base-300/60"
                  }
                `}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* coming-soon section */}
          <div className="section-divider my-4" />
          <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-widest opacity-40 mb-2">
            Coming Soon
          </p>
          {comingSoonItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium opacity-30 cursor-default select-none"
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
              <span className="badge-soon ml-auto text-[0.6rem]">Soon</span>
            </div>
          ))}
        </nav>

        {/* user footer */}
        {user && (
          <div className="shrink-0 border-t border-base-300/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="w-9 h-9 rounded-full ring-2 ring-base-300">
                  <img
                    src={user.imageUrl}
                    alt={user.username || user.emailAddresses[0].emailAddress}
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {user.fullName || user.username || "User"}
                </p>
                <p className="text-xs opacity-50 truncate">
                  {user.emailAddresses[0].emailAddress}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="btn btn-ghost btn-sm w-full rounded-xl gap-2 justify-start font-medium"
            >
              <LogOutIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* top bar */}
        <header className="h-16 shrink-0 flex items-center gap-3 px-5 border-b border-base-300/40 bg-base-100">
          <button
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* free-tier placeholder pill */}
          <div className="ml-auto flex items-center gap-3">
            <div className="badge-soon hidden sm:inline-flex">
              Free Tier &middot; Unlimited (beta)
            </div>
            {user && (
              <div className="avatar lg:hidden">
                <div className="w-8 h-8 rounded-full">
                  <img
                    src={user.imageUrl}
                    alt=""
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-5 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}