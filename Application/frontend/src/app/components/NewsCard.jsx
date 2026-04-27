import SubscribeButton from "./SubscribeButton"

function formatDate(iso) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function NewsCard({ article }) {
  const title = article?.title ?? "Untitled article"
  const summary = article?.snippet ?? article?.summary ?? ""
  const source = article?.source ?? "Unknown"
  const publishedAt =
    article?.published_at ?? article?.created_at ?? article?.date ?? ""
  const credibility =
    article?.credibility_score ?? article?.credibility ?? null
  const url = article?.url ?? "#"

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:bg-slate-900/50">
      
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
          {source}
        </span>

        <div className="flex items-center gap-2">
          {credibility !== null && credibility !== undefined && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              {Number(credibility).toFixed(2)}
            </span>
          )}
          {publishedAt && (
            <span className="text-xs text-slate-400">
              {formatDate(publishedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-white">
        {title}
      </h2>

      {/* Summary */}
      {summary ? (
        <p className="mt-3 line-clamp-4 flex-1 text-sm leading-7 text-slate-300">
          {summary}
        </p>
      ) : (
        <p className="mt-3 flex-1 text-sm leading-7 text-slate-500">
          No summary available.
        </p>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="truncate text-xs text-slate-400">
          {source}
        </span>

        {url && url !== "#" ? (
          <div className="flex gap-2">
            {article?.clusterId && (
              <SubscribeButton clusterId={article.clusterId} />
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Read original →
            </a>
          </div>
        ) : (
          <div className="flex gap-2">
            {article?.clusterId && (
              <SubscribeButton clusterId={article.clusterId} />
            )}
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/40">
              No link
            </span>
          </div>
        )}
      </div>
    </article>
  )
}