export default function Textarea({ className = '', ...props }) {
  return <textarea className={`textarea ${className}`.trim()} {...props} />
}
