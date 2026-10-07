import { Wallet, ShieldCheck, Trophy } from 'lucide-react';
import skLogo from '../../assets/sk-logo.svg';

const FEATURES = [
  { icon: Wallet, title: 'Transparent budgeting', desc: 'Every peso tracked across Programs, Projects and Activities.' },
  { icon: Trophy, title: 'Earn participation points', desc: 'Join SK events, climb the leaderboard, and redeem rewards.' },
  { icon: ShieldCheck, title: 'Verified youth community', desc: 'A trusted space for the KK of Barangay Tawiran.' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Brand panel (desktop) */}
      <aside
        className="relative hidden w-[46%] max-w-xl flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: 'linear-gradient(160deg,#4338ca 0%,#312e81 52%,#1e1b4b 100%)' }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-white/30">
            <img src={skLogo} alt="SK Barangay Tawiran logo" className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="text-xl font-extrabold leading-none">e-SK Manage</p>
            <p className="mt-1 text-xs text-indigo-200">Project &amp; Financial Management System</p>
          </div>
        </div>

        {/* Pitch */}
        <div className="relative space-y-7">
          <h2 className="max-w-sm text-3xl font-extrabold leading-tight">
            Empowering the youth of Barangay Tawiran.
          </h2>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                  <f.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs text-indigo-200">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-300">
          Sangguniang Kabataan · Barangay Tawiran, Santa Cruz, Marinduque
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Brand (mobile only) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-border">
              <img src={skLogo} alt="SK logo" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-base font-extrabold leading-none text-fg">e-SK Manage</p>
              <p className="mt-0.5 text-[11px] text-muted">SK · Barangay Tawiran</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-fg">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>

          {children}

          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
      </main>
    </div>
  );
}