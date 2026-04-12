const SOURCE_STYLES = {
  bbc: { bg: "bg-red-100", text: "text-red-800", label: "BBC" },
  aljazeera: { bg: "bg-green-100", text: "text-green-800", label: "Al Jazeera" },
  reuters: { bg: "bg-amber-100", text: "text-amber-800", label: "Reuters" },
  ap: { bg: "bg-blue-100", text: "text-blue-800", label: "AP News" },
  gdelt: { bg: "bg-indigo-100", text: "text-indigo-800", label: "GDELT" },
}

function formatDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function NewsCard({ article }) {
  const style = SOURCE_STYLES[article.source_name] ?? {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: article.source_name,
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Source badge + date */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
        {article.published_at && (
          <span className="text-xs text-gray-400">{formatDate(article.published_at)}</span>
        )}
      </div>

      {/* Title */}
      <h2 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
        {article.title}
      </h2>

      {/* Snippet */}
      {article.snippet && (
        <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-gray-500">
          {article.snippet}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
        {article.author ? (
          <span className="truncate text-xs text-gray-400">{article.author}</span>
        ) : (
          <span />
        )}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-purple-700 px-3 py-1 text-xs font-medium text-white hover:bg-purple-800"
        >
          Read →
        </a>
      </div>
    </div>
  )
}