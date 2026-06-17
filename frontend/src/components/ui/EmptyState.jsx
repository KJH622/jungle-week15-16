export default function EmptyState({ children = '표시할 내용이 없습니다.' }) {
  return (
    <div className="state-box">
      <span aria-hidden="true">□</span>
      <span>{children}</span>
    </div>
  )
}
