"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Registration failed. Please try again.")
      } else {
        setSuccess("Account created! Redirecting to sign in…")
        setTimeout(() => router.push("/sign-in"), 1500)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-[100dvh] bg-[#020617] overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute left-[50%] top-[60%] h-[30%] w-[30%] rounded-full bg-violet-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col pt-16 px-4 pb-8">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[440px] flex flex-col items-center">

            {/* Brand header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none text-blue-400">
                  System Active
                </span>
              </div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
                Real-Time Topic Tracker
              </h1>
              <p className="text-sm text-slate-400">
                Alert Intelligence &amp; Monitoring System v2.0
              </p>
            </div>

            {/* Card */}
            <div className="w-full">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-md">
                <h2 className="text-xl font-semibold text-white mb-1">Create an account</h2>
                <p className="text-sm text-slate-400 mb-6">Start tracking topics in real-time</p>

                {/* Error banner */}
                {error && (
                  <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                    {error}
                  </div>
                )}

                {/* Success banner */}
                {success && (
                  <div className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400 border border-emerald-500/20">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="name">
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Jane Smith"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="signup-email">
                      Email address
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="you@example.com"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="signup-password">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Min. 6 characters"
                    />
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="confirm-password">
                      Confirm password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Re-enter your password"
                    />
                  </div>

                  <button
                    type="submit"
                    id="signup-submit"
                    disabled={isLoading}
                    className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                  >
                    {isLoading ? "Creating account…" : "Create account"}
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-800 pt-6 text-center">
                  <p className="text-sm text-slate-400">
                    Already have an account?{" "}
                    <Link
                      href="/sign-in"
                      className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
