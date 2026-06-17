import Button from './Button'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>
        <div className="inline-row">
          <Button variant="secondary" onClick={onCancel} style={{ flex: 1 }}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm} style={{ flex: 1 }}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
