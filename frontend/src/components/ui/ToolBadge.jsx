export default function ToolBadge({ children, type = 'rag' }) {
  return <span className={`tool-badge tool-badge--${type}`}>{children}</span>
}
