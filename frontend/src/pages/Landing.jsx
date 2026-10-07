// src/pages/Landing.jsx — e-SK Manage public landing page
// cspell:words Sangguniang Kabataan Tawiran Marinduque Saloobin ABYIP CBYDP Bukas
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Menu, X, ArrowRight, Wallet, QrCode, FileText, Megaphone,
  ShieldCheck, FolderKanban, MapPin, Mail, Phone, Sun, Users, Layers,
} from 'lucide-react';
import api from '../lib/api';
import skLogo from '../assets/sk-logo.svg';
import heroImg from '../assets/landing-hero.jpg';

const YEAR = new Date().getFullYear();
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;

const INK = '#0B1F3A';   // harbor navy
const GOLD = '#FBBF24';  // sunrise gold

const NAV = [
  { href: '#home', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
];

const FEATURES = [
  { icon: FolderKanban, title: 'Programs & Projects', desc: 'Plan and track Programs, Projects, and Activities from proposal to accomplishment.' },
  { icon: Wallet, title: 'Transparent budgeting', desc: 'Record funds and expenses — kabataan see exactly where the budget is used.' },
  { icon: QrCode, title: 'QR check-in & points', desc: 'Members scan to attend events and earn participation points and rewards.' },
  { icon: FileText, title: 'Official reports', desc: 'Generate ABYIP, CBYDP, and accomplishment reports ready for submission.' },
  { icon: Megaphone, title: 'Announcements & saloobin', desc: 'Share updates, schedule meetings, and gather the youth’s reflections after events.' },
  { icon: ShieldCheck, title: 'Verified membership', desc: 'Residency-verified kabataan with demographics for accurate, fair planning.' },
];

const DEFAULT_CONTACT = {
  address: 'SK Office, Barangay Tawiran, Sta. Cruz, Marinduque',
  email: 'sktawiran@gmail.com',
  phone: 'Contact your SK Chairperson',
};

function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <img src={skLogo} alt="SK Barangay Tawiran" className="h-7 w-7 object-contain" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold text-slate-900">e-SK <span style={{ color: '#1D4ED8' }}>Manage</span></p>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">Plan · Manage · Empower</p>
      </div>
    </div>
  );
}

/* ---------- Public PPA ---------- */
function statusTone(s) {
  const t = (s || '').toLowerCase();
  if (t.includes('complete') || t.includes('accomplish') || t.includes('done')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (t.includes('ongoing') || t.includes('active') || t.includes('progress')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (t.includes('plan') || t.includes('propos')) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function PublicPPA() {
  const q = useQuery({
    queryKey: ['public-programs'],
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/programs/public');
      return Array.isArray(data) ? data : data.programs || data.data || [];
    },
  });
  const programs = Array.isArray(q.data) ? q.data : [];

  return (
    <section id="activities" className="bg-[#F7F9FC] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">What the SK is working on</h2>
          <p className="mt-3 text-lg text-slate-600">A public look at the programs, projects, and activities serving the youth of Barangay Tawiran.</p>
        </div>

        {q.isLoading ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white" />)}
          </div>
        ) : programs.length === 0 ? (
          <div className="mt-10 flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
            <Layers className="h-8 w-8 shrink-0 text-slate-400" />
            <div>
              <p className="font-bold text-slate-800">Activities will appear here soon</p>
              <p className="text-sm text-slate-500">Once the SK publishes its programs, the community can follow them right here.</p>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.slice(0, 6).map((p) => {
              const projects = p.projects || [];
              const activities = projects.reduce((n, pr) => n + ((pr.activities || []).length), 0);
              const used = p.totalUsed ?? p.spent ?? p.utilized ?? 0;
              return (
                <article key={p._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: '#1D4ED8' }}><FolderKanban className="h-5 w-5" /></span>
                    {p.status && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(p.status)}`}>{p.status}</span>}
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">{p.title || p.name}</h3>
                  {(p.description || p.objective) && <p className="mt-1.5 line-clamp-3 text-sm text-slate-600">{p.description || p.objective}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                    <span>{projects.length} projects</span>
                    <span>{activities} activities</span>
                    {used > 0 && <span className="text-emerald-600">{peso(used)} used</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const [open, setOpen] = useState(false);

  const contactQ = useQuery({
    queryKey: ['public-settings'],
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/settings/public');
      return data.settings || data || {};
    },
  });
  const contact = { ...DEFAULT_CONTACT, ...(contactQ.data || {}) };

  return (
    <div className="min-h-screen scroll-smooth bg-white text-slate-900">
      {/* ---------- Navbar ---------- */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-slate-200/70 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur-md sm:px-6">
          <a href="#home"><Logo /></a>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">{n.label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">Login</Link>
            <Link to="/register" className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition" style={{ background: '#1D4ED8' }}>Sign Up</Link>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="mx-auto mt-2 max-w-6xl rounded-2xl border border-slate-200 bg-white p-3 shadow-lg md:hidden">
            <nav className="flex flex-col">
              {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">{n.label}</a>)}
            </nav>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-bold text-slate-700">Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-center text-sm font-bold text-white" style={{ background: '#1D4ED8' }}>Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section id="home" className="px-4 pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] shadow-2xl" style={{ background: INK }}>
          <img src={heroImg} alt="Kabataan ng Barangay Tawiran" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
          {/* mobile: flat dark · desktop: navy → clear gradient */}
          <div className="absolute inset-0 sm:hidden" style={{ background: 'rgba(11,31,58,0.72)' }} />
          <div className="absolute inset-0 hidden sm:block"
            style={{ background: `linear-gradient(100deg, ${INK} 0%, ${INK} 34%, rgba(11,31,58,0.72) 52%, rgba(11,31,58,0.15) 72%, rgba(11,31,58,0) 88%)` }} />
          <div className="relative max-w-xl px-6 py-16 sm:px-12 sm:py-24 lg:py-28">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <Sun className="h-4 w-4" style={{ color: GOLD }} /> Sangguniang Kabataan · Barangay Tawiran
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              e-SK <span style={{ color: GOLD }}>Manage</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">
              A web-based project and financial management system for the Sangguniang Kabataan of
              Barangay Tawiran, Sta. Cruz, Marinduque.
            </p>
            <p className="mt-3 max-w-md text-base font-medium text-white/70">
              Better management. Greater participation. A stronger, more empowered youth.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/register"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-[#0B1F3A] shadow-lg transition hover:brightness-95"
                style={{ background: GOLD }}>
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-white/80">
                <span>Transparent</span><span className="text-white/30">·</span>
                <span>Paperless</span><span className="text-white/30">·</span>
                <span>Youth-empowered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Overview ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">What is e-SK Manage?</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              e-SK Manage is the digital home of the Sangguniang Kabataan of Barangay Tawiran. It brings the
              council’s planning, budget, and youth activities into one transparent system — so programs stay
              organized, spending is accountable, and every kabataan can take part and stay informed.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: FolderKanban, title: 'Project management', desc: 'Programs → Projects → Activities, with status and budget at every level.' },
              { icon: Wallet, title: 'Financial transparency', desc: 'Track funds and expenses openly so every peso the SK spends is accounted for.' },
              { icon: Users, title: 'Youth participation', desc: 'Join events, volunteer, earn points, and share your saloobin on finished activities.' },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}><Icon className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-bold text-slate-900">{p.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-600">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="bg-[#F7F9FC] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Everything the SK needs, in one place</h2>
            <p className="mt-3 text-lg text-slate-600">From planning and budgeting to youth participation and official reporting.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}><Icon className="h-6 w-6" /></span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Public PPA ---------- */}
      <PublicPPA />

      {/* ---------- About / mission (navy band) ---------- */}
      <section id="about" className="py-24 text-white" style={{ background: INK }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Kabataan Para sa Bukas</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/80">
              Built for the Sangguniang Kabataan of Barangay Tawiran, e-SK Manage lets young leaders run their
              programs professionally — and lets every member see the work being done on their behalf.
            </p>
            <ul className="mt-7 space-y-3 text-white/85">
              {[
                'Officers plan PPAs and generate ABYIP & CBYDP reports automatically.',
                'Treasurers record funds and expenses with full transparency.',
                'Kabataan join events, earn points, volunteer, and share their saloobin.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GOLD }} /> {t}
                </li>
              ))}
            </ul>
            <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#0B1F3A] transition hover:brightness-95" style={{ background: GOLD }}>
              Join your SK <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: '100%', v: 'Transparent budget' },
              { k: '3-yr', v: 'CBYDP planning' },
              { k: '15–30', v: 'Youth coverage' },
              { k: 'Paperless', v: 'Reports & records' },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-2xl font-black" style={{ color: GOLD }}>{s.k}</p>
                <p className="mt-1 text-sm text-white/70">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="mx-auto max-w-5xl px-6 py-24">
        <div className="grid items-stretch gap-8 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-2">
          <div className="rounded-2xl p-8 text-white" style={{ background: '#1D4ED8' }}>
            <h2 className="text-2xl font-black">Get in touch</h2>
            <p className="mt-2 text-sm text-white/80">Reach the SK office of Barangay Tawiran.</p>
            <div className="mt-7 space-y-5 text-sm">
              <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/80" /> {contact.address}</p>
              {contact.email && <p className="flex items-center gap-3"><Mail className="h-5 w-5 shrink-0 text-white/80" /> {contact.email}</p>}
              {contact.phone && <p className="flex items-center gap-3"><Phone className="h-5 w-5 shrink-0 text-white/80" /> {contact.phone}</p>}
            </div>
          </div>
          <div className="flex flex-col justify-center p-8">
            <h3 className="text-xl font-bold text-slate-900">Ready to join?</h3>
            <p className="mt-2 text-slate-600">
              Register as a kabataan member to participate in events, track programs, and earn points.
              SK officer accounts are created by the Chairperson.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95" style={{ background: '#1D4ED8' }}>
                Create account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Login</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="text-white" style={{ background: INK }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"><img src={skLogo} alt="" className="h-7 w-7 object-contain" /></div>
            <div className="leading-tight">
              <p className="font-extrabold">e-SK <span style={{ color: GOLD }}>Manage</span></p>
              <p className="text-[11px] text-white/50">Barangay Tawiran · Sta. Cruz, Marinduque</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-white/70">
            {NAV.map((n) => <a key={n.href} href={n.href} className="hover:text-white">{n.label}</a>)}
          </nav>
          <p className="text-xs text-white/40">© {YEAR} e-SK Manage</p>
        </div>
      </footer>
    </div>
  );
}