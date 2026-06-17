export default function TextInput({ className = '', ...props }) {
  return <input className={`input ${className}`.trim()} {...props} />
}
