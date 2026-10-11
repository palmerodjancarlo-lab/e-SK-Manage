import coastBg from '../../assets/tawiran-coast.svg';
import { cn } from '../../lib/utils';

/**
 * SK-navy welcome banner shared by the dashboards: the (gently animated) coast
 * illustration fades in from the right and the SK colours run along the top.
 */
export default function BrandBanner({ className, children }) {
  return (
    <section className={cn('relative isolate animate-fade-up overflow-hidden rounded-xl bg-brand text-brand-fg', className)}>
      <img
        src={coastBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-[85%_75%] opacity-70 [mask-image:linear-gradient(to_left,black_25%,transparent_85%)] sm:w-3/4"
      />
      <span aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1">
        <span className="flex-1 bg-[#0038A8]" /><span className="flex-1 bg-[#CE1126]" /><span className="flex-1 bg-[#FCD116]" />
      </span>
      <div className="relative p-6 sm:p-8">{children}</div>
    </section>
  );
}
