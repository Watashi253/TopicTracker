"use client"

import Link from "next/link";
import { useUser } from "@clerk/nextjs"
import {
  Bell,
  Brain,
  Globe,
  Layers3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Webhook,
} from "lucide-react";

const stats = [
  { label: "Live sources", value: "News + Social" },
  { label: "Core signal", value: "Relevance + Recency" },
  { label: "Delivery", value: "WebSocket + Email" },
];

const features = [
  {
    icon: Globe,
    title: "Cross-source topic tracking",
    description:
      "Monitor news portals, blogs, and social streams from one clean dashboard.",
  },
  {
    icon: Brain,
    title: "Smart deduplication",
    description:
      "Reduce repeated articles with semantic similarity and clustered results.",
  },
  {
    icon: TrendingUp,
    title: "Timeline-based evolution",
    description:
      "Visualize how a topic changes over time as new updates arrive.",
  },
  {
    icon: Bell,
    title: "Instant alerts",
    description:
      "Push new updates to users in real time without manual refresh.",
  },
  {
    icon: ShieldCheck,
    title: "Credibility-aware ranking",
    description:
      "Prioritize reliable sources and recent updates for better search quality.",
  },
  {
    icon: Webhook,
    title: "Personalized subscriptions",
    description:
      "Let users track multiple topics with their own alert preferences.",
  },
];

const flow = [
  "User searches a topic from the frontend.",
  "API Gateway fetches and coordinates results from the backend services.",
  "Clean articles, summaries, and clusters are returned to the dashboard.",
  "New updates are pushed instantly through WebSockets.",
];

export default function Home() {
  const { isSignedIn } = useUser()
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(to_bottom,#020617,#0f172a_55%,#111827)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-blue-500/10 backdrop-blur">
              <Sparkles className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-sky-200">
                Real-Time Topic Tracking
              </p>
              <p className="text-xs text-slate-400">
                Alert Intelligence System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isSignedIn && (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-sky-300"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-2 lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200 backdrop-blur">
              <Layers3 className="h-4 w-4" />
              Microservice-based alert intelligence platform
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Track what matters.
              <span className="block bg-gradient-to-r from-sky-300 via-cyan-200 to-white bg-clip-text text-transparent">
                Catch new updates instantly.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
              Search a topic once, then let the system continuously monitor
              trusted sources, remove duplicates, rank relevance, summarize
              updates, and notify users in real time.
            </p>

            <div className="mt-8 flex gap-4">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200"
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/sign-in"
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-sky-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-slate-400">Live topic feed</p>
                  <h2 className="text-xl font-semibold">AI regulation</h2>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  Live updates
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">
                      New article detected
                    </p>
                    <span className="text-xs text-slate-400">2 min ago</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    A fresh article was ingested, ranked by relevance, and
                    clustered with the current topic timeline.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Source credibility
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      0.92
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Trusted source, high-confidence update.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Cluster size
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">14</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Similar articles grouped into one topic view.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                  <p className="text-sm font-medium text-sky-100">
                    Alert delivery is active
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sky-50/80">
                    Users receive updates through WebSockets and email based on
                    their selected preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="pb-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
                System capabilities
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                Built for continuous monitoring
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur transition hover:-translate-y-1 hover:bg-white/8"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15">
                    <Icon className="h-5 w-5 text-sky-300" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
              How it works
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Frontend as the control center
            </h3>
            <div className="mt-6 space-y-4">
              {flow.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-400 text-sm font-bold text-slate-950">
                    {index + 1}
                  </div>
                  <p className="pt-0.5 text-sm leading-7 text-slate-300">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-400/15 to-cyan-400/10 p-7 backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-200">
              Ready for Clerk auth
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Personalize every topic, alert, and dashboard
            </h3>
            <p className="mt-4 text-sm leading-7 text-sky-50/80">
              Signed-in users can manage tracked topics, alert thresholds, and
              delivery preferences from a single place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white">
                Sign-in protected
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white">
                User-specific subscriptions
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white">
                Real-time feed
              </span>
            </div>

            <div className="mt-8 flex gap-4">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200"
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/sign-in"
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}