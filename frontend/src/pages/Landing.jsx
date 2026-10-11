// src/pages/Landing.jsx — public website of the Sangguniang Kabataan of Barangay Tawiran
// cspell:words Sangguniang Kabataan Tawiran Marinduque ABYIP CBYDP Katipunan Purok
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Menu, X, ArrowRight, MapPin, Mail, Phone, CalendarDays, Clock, Megaphone, LayoutDashboard,
  Users, GraduationCap, HeartPulse, Briefcase, Leaf, Trophy, ShieldHalf, Shapes,
  Coins, Target, CalendarRange, Sparkles, ChevronRight, Wallet, FolderKanban, QrCode, Gift,
} from 'lucide-react';
import { Reveal } from '../components/ui';
import api from '../lib/api';
import { useAuth } from '../context/auth-store';
import { homePath } from '../lib/roles';
import { SK_NAME, SK_LOCATION, SLOGAN } from '../lib/brand';
import skLogo from '../assets/sk-logo.svg';
import heroBg from '../assets/tawiran-coast.svg';

const YEAR = new Date().getFullYear();

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#updates', label: 'Updates' },
  { href: '#programs', label: 'Programs' },
  { href: '#join', label: 'Join' },
  { href: '#contact', label: 'Contact' },
];

const DEFAULT_CONTACT = {
  address: 'SK Office, Barangay Tawiran, Sta. Cruz, Marinduque',
  email: 'sktawiran@gmail.com',
  phone: '',
  facebook: '',
};

const FACTS = [
  { k: '15–30', v: 'Age of Katipunan ng Kabataan members', icon: Users },
  { k: '10%', v: 'Of the barangay fund allotted to the SK', icon: Coins },
  { k: 'CBYDP', v: '3-year youth development plan', icon: Target },
  { k: 'ABYIP', v: 'Annual youth investment program', icon: CalendarRange },
];

const STEPS = [
  { title: 'Create an account', desc: 'Enter your details and Purok. Open to residents aged 15–30.' },
  { title: 'Confirm your email', desc: 'Type in the code we send to your email address.' },
  { title: 'Submit proof of residency', desc: 'Upload a valid ID or residency document.' },
  { title: 'Get approved', desc: 'The SK Chairperson reviews and activates your account.' },
];

const CATEGORY_ICON = {
  'Youth Development': Users,
  Health: HeartPulse,
  Livelihood: Briefcase,
  Education: GraduationCap,
  Environment: Leaf,
  Sports: Trophy,
  'Peace and Order': ShieldHalf,
};

const STATUS_STYLE = {
  planned: 'bg-amber-50 text-amber-800',
  ongoing: 'bg-blue-50 text-blue-800',
  completed: 'bg-emerald-50 text-emerald-800',
};

const fmtDate = (d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-PH', opts) : '';

const fmtRange = (a, b) => {
  if (!a) return '';
  return b && fmtDate(b) !== fmtDate(a) ? `${fmtDate(a)} – ${fmtDate(b)}` : fmtDate(a);
};

const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const withProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// Settings may contain empty strings — those must not wipe out the defaults.
const mergeContact = (data = {}) => {
  const out = { ...DEFAULT_CONTACT };
  Object.entries(data).forEach(([k, v]) => { if (typeof v === 'string' && v.trim()) out[k] = v.trim(); });
  return out;
};

function FacebookIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function Brand({ light = false }) {
  return (
    <span className="flex items-center gap-3">
      <img src={skLogo} alt="" className="h-10 w-10 shrink-0 object-contain" />
      <span className="leading-tight">
        <span className={`block text-[15px] font-bold ${light ? 'text-white' : 'text-slate-900'}`}>Sangguniang Kabataan</span>
        <span className={`block text-xs ${light ? 'text-white/60' : 'text-slate-500'}`}>Barangay Tawiran, Sta. Cruz</span>
      </span>
    </span>
  );
}

// The SK logo's blue, red and yellow as a small accent
function SkStripe({ className = '', animate = false }) {
  return (
    <span aria-hidden="true" className={`flex h-1.5 w-16 overflow-hidden rounded-full ${animate ? 'origin-left animate-grow-x' : ''} ${className}`}>
      <span className="flex-1 bg-[#0038A8]" /><span className="flex-1 bg-[#CE1126]" /><span className="flex-1 bg-[#FCD116]" />
    </span>
  );
}

// What a registered member can do in the Kabataan portal
const PORTAL = [
  { icon: Wallet, title: 'See where the budget goes', desc: 'Approved SK spending by category, and the budget the SK publishes for the year.' },
  { icon: FolderKanban, title: 'Follow every program', desc: 'Status, progress updates and photos of the programs, projects and activities.' },
  { icon: QrCode, title: 'Join events, check in by QR', desc: 'RSVP or volunteer, then scan the QR code at the venue to record your attendance.' },
  { icon: Gift, title: 'Earn points, claim rewards', desc: 'Every activity you attend earns points you can redeem for rewards from the SK.' },
];

function SectionHeading({ title, desc }) {
  return (
    <Reveal className="max-w-2xl">
      <SkStripe className="mb-4" />
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {desc && <p className="mt-3 text-base leading-relaxed text-slate-600">{desc}</p>}
    </Reveal>
  );
}

/* Floating card on the hero with the SK's next scheduled activity (live data) */
function NextActivityCard() {
  const q = useQuery({ queryKey: ['public-overview'], retry: false, queryFn: async () => (await api.get('/public/overview')).data });
  const next = q.data?.events?.[0];
  return (
    <div className="w-72 animate-drift rounded-xl border border-white/20 bg-brand/75 p-5 text-white shadow-pop backdrop-blur-md">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> {next ? 'Next activity' : 'Get involved'}
      </p>
      {next ? (
        <>
          <p className="mt-2 text-lg font-bold leading-snug">{next.title}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80"><CalendarDays aria-hidden="true" className="h-4 w-4" />{fmtDate(next.date, { weekday: 'short', month: 'long', day: 'numeric' })}{next.time ? ` · ${next.time}` : ''}</p>
          {next.venue && <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80"><MapPin aria-hidden="true" className="h-4 w-4" />{next.venue}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-white/85">Join events, earn participation points, and help shape the programs for the youth of Tawiran.</p>
      )}
      <a href="#updates" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline">
        See all activities <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  );
}

function EmptyNote({ title, desc }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-6 text-sm">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-0.5 text-slate-500">{desc}</p>
    </div>
  );
}

/* ---------- Announcements & upcoming activities ---------- */
function Updates() {
  const q = useQuery({
    queryKey: ['public-overview'],
    retry: false,
    queryFn: async () => (await api.get('/public/overview')).data,
  });
  const announcements = q.data?.announcements || [];
  const events = q.data?.events || [];

  return (
    <section id="updates" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading title="Announcements & activities" desc="Official notices and upcoming activities of the Sangguniang Kabataan." />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Megaphone className="h-4 w-4" /> Announcements</h3>
            <div className="mt-3 space-y-3">
              {q.isLoading ? (
                [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-white" />)
              ) : announcements.length === 0 ? (
                <EmptyNote title="No announcements yet" desc="Official notices from the SK will be posted here." />
              ) : (
                announcements.map((a, i) => (
                  <Reveal as="article" key={a._id} delay={i * 80} className="rounded-lg border border-slate-200 bg-white p-5 transition-shadow hover:shadow-pop">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-blue-700">{a.category}</span>
                      <span className="mx-1.5">·</span>
                      <time dateTime={a.createdAt}>{fmtDate(a.createdAt, { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                    </p>
                    <h4 className="mt-1.5 font-semibold text-slate-900">{a.title}</h4>
                    {a.body && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.body}</p>}
                  </Reveal>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-500"><CalendarDays className="h-4 w-4" /> Upcoming activities</h3>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white">
              {q.isLoading ? (
                <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />)}</div>
              ) : events.length === 0 ? (
                <div className="px-5 py-6 text-sm">
                  <p className="font-semibold text-slate-700">No scheduled activities</p>
                  <p className="mt-0.5 text-slate-500">Upcoming meetings and events will appear here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {events.map((e) => (
                    <li key={e._id} className="group flex gap-4 p-4 transition-colors hover:bg-slate-50">
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-md border border-slate-200 bg-white py-1.5 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50">
                        <span className="text-[10px] font-semibold uppercase text-blue-700">{fmtDate(e.date, { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-tight text-slate-900">{fmtDate(e.date, { day: 'numeric' })}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{e.title}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span>{e.type}</span>
                          {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.time}</span>}
                          {e.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.venue}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Programs ---------- */
function Programs() {
  const q = useQuery({
    queryKey: ['public-programs'],
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/programs/public');
      return Array.isArray(data) ? data : data.programs || data.data || [];
    },
  });
  const programs = (Array.isArray(q.data) ? q.data : []).filter((p) => p.status !== 'cancelled');

  return (
    <section id="programs" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading title="Programs for the youth" desc="Programs, projects, and activities the SK is planning and carrying out for the kabataan of Tawiran." />

        {q.isLoading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : programs.length === 0 ? (
          <div className="mt-10"><EmptyNote title="No programs published yet" desc="Once the SK posts its programs, you can follow their progress here." /></div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.slice(0, 6).map((p, idx) => {
              const Icon = CATEGORY_ICON[p.category] || Shapes;
              const projects = p.projects || [];
              const activities = projects.reduce((n, pr) => n + (pr.activities || []).length, 0);
              const photo = p.photos?.[0]?.url;
              return (
                <Reveal as="article" key={p._id} delay={(idx % 3) * 90} className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-pop">
                  <div className="flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50">
                    {photo
                      ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <Icon aria-hidden="true" className="h-10 w-10 text-blue-300 transition-transform duration-300 group-hover:scale-110" />}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-blue-700">{p.category || 'Program'}</span>
                      {p.status && <span className={`rounded px-2 py-0.5 font-semibold ${STATUS_STYLE[p.status] || 'bg-slate-100 text-slate-700'}`}>{capitalize(p.status)}</span>}
                    </div>
                    <h3 className="mt-2 font-semibold leading-snug text-slate-900">{p.title}</h3>
                    {p.description && <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600">{p.description}</p>}
                    <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
                      <span>{activities} {activities === 1 ? 'activity' : 'activities'}</span>
                      {p.startDate && <span>{fmtRange(p.startDate, p.endDate)}</span>}
                    </p>
                  </div>
                </Reveal>
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
  const { user } = useAuth();

  const contactQ = useQuery({
    queryKey: ['public-settings'],
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/settings/public');
      return data.settings || data || {};
    },
  });
  const contact = mergeContact(contactQ.data);
  const dashboard = user ? homePath(user.role) : null;

  const authActions = dashboard ? (
    <Link to={dashboard} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
      <LayoutDashboard className="h-4 w-4" /> Dashboard
    </Link>
  ) : (
    <>
      <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:border-transparent">Log in</Link>
      <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Register</Link>
    </>
  );

  const contactRows = [
    { icon: MapPin, label: 'Office', value: contact.address },
    contact.email && { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { icon: Phone, label: 'Phone', value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` },
    contact.facebook && { icon: FacebookIcon, label: 'Facebook', value: contact.facebook.replace(/^https?:\/\/(www\.)?/i, ''), href: withProtocol(contact.facebook), external: true },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" aria-label="Back to top"><Brand /></a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">{n.label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-1 lg:flex">{authActions}</div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{n.label}</a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 [&>*:only-child]:col-span-2">
              {authActions}
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden bg-[#0F2740]">
          <img src={heroBg} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_85%]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0F2740]/90 via-[#0F2740]/80 to-[#0F2740]/60 lg:via-[#0F2740]/60 lg:to-[#0F2740]/0" />
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-10 px-4 pb-28 pt-20 sm:px-6 sm:pb-32 sm:pt-24 lg:pb-36 lg:pt-28">
            <div className="max-w-xl">
              <p className="animate-fade-up text-sm font-medium text-white/70">{SK_LOCATION}</p>
              <h1 className="mt-2 animate-fade-up text-3xl font-bold leading-tight tracking-tight text-white [animation-delay:80ms] sm:text-4xl lg:text-5xl">{SK_NAME}</h1>
              <SkStripe animate className="mt-5 w-24 [animation-delay:300ms]" />
              <p className="mt-4 animate-fade-up text-lg font-medium text-amber-200 [animation-delay:200ms]">{SLOGAN}</p>
              <p className="mt-4 max-w-lg animate-fade-up text-base leading-relaxed text-white/80 [animation-delay:280ms]">
                Stay informed about SK programs, announcements, and activities — and take part as a
                registered member of the Katipunan ng Kabataan.
              </p>
              <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:360ms]">
                <Link to={dashboard || '/register'} className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-pop transition-transform hover:-translate-y-0.5 hover:bg-slate-50">
                  {dashboard ? 'Go to dashboard' : 'Register as member'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#programs" className="inline-flex items-center rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10">
                  View programs
                </a>
              </div>
            </div>
            <div className="hidden animate-fade-up [animation-delay:500ms] lg:block">
              <NextActivityCard />
            </div>
          </div>
          {/* soft wave into the page */}
          <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-12 w-full text-white sm:h-16">
            <path fill="currentColor" d="M0 48c160 26 320 32 480 18S800 6 960 10s320 34 480 38v32H0z" />
          </svg>
        </section>

        {/* ---------- About ---------- */}
        <section id="about" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <SectionHeading title="About the SK" />
              <div className="mt-4 space-y-4 leading-relaxed text-slate-600">
                <p>
                  The Sangguniang Kabataan of Barangay Tawiran is the youth council of the barangay, elected by
                  the Katipunan ng Kabataan — all residents aged 15 to 30. Under Republic Act No. 10742, it
                  leads youth development programs in the community.
                </p>
                <p>
                  Its work is guided by the Comprehensive Barangay Youth Development Plan (CBYDP) and the Annual
                  Barangay Youth Investment Program (ABYIP), covering education, health, livelihood, sports,
                  the environment, and active citizenship.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              {FACTS.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.k} delay={i * 90} className="group rounded-xl border border-slate-200 bg-white p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-pop sm:p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-700 group-hover:text-white">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <dd className="mt-4 text-2xl font-bold text-slate-900">{f.k}</dd>
                    <dt className="mt-1 text-sm text-slate-500">{f.v}</dt>
                  </Reveal>
                );
              })}
            </dl>
          </div>
        </section>

        <Updates />
        <Programs />

        {/* ---------- What members can do in the portal ---------- */}
        <section id="portal" className="scroll-mt-20 border-t border-slate-200 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading title="Your SK, open to you" desc="Registered members get their own portal — see what the SK is doing and take part, from any phone." />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PORTAL.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal as="li" key={f.title} delay={i * 90} className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-pop sm:p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                    <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- How to join ---------- */}
        <section id="join" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading title="How to become a member" desc="Residents of Barangay Tawiran aged 15 to 30 can register online." />
              {!dashboard && (
                <Link to="/register" className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 sm:self-auto">
                  Register now <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <ol className="relative mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* line linking the steps on wide screens */}
              <span aria-hidden="true" className="absolute left-[12%] right-[12%] top-[38px] hidden h-0.5 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 lg:block" />
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 110} className="relative rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-pop">
                  <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white ring-4 ring-blue-100">{i + 1}</span>
                  <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section id="contact" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-16">
            <SectionHeading title="Contact us" desc="For questions about programs, membership, or other SK concerns, reach the SK office of Barangay Tawiran." />
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {contactRows.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.label} className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-50 sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{row.label}</p>
                      {row.href ? (
                        <a href={row.href} {...(row.external ? { target: '_blank', rel: 'noreferrer' } : {})} className="break-words font-medium text-slate-900 hover:text-blue-700">{row.value}</a>
                      ) : (
                        <p className="font-medium text-slate-900">{row.value}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="bg-[#0F2740] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Brand light />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70" aria-label="Footer">
            {NAV.map((n) => <a key={n.href} href={n.href} className="hover:text-white">{n.label}</a>)}
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">
            © {YEAR} {SK_NAME} · {SLOGAN}
          </p>
        </div>
      </footer>
    </div>
  );
}
