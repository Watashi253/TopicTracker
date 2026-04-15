"use client"

import { useEffect, useMemo, useState } from "react"
import NewsCard from "../components/NewsCard"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

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
      <p className="text-[11px] uppercase tracking-[0.28em] text-violet-300">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default function TrackPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/articles/latest?limit=50`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

      const data = await res.json()
      setArticles(Array.isArray(data) ? data : [])
    } catch {
      setError("Failed to load topic results from the database.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [])

  const filtered = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase()
    if (!q) return articles

    return articles.filter((a) => {
      const title = (a.title ?? "").toLowerCase()
      const summary = (a.summary ?? "").toLowerCase()
      const source = (a.source ?? "").toLowerCase()
      return title.includes(q) || summary.includes(q) || source.includes(q)
    })
  }, [articles, submittedQuery])

  const topSources = useMemo(() => {
    const count = new Map()
    for (const article of filtered) {
      const src = article?.source || "Unknown"
      count.set(src, (count.get(src) || 0) + 1)
    }
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [filtered])

  const avgCredibility = useMemo(() => {
    if (!filtered.length) return "—"
    const total = filtered.reduce(
      (sum, a) => sum + Number(a.credibility_score ?? 0),
      0
    )
    return (total / filtered.length).toFixed(2)
  }, [filtered])

  const handleSearch = (e) => {
    e?.preventDefault?.()
    setSubmittedQuery(query)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(to_bottom,#020617,#111827_55%,#0f172a)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
            Topic search
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Search a topic and track its latest updates
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Find the most relevant news for a topic, summarized and ranked for quick review.
          </p>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 lg:flex-row">
            <input
              type="text"
              placeholder="Try: AI regulation, Gaza conflict, climate summit..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-full border border-white/10 bg-slate-950/50 px-5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20"
            />
            <button
              type="submit"
              className="rounded-full bg-violet-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Matched articles" value={String(filtered.length)} />
          <StatCard label="Average credibility" value={avgCredibility} />
          <StatCard
            label="Top source"
            value={topSources[0]?.[0] ?? "—"}
          />
        </div>

        {submittedQuery && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p className="text-sm text-slate-300">
              Showing results for{" "}
              <span className="font-medium text-white">“{submittedQuery}”</span>
            </p>
            <button
              onClick={() => {
                setQuery("")
                setSubmittedQuery("")
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        )}

        {topSources.length > 0 && submittedQuery && (
          <div className="mb-6 flex flex-wrap gap-2">
            {topSources.map(([source, count]) => (
              <span
                key={source}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80"
              >
                {source} · {count}
              </span>
            ))}
          </div>
        )}

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
                key={article.id ?? `${article.url ?? "topic"}-${i}`}
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
            <p className="text-lg font-semibold text-white">No results yet</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Search for a topic to start tracking relevant news.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}