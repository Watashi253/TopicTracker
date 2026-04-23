"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

function SkeletonTimeline() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-4 w-4 animate-pulse rounded-full bg-violet-400/50" />
            <div className="h-full w-0.5 animate-pulse bg-white/10" />
          </div>
          <div className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="h-4 w-1/4 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export default function EvolutionPage() {
  const { cluster_id } = useParams()
  const [evolution, setEvolution] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!cluster_id) return

    const fetchEvolution = async () => {
      try {
        const res = await fetch(`/api/evolution/${cluster_id}`)
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

        const data = await res.json()
        setEvolution(Array.isArray(data) ? data : [])
      } catch (err) {
        setError("Failed to load topic evolution data.")
      } finally {
        setLoading(false)
      }
    }

    fetchEvolution()
  }, [cluster_id])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(to_bottom,#020617,#111827_55%,#0f172a)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
            Topic Evolution
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Cluster {cluster_id} Timeline
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Trace the chronological development of this topic through aggregated news articles.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <SkeletonTimeline />
        ) : evolution.length > 0 ? (
          <div className="relative border-l-2 border-white/10 pl-6 ml-4 md:ml-6 space-y-8">
            {evolution.map((item, i) => (
              <div key={i} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[35px] top-1 h-4 w-4 rounded-full border-[3px] border-[#0f172a] bg-violet-400 transition-transform group-hover:scale-125 group-hover:bg-violet-300" />
                
                <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur transition hover:-translate-y-1 hover:bg-white/10">
                  <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                      {item.source || "Unknown Source"}
                    </span>
                    <time className="text-xs text-slate-400 font-medium">
                      {formatDate(item.arrived_at)}
                    </time>
                  </div>
                  
                  <h2 className="text-lg font-semibold leading-snug text-white">
                    {item.title}
                  </h2>
                  
                  {item.url && item.url !== "#" && (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
                      >
                        Read original →
                      </a>
                    </div>
                  )}
                </article>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-14 rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
            <p className="text-lg font-semibold text-white">No timeline available</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              We couldn't find any chronological data for this cluster.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
