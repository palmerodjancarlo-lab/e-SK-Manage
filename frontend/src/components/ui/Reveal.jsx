import useReveal from '../../lib/useReveal';
import { cn } from '../../lib/utils';

/** Fades/slides its content in the first time it scrolls into view. `delay` in ms for staggering. */
export default function Reveal({ as = 'div', delay = 0, className, style, children, ...props }) {
  const Tag = as;
  const [ref, visible] = useReveal();
  return (
    <Tag ref={ref} className={cn('reveal', visible && 'is-visible', className)} style={{ ...style, transitionDelay: `${delay}ms` }} {...props}>
      {children}
    </Tag>
  );
}
