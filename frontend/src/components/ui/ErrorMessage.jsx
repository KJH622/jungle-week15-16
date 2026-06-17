export default function ErrorMessage({ children }) {
  return (
    <div className="error-message">
      <span aria-hidden="true">!</span>
      <span>{children}</span>
    </div>
  )
}
