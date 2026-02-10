import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { CloudUpload, ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* ── Top bar ─────────────────────────────────────── */}
      <nav className="glass-pane sticky top-0 z-50 border-b border-base-300/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <CloudUpload className="w-5 h-5 text-primary" />
            Cloud<span className="text-primary">Media</span>
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm rounded-xl gap-1.5 font-medium">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
        </div>
      </nav>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* heading */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-base opacity-60">
              Sign in to access your private media dashboard
            </p>
          </div>

          {/* clerk card */}
          <div className="rounded-2xl border border-base-300/60 bg-base-200/40 p-6 sm:p-8 shadow-lg">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none w-full bg-transparent",
                },
              }}
            />
          </div>

          <p className="text-center text-sm opacity-50">
            No account yet?{" "}
            <Link href="/sign-up" className="font-semibold text-primary hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
