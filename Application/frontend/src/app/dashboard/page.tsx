"use client"

import { useEffect, useState } from "react"
import NewsCard from "../components/NewsCard"

export type Article = {
  source_type: string
  source_name: string
  url: string
  title: string
  snippet: string | null
  author: string | null
  published_at: string | null
  fetched_at: string
  raw_score: number | null
  language: string | null
  metadata: Record<string, string>
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const RSS_SOURCES = [
  { key: "all",       label: "All RSS" },
  { key: "bbc",       label: "BBC" },
  { key: "aljazeera", label: "Al Jazeera" },
  { key: "reuters",   label: "Reuters" },
  { key: "ap",        label: "AP News" },
]

const GDELT_TIMESPANS = [
  { key: "1day",   label: "24 h" },
  { key: "1week",  label: "1 week" },
  { key: "1month", label: "1 month" },
]

const GDELT_SORTS = [
  { key: "HybridRel", label: "Relevance" },
  { key: "DateDesc",  label: "Latest" },
  { key: "ToneDesc",  label: "Tone" },
]

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
        <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mb-2 space-y-1.5">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mt-2 space-y-1">
        <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [articles, setArticles]           = useState<Article[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  // RSS state
  const [activeSource, setActiveSource]   = useState("all")
  const [search, setSearch]               = useState("")

  // GDELT state
  const [mode, setMode]                   = useState<"rss" | "gdelt">("rss")
  const [gdeltQuery, setGdeltQuery]       = useState("")
  const [gdeltInput, setGdeltInput]       = useState("")
  const [gdeltTimespan, setGdeltTimespan] = useState("1week")
  const [gdeltSort, setGdeltSort]         = useState("HybridRel")

  // ── RSS fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "rss") return
    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const endpoint =
          activeSource === "all"
            ? `${API_BASE}/fetch/rss/all`
            : `${API_BASE}/fetch/rss/${activeSource}`
        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        setArticles(await res.json())
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return
        setError("Could not load articles. Make sure the backend is running on port 8000.")
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [mode, activeSource])

  // ── GDELT fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "gdelt" || !gdeltQuery.trim()) return
    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          query:    gdeltQuery,
          limit:    "30",
          sort:     gdeltSort,
          timespan: gdeltTimespan,
          language: "English",
        })
        const res = await fetch(`${API_BASE}/fetch/gdelt?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        setArticles(await res.json())
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return
        setError("GDELT fetch failed. Make sure the backend is running.")
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [mode, gdeltQuery, gdeltTimespan, gdeltSort])

  // ── Filtered view for RSS search box ────────────────────────────────────
  const filtered = articles.filter((a) => {
    if (mode === "gdelt" || !search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.title.toLowerCase().includes(q) ||
      (a.snippet ?? "").toLowerCase().includes(q)
    )
  })

  const handleGdeltSearch = () => {
    const q = gdeltInput.trim()
    if (!q) return
    setGdeltQuery(q)
    setArticles([])
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Live News Feed</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time articles from global news sources and GDELT
        </p>
      </div>

      {/* Mode toggle — RSS vs GDELT */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => { setMode("rss"); setArticles([]); }}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
            mode === "rss"
              ? "bg-purple-700 text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          RSS Feeds
        </button>
        <button
          onClick={() => { setMode("gdelt"); setArticles([]); setLoading(false); }}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
            mode === "gdelt"
              ? "bg-indigo-600 text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          GDELT Global Search
        </button>
      </div>

      {/* ── RSS controls ── */}
      {mode === "rss" && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {RSS_SOURCES.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSource(s.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeSource === s.key
                    ? "bg-purple-700 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:outline-none sm:w-56"
          />
        </div>
      )}

      {/* ── GDELT controls ── */}
      {mode === "gdelt" && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="mb-3 text-xs font-medium text-indigo-700">
            GDELT monitors 100+ countries across 65+ languages, updated every 15 minutes.
          </p>

          {/* Query input */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="e.g. climate change, Gaza ceasefire, oil crisis…"
              value={gdeltInput}
              onChange={(e) => setGdeltInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGdeltSearch()}
              className="flex-1 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={handleGdeltSearch}
              disabled={!gdeltInput.trim()}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Search
            </button>
          </div>

          {/* Timespan + Sort filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-600">Timespan:</span>
              {GDELT_TIMESPANS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setGdeltTimespan(t.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    gdeltTimespan === t.key
                      ? "bg-indigo-600 text-white"
                      : "border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-600">Sort:</span>
              {GDELT_SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setGdeltSort(s.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    gdeltSort === s.key
                      ? "bg-indigo-600 text-white"
                      : "border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      {!loading && !error && filtered.length > 0 && (
        <p className="mb-4 text-xs text-gray-400">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          {mode === "gdelt" && gdeltQuery ? ` for "${gdeltQuery}"` : ""}
          {mode === "rss" && search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* GDELT idle state — no query entered yet */}
      {mode === "gdelt" && !gdeltQuery && !loading && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center text-gray-400">
          <p className="text-lg font-medium">Enter a topic to search GDELT</p>
          <p className="text-sm">Try: "Gaza ceasefire", "AI regulation", "climate summit"</p>
        </div>
      )}

      {/* Card grid */}
      {(mode === "rss" || gdeltQuery) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((article, i) => (
                <NewsCard key={`${article.url}-${i}`} article={article} />
              ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (mode === "rss" || gdeltQuery) && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center text-gray-400">
          <p className="text-lg font-medium">No articles found</p>
          <p className="text-sm">
            {mode === "rss" && search
              ? "Try a different search term."
              : "The feed returned no results."}
          </p>
        </div>
      )}
    </main>
  )
}