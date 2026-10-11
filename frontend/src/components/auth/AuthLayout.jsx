import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Award, Wallet } from 'lucide-react';
import skLogo from '../../assets/sk-logo.svg';
import coastBg from '../../assets/tawiran-coast.svg';
import { SK_NAME, SK_LOCATION, SLOGAN } from '../../lib/brand';
import { cn } from '../../lib/utils';

const YEAR = new Date().getFullYear();

const PERKS = [
  { icon: CalendarCheck, text: 'Join SK events and check in with your QR code' },
  { icon: Award, text: 'Earn participation points and redeem rewards' },
  { icon: Wallet, text: 'See how the SK budget is planned and spent' },
];

function Brand({ light = false }) {
  return (
    <span className="flex items-center gap-3">
      <img src={skLogo} alt="" className="h-10 w-10 shrink-0 object-contain" />
      <span className="leading-tight">
        <span className={cn('block text-[15px] font-bold', light ? 'text-white' : 'text-fg')}>Sangguniang Kabataan</span>
        <span className={cn('block text-xs', light ? 'text-white/60' : 'text-muted')}>Barangay Tawiran, Sta. Cruz</span>
      </span>
    </span>
  );
}

/**
 * Two-column auth shell: brand panel (lg+) beside a scrollable form column.
 * Below lg — phones and tablets in either orientation — only the form column shows,
 * and it scrolls naturally so short landscape screens never clip the form.
 */
export default function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel (desktop / tablet landscape) */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 isolate flex h-dvh flex-col justify-between overflow-hidden bg-[#0F2740] p-10 text-white xl:p-12">
          <img src={coastBg} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[86%_center]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0F2740]/95 via-[#0F2740]/90 via-70% to-[#0F2740]/30" />

          <Link to="/" className="self-start" aria-label="Go to homepage"><Brand light /></Link>

          <div className="max-w-md">
            <p className="animate-fade-up text-sm font-medium text-white/70">{SK_LOCATION}</p>
            <h2 className="mt-2 animate-fade-up text-3xl font-bold leading-tight tracking-tight [animation-delay:80ms] xl:text-4xl">{SK_NAME}</h2>
            <span aria-hidden="true" className="mt-5 flex h-1.5 w-20 origin-left animate-grow-x overflow-hidden rounded-full [animation-delay:250ms]">
              <span className="flex-1 bg-[#0038A8]" /><span className="flex-1 bg-[#CE1126]" /><span className="flex-1 bg-[#FCD116]" />
            </span>
            <p className="mt-4 animate-fade-up text-lg font-medium text-amber-200 [animation-delay:160ms]">{SLOGAN}</p>
            <ul className="mt-7 space-y-3 [@media(max-height:680px)]:hidden">
              {PERKS.map(({ icon, text }, i) => {
                const Icon = icon;
                return (
                <li key={text} className="flex animate-fade-up items-center gap-3 text-sm text-white/85" style={{ animationDelay: `${300 + i * 120}ms` }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px] text-amber-200" />
                  </span>
                  {text}
                </li>
                );
              })}
            </ul>
          </div>

          <p className="text-xs text-white/50">© {YEAR} {SK_NAME}</p>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="lg:invisible" aria-label="Go to homepage"><Brand /></Link>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition hover:bg-surface2 hover:text-fg">
            <ArrowLeft className="h-4 w-4" />
            <span><span className="hidden sm:inline">Back to </span>Home</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-4 sm:px-8 sm:pt-8">
          <div className={cn('w-full animate-fade-up', wide ? 'max-w-xl' : 'max-w-md')}>
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>}
            </div>

            {children}

            {footer && <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>

        <p className="px-5 pb-6 text-center text-xs text-subtle lg:hidden">© {YEAR} {SK_NAME}</p>
      </main>
    </div>
  );
}
