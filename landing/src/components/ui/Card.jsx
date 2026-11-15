export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-card border border-surface-1 bg-bg-1 ${className}`} {...props}>
      {children}
    </Tag>
  )
}
