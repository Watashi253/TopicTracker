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
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)

  const fetchSubscriptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/subscriptions/me`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

      const data = await res.json()
      setClusters(Array.isArray(data) ? data : [])
    } catch {
      setError("Unable to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  useEffect(() => {
    if (!clusters.length) return
    if (selectedCluster === null) {
      setSelectedCluster(clusters[0]?.cluster_id ?? null)
    }
  }, [clusters, selectedCluster])

  const selectedClusterData = useMemo(() => {
    return clusters.find((c) => c.cluster_id === selectedCluster) ?? null
  }, [clusters, selectedCluster])

  const trackedTopics = clusters.length

  const allArticles = useMemo(() => {
    const list = []
    for (const c of clusters) {
      if (c.articles) list.push(...c.articles)
    }
    return list
  }, [clusters])

  const totalArticles = allArticles.length

  const avgCredibility = useMemo(() => {
    if (!allArticles.length) return "—"
    const sum = allArticles.reduce((acc, item) => acc + Number(item.credibility_score ?? 0), 0)
    return (sum / allArticles.length).toFixed(2)
  }, [allArticles])

  const topSource = useMemo(() => {
    const count = new Map()
    for (const a of allArticles) {
      const src = a.source ?? "Unknown"
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
  }, [allArticles])

  const latestArticles = useMemo(() => {
    return [...allArticles]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 8)
  }, [allArticles])

  return (
    <main className="min-h-screen bg-[#06111f] text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Your Topics Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Your subscribed story clusters, article counts, and credibility — all in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Articles"
              value={String(totalArticles)}
              hint="From your subscriptions"
            />
            <StatCard
              label="Topics"
              value={String(trackedTopics)}
              hint="Subscribed clusters"
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
              description="Select a subscribed topic to inspect its latest articles."
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
                    const active = cluster.cluster_id === selectedCluster
                    return (
                      <button
                        key={String(cluster.cluster_id)}
                        onClick={() => setSelectedCluster(cluster.cluster_id)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          active
                            ? "border-sky-400/40 bg-sky-400/10"
                            : "border-white/10 bg-slate-950/30 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.24em] text-sky-300">
                              Cluster {String(cluster.cluster_id)}
                            </p>
                            <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
                              {cluster.topic_name}
                            </h3>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                            {cluster.articles?.length || 0}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(cluster.sources || []).slice(0, 3).map((source) => (
                            <Badge key={source}>{source}</Badge>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                          <span>Credibility {Number(cluster.avg_credibility || 0).toFixed(2)}</span>
                        </div>
                      </button>
                    )
                  })
                : (
                  <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 text-sm text-slate-300">
                    No subscribed clusters yet. Search a topic to start tracking.
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <SectionTitle
                eyebrow="Selected topic"
                title={selectedClusterData?.topic_name ?? "Choose a cluster"}
                description="Core details for the currently selected story cluster."
              />

              {selectedClusterData ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Articles"
                      value={String(selectedClusterData.articles?.length || 0)}
                      hint="In this cluster"
                    />
                    <StatCard
                      label="Sources"
                      value={String(selectedClusterData.sources?.length || 0)}
                      hint="Unique publishers"
                    />
                    <StatCard
                      label="Credibility"
                      value={Number(selectedClusterData.avg_credibility || 0).toFixed(2)}
                      hint="Cluster average"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(selectedClusterData.sources || []).map((source) => (
                      <Badge key={source}>{source}</Badge>
                    ))}
                  </div>

                  <div className="mt-8 space-y-3">
                    <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Latest Updates</h3>
                    {selectedClusterData.articles?.length > 0 ? (
                      selectedClusterData.articles.map((item) => (
                        <div
                          key={`${item.id || item.url}`}
                          className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold text-white">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {item.source} · {formatDate(item.created_at)}
                              </p>
                            </div>
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 rounded-full bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
                              >
                                Open
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5 text-sm text-slate-300">
                        No articles available for this cluster.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Select a cluster to view details.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <SectionTitle
            eyebrow="Recent articles"
            title="Latest from your topics"
            description="The newest items from your subscribed clusters."
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