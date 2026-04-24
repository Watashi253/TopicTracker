"use client"

import { useEffect, useMemo, useState } from "react"
import NewsCard from "../components/NewsCard"

// Remove API_BASE for feed, we will hit Next.js local API

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
      <div className="mt-5 h-6 w-4/5 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/10" />
      <div className="mt-6 h-4 w-32 animate-pulse rounded bg-white/10" />
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-sky-400 text-slate-950"
          : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )
}

export default function FeedPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")

  const fetchLatest = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/feed?limit=60`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

      const data = await res.json()
      setArticles(Array.isArray(data) ? data : [])
    } catch {
      setError("Failed to load the latest news feed.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatest()
  }, [])

  const sources = useMemo(() => {
    const unique = new Set()
    for (const article of articles) {
      if (article?.source) unique.add(article.source)
    }
    return ["all", ...Array.from(unique)]
  }, [articles])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return articles.filter((a) => {
      const source = (a.source ?? "").toLowerCase()
      const title = (a.title ?? "").toLowerCase()
      const summary = (a.summary ?? "").toLowerCase()

      const sourceOk =
        sourceFilter === "all" || source.includes(sourceFilter.toLowerCase())

      const queryOk =
        !q ||
        title.includes(q) ||
        summary.includes(q) ||
        source.includes(q)

      return sourceOk && queryOk
    })
  }, [articles, query, sourceFilter])

  const avgCredibility = useMemo(() => {
    if (!articles.length) return "—"
    const total = articles.reduce(
      (sum, a) => sum + Number(a.credibility_score ?? 0),
      0
    )
    return (total / articles.length).toFixed(2)
  }, [articles])

  const latestSource = useMemo(() => {
    if (!articles.length) return "—"
    const first = articles[0]?.source
    return first || "—"
  }, [articles])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_28%),linear-gradient(to_bottom,#020617,#0f172a_55%,#111827)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-300">
              Live feed
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Latest news across all topics
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Browse the newest articles currently available in the system, with summaries,
              sources, and credibility signals in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[34rem]">
            <StatCard label="Latest articles" value={String(articles.length)} />
            <StatCard label="Avg. credibility" value={avgCredibility} />
            <StatCard label="Newest source" value={latestSource} />
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-cyan-300">
                Search feed
              </label>
              <input
                type="text"
                placeholder="Search by title, summary, or source..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchLatest}
                className="rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Refresh
              </button>
              <button
                onClick={() => setQuery("")}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sources.map((src) => (
              <FilterChip
                key={src}
                active={sourceFilter === src}
                onClick={() => setSourceFilter(src)}
              >
                {src === "all" ? "All sources" : src}
              </FilterChip>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((article, i) => (
              <div
                key={article.id ?? `${article.url ?? "feed"}-${i}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-1 shadow-lg shadow-black/20 backdrop-blur transition hover:-translate-y-1 hover:bg-white/8"
              >
                <NewsCard
                  article={{
                    title: article.title,
                    snippet: article.summary,
                    source: article.source,
                    url: article.url,
                    credibility: article.credibility_score,
                    date: article.created_at,
                    clusterId: article.cluster_id,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-14 rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
            <p className="text-lg font-semibold text-white">No articles found</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Try a different search term or switch to another source filter.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}