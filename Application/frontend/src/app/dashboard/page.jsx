"use client"

import { useEffect, useMemo, useState } from "react"


function formatDate(iso) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
    </div>
  )
}

function Badge({ children, active = false, onClick }) {
  const classes = active
    ? "border-sky-400/40 bg-sky-400/15 text-sky-200"
    : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"

  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${classes}`}
    >
      {children}
    </button>
  )
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-sky-300">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default function DashboardPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [evolution, setEvolution] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/feed?limit=80`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

      const data = await res.json()
      setArticles(Array.isArray(data) ? data : [])
    } catch {
      setError("Unable to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [])

  const clusters = useMemo(() => {
    const map = new Map()

    for (const article of articles) {
      const key = article.cluster_id ?? "unclustered"
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(article)
    }

    return Array.from(map.entries())
      .map(([id, items]) => {
        const ordered = [...items].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        )

        const sources = Array.from(
          new Set(items.map((a) => a.source).filter(Boolean))
        )

        const avgCredibility =
          items.length > 0
            ? (
                items.reduce(
                  (sum, item) => sum + Number(item.credibility_score ?? 0),
                  0
                ) / items.length
              ).toFixed(2)
            : "0.00"

        return {
          id,
          items,
          count: items.length,
          title: ordered[0]?.title ?? "Untitled story",
          latestAt: ordered[0]?.created_at ?? null,
          sources,
          avgCredibility,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.latestAt ?? 0).getTime() -
          new Date(a.latestAt ?? 0).getTime()
      )
  }, [articles])

  useEffect(() => {
    if (!clusters.length) return
    if (selectedCluster === null) {
      const firstReal = clusters.find((c) => c.id !== "unclustered") ?? clusters[0]
      setSelectedCluster(firstReal?.id ?? null)
    }
  }, [clusters, selectedCluster])

  useEffect(() => {
    const loadEvolution = async () => {
      if (!selectedCluster || selectedCluster === "unclustered") {
        setEvolution([])
        return
      }

      setTimelineLoading(true)
      try {
        const res = await fetch(`/api/evolution/${selectedCluster}`)
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

        const data = await res.json()
        setEvolution(Array.isArray(data) ? data : [])
      } catch {
        setEvolution([])
      } finally {
        setTimelineLoading(false)
      }
    }

    loadEvolution()
  }, [selectedCluster])

  const selectedClusterData = useMemo(() => {
    return clusters.find((c) => c.id === selectedCluster) ?? null
  }, [clusters, selectedCluster])

  const selectedClusterArticles = useMemo(() => {
    if (!selectedClusterData) return []
    return [...selectedClusterData.items].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )
  }, [selectedClusterData])

  const totalArticles = articles.length
  const trackedTopics = clusters.filter((c) => c.id !== "unclustered").length

  const avgCredibility = useMemo(() => {
    if (!articles.length) return "—"
    const total = articles.reduce(
      (sum, item) => sum + Number(item.credibility_score ?? 0),
      0
    )
    return (total / articles.length).toFixed(2)
  }, [articles])

  const topSource = useMemo(() => {
    const count = new Map()
    for (const article of articles) {
      const src = article.source ?? "Unknown"
      count.set(src, (count.get(src) ?? 0) + 1)
    }

    let winner = "—"
    let best = 0
    for (const [src, n] of count.entries()) {
      if (n > best) {
        best = n
        winner = src
      }
    }
    return winner
  }, [articles])

  const latestArticles = useMemo(() => {
    return [...articles]
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      )
      .slice(0, 8)
  }, [articles])

  return (
    <main className="min-h-screen bg-[#06111f] text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Topic activity overview
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              A compact control page for story clusters, article counts, credibility,
              and topic evolution.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Articles"
              value={String(totalArticles)}
              hint="Loaded from database"
            />
            <StatCard
              label="Topics"
              value={String(trackedTopics)}
              hint="Clustered stories"
            />
            <StatCard
              label="Credibility"
              value={avgCredibility}
              hint="Average score"
            />
            <StatCard
              label="Top source"
              value={topSource}
              hint="Most active publisher"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <SectionTitle
              eyebrow="Tracked topics"
              title="Active clusters"
              description="Select a topic to inspect its latest articles and how the story is developing."
            />

            <div className="mt-6 space-y-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5"
                    />
                  ))
                : clusters.length > 0
                ? clusters.map((cluster) => {
                    const active = cluster.id === selectedCluster
                    return (
                      <button
                        key={String(cluster.id)}
                        onClick={() => setSelectedCluster(cluster.id)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          active
                            ? "border-sky-400/40 bg-sky-400/10"
                            : "border-white/10 bg-slate-950/30 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.24em] text-sky-300">
                              Cluster {String(cluster.id)}
                            </p>
                            <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
                              {cluster.title}
                            </h3>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                            {cluster.count}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {cluster.sources.slice(0, 3).map((source) => (
                            <Badge key={source}>{source}</Badge>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                          <span>Credibility {cluster.avgCredibility}</span>
                          <span>{formatDate(cluster.latestAt)}</span>
                        </div>
                      </button>
                    )
                  })
                : (
                  <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 text-sm text-slate-300">
                    No clusters available yet.
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <SectionTitle
                eyebrow="Selected topic"
                title={selectedClusterData?.title ?? "Choose a cluster"}
                description="Core details for the currently selected story cluster."
              />

              {selectedClusterData ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Articles"
                      value={String(selectedClusterData.count)}
                      hint="In this cluster"
                    />
                    <StatCard
                      label="Sources"
                      value={String(selectedClusterData.sources.length)}
                      hint="Unique publishers"
                    />
                    <StatCard
                      label="Credibility"
                      value={selectedClusterData.avgCredibility}
                      hint="Cluster average"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedClusterData.sources.map((source) => (
                      <Badge key={source}>{source}</Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Select a cluster to view details.
                </p>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <SectionTitle
                eyebrow="Story evolution"
                title="Timeline"
                description="The latest articles for this topic, ordered by arrival."
              />

              <div className="mt-6 space-y-3">
                {timelineLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                    />
                  ))
                ) : evolution.length > 0 ? (
                  evolution.map((item) => (
                    <div
                      key={`${item.url ?? item.title}-${item.arrived_at}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.source} · {formatDate(item.arrived_at)}
                          </p>
                        </div>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5 text-sm text-slate-300">
                    Select a topic cluster to load its timeline.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <SectionTitle
            eyebrow="Recent articles"
            title="Latest processed updates"
            description="A quick view of the newest items currently stored in the database."
          />

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/5"
                  />
                ))
              : latestArticles.map((article, index) => (
                  <div
                    key={article.id ?? index}
                    className="rounded-3xl border border-white/10 bg-slate-950/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge>{article.source ?? "Unknown"}</Badge>
                      <span className="text-xs text-slate-400">
                        {formatDate(article.created_at)}
                      </span>
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-sm font-semibold text-white">
                      {article.title}
                    </h3>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="text-xs text-slate-400">
                        Credibility {Number(article.credibility_score ?? 0).toFixed(2)}
                      </span>
                      {article.url ? (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                        >
                          Read original →
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">No link</span>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>
    </main>
  )
}