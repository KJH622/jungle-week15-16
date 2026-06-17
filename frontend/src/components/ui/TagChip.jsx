export default function TagChip({
  children,
  as: Component = 'span',
  github = false,
  disabled = false,
  className = '',
  ...props
}) {
  const classes = [
    'tag-chip',
    Component === 'button' ? 'tag-chip--button' : '',
    github ? 'tag-chip--github' : '',
    disabled ? 'tag-chip--disabled' : '',
    className,
  ].filter(Boolean).join(' ')

  return <Component className={classes} disabled={disabled} {...props}>{children}</Component>
}
