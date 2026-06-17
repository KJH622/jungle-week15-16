export default function Card({ children, className = '', padded = true, ...props }) {
  return (
    <div className={`card ${padded ? 'card--padded' : ''} ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
