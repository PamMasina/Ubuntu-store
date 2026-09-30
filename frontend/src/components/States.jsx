// One place for the feedback states every async screen needs. The old pages
// each rolled their own and several swallowed errors entirely.
export function Spinner({ label = 'Loading...' }) {
  return <p className="state-loading">{label}</p>
}

export function ErrorState({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="state-error" role="alert">
      <p>{error}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>Try again</button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state-empty">
      <p className="state-empty-title">{title}</p>
      {children && <p className="state-empty-body">{children}</p>}
      {action}
    </div>
  )
}

export function Banner({ kind = 'info', children }) {
  if (!children) return null
  return <div className={`banner banner-${kind}`} role="status">{children}</div>
}
