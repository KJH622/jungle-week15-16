export default function LoadingIndicator({ children = '로딩 중...', ai = false }) {
  if (ai) {
    return (
      <div className="state-box state-box--ai">
        <span className="ai-dots" aria-hidden="true"><span /><span /><span /></span>
        <span>{children}</span>
      </div>
    )
  }

  return <div className="state-box">{children}</div>
}
