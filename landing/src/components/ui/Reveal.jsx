import { useInView } from '@/hooks/motion/useInView'

/** Aparece al entrar en pantalla. Pasa `visible` a los hijos si son una función. */
export function Reveal({ as: Tag = 'div', className = '', children, ...props }) {
  const [ref, visible] = useInView()
  return (
    <Tag ref={ref} data-visible={visible} className={`reveal ${className}`} {...props}>
      {typeof children === 'function' ? children(visible) : children}
    </Tag>
  )
}
