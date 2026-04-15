"use client"

import { useEffect, useMemo, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function GlassCard({ children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30">
      {children}
    </div>
  )
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  )
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/subscriptions/me`)
        const data = await res.json()
        setSubs(data || [])
        if (data?.length) setSelected(data[0])
      } catch {
        setSubs([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const articles = useMemo(() => {
    return selected?.articles || []
  }, [selected])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(to_bottom,#020617,#0f172a_55%,#020617)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[320px_1fr]">

        {/* LEFT PANEL */}
        <aside className="border-r border-white/10 bg-black/30 backdrop-blur-xl p-6">
          <h2 className="text-xl font-semibold tracking-tight">
            Subscriptions
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Your tracked topics
          </p>

          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))
            ) : subs.length > 0 ? (
              subs.map((item) => {
                const active = selected?.cluster_id === item.cluster_id
                return (
                  <button
                    key={item.cluster_id}
                    onClick={() => setSelected(item)}
                    className={`w-full rounded-xl p-4 text-left transition ${
                      active
                        ? "bg-violet-500/15 border border-violet-400/40 shadow-lg shadow-violet-500/10"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <p className="text-sm font-semibold line-clamp-1">
                      {item.topic_name || item.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.articles?.length || 0} updates
                    </p>
                  </button>
                )
              })
            ) : (
              <p className="text-sm text-slate-400 mt-4">
                No subscriptions yet
              </p>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <section className="p-6 lg:p-10">

          {selected ? (
            <>
              {/* HEADER */}
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
                  Tracking
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                  {selected.topic_name || selected.title}
                </h1>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(selected.sources || []).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>

              {/* STATS */}
              <div className="grid gap-4 sm:grid-cols-3 mb-8">
                <GlassCard>
                  <div className="p-5">
                    <p className="text-xs text-slate-400">Articles</p>
                    <p className="text-2xl font-semibold mt-2">
                      {articles.length}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="p-5">
                    <p className="text-xs text-slate-400">Sources</p>
                    <p className="text-2xl font-semibold mt-2">
                      {selected.sources?.length || 0}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="p-5">
                    <p className="text-xs text-slate-400">Credibility</p>
                    <p className="text-2xl font-semibold mt-2">
                      {Number(selected.avg_credibility || 0).toFixed(2)}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* ACTIVITY FEED (KEY DIFFERENCE) */}
              <div className="space-y-4">
                {articles.length > 0 ? (
                  articles.map((article, i) => (
                    <GlassCard key={article.id || i}>
                      <div className="p-5 flex gap-4">
                        
                        {/* timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-violet-400 mt-2" />
                          {i !== articles.length - 1 && (
                            <div className="w-px flex-1 bg-white/10 mt-1" />
                          )}
                        </div>

                        {/* content */}
                        <div className="flex-1">
                          <p className="text-sm font-semibold line-clamp-2">
                            {article.title}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {article.source} · {formatDate(article.created_at)}
                          </p>

                          {article.summary && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-3">
                              {article.summary}
                            </p>
                          )}

                          <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-slate-400">
                              Credibility{" "}
                              {Number(article.credibility_score || 0).toFixed(2)}
                            </span>

                            {article.url && (
                              <a
                                href={article.url}
                                target="_blank"
                                className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                              >
                                Read →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    No activity in this topic yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Select a topic to view details
            </div>
          )}
        </section>
      </div>
    </main>
  )
}