import Button from './Button'

export default function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <Button variant="ghost" disabled={page === 0} onClick={onPrev}>이전</Button>
      <span className="pagination__label">{page + 1} / {totalPages}</span>
      <Button variant="ghost" disabled={page === totalPages - 1} onClick={onNext}>다음</Button>
    </div>
  )
}
