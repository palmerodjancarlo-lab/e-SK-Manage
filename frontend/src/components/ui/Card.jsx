import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('border-b border-border p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-bold text-fg', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('mt-1 text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center gap-3 border-t border-border p-5 sm:p-6', className)}
      {...props}
    />
  );
}

export default Card;
