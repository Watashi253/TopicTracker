"use client"

import { useEffect, useState } from "react"
import NewsCard from "../components/NewsCard"

type Article = {
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

const SOURCES = [
  { key: "all",       label: "All Sources" },
  { key: "bbc",       label: "BBC" },
  { key: "aljazeera", label: "Al Jazeera" },
  { key: "reuters",   label: "Reuters" },
  { key: "ap",        label: "AP News" },
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
      <div className="mt-auto border-t border-gray-100 pt-3 flex justify-between items-center">
        <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [articles, setArticles]       = useState<Article[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeSource, setActiveSource] = useState("all")
  const [search, setSearch]           = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const fetchArticles = async () => {
      setLoading(true)
      setError(null)
      try {
        const endpoint =
          activeSource === "all"
            ? `${API_BASE}/fetch/rss/all`
            : `${API_BASE}/fetch/rss/${activeSource}`

        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        const data: Article[] = await res.json()
        setArticles(data)
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return
        setError("Could not load articles. Make sure the backend is running on port 8000.")
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
    return () => controller.abort()
  }, [activeSource])

  const filtered = articles.filter((a) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.title.toLowerCase().includes(q) ||
      (a.snippet ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Live News Feed</h1>
        <p className="mt-1 text-sm text-gray-500">
          Latest articles from global news sources
        </p>
      </div>

      {/* Controls row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Source filter tabs */}
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
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

        {/* Search box */}
        <input
          type="text"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:outline-none sm:w-56"
        />
      </div>

      {/* Result count */}
      {!loading && !error && (
        <p className="mb-4 text-xs text-gray-400">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map((article, i) => (
              <NewsCard key={`${article.url}-${i}`} article={article} />
            ))}
      </div>

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center text-gray-400">
          <p className="text-lg font-medium">No articles found</p>
          <p className="text-sm">
            {search ? "Try a different search term." : "The feed returned no results."}
          </p>
        </div>
      )}
    </main>
  )
}