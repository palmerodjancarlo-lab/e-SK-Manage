// src/pages/admin/Settings.jsx — Head Console settings
// cspell:words kabataan kagawad Tawiran Barangay saloobin
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  UserRound, Lock, Palette, ShieldCheck, Globe, Server, Mail, MapPin, Phone, Download, Users,
  ScrollText, UserPlus, ChevronRight, Loader2, CheckCircle2, AlertTriangle, BadgeCheck, Eye,
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-store';
import { Button, Input, Spinner, AnimatedNumber } from '../../components/ui';
import SettingsShell from '../../components/account/SettingsShell';
import SettingsCard from '../../components/account/SettingsCard';
import ProfileForm from '../../components/account/ProfileForm';
import PasswordCard from '../../components/account/PasswordCard';
import ChangeEmailCard from '../../components/account/ChangeEmailCard';
import AppearanceCard from '../../components/account/AppearanceCard';
import AccountCard from '../../components/account/AccountCard';

const ROLE_LABEL = { admin: 'Head / Chairperson', sk_chairperson: 'SK Chairperson' };

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserRound, description: 'Name, contact and address' },
  { key: 'security', label: 'Sign-in & security', icon: Lock, description: 'Email and password' },
  { key: 'landing', label: 'Public contact', icon: Globe, description: 'Shown on the landing page' },
  { key: 'roles', label: 'Roles & access', icon: ShieldCheck, description: 'What each role can do' },
  { key: 'system', label: 'System', icon: Server, description: 'Status, backup and version' },
  { key: 'appearance', label: 'Appearance', icon: Palette, description: 'Light or dark theme' },
  { key: 'account', label: 'Account', icon: BadgeCheck, description: 'Role and sign out' },
];

// Mirrors the permission lists in backend/routes — keep the two in step
const ROLES_INFO = [
  { role: 'SK Chairperson', color: 'bg-[#0038A8]', perms: ['Full oversight of the system', 'Manage accounts and verify residents', 'Record funds; approve, reject and void expenses', 'Create programs and projects', 'View the audit logs'] },
  { role: 'SK Secretary', color: 'bg-sky-600', perms: ['Post announcements', 'Schedule meetings and take attendance (QR)', 'Manage rewards and award points', 'Add program photos and attendance', 'View finance records'] },
  { role: 'SK Treasurer', color: 'bg-emerald-600', perms: ['Record expenses (scan or manual)', 'Prepare financial reports', 'Schedule meetings and take attendance', 'Manage rewards and award points', 'View finance records'] },
  { role: 'SK Kagawad', color: 'bg-amber-600', perms: ['Schedule meetings and take attendance', 'Manage rewards and award points', 'Add program photos and attendance', 'View finance records'] },
  { role: 'Kabataan member', color: 'bg-[#CE1126]', perms: ['Join events and check in with QR', 'See programs and budget usage', 'RSVP, volunteer and comment', 'Manage own profile and residency document'] },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
  const sysQ = useQuery({ queryKey: ['system-info'], queryFn: async () => (await api.get('/settings/system')).data, refetchInterval: 60000, retry: false });
  const me = profileQ.data || user || {};
  const pending = sysQ.data?.counts?.pendingVerification || 0;

  if (profileQ.isLoading) {
    return <div className="flex justify-center py-24" role="status"><Spinner className="h-8 w-8 text-primary" /><span className="sr-only">Loading settings…</span></div>;
  }

  const roleText = ROLE_LABEL[me.role] || 'Administrator';
  const tabs = TABS.map((t) => (t.key === 'system' && pending ? { ...t, badge: pending } : t));

  return (
    <SettingsShell
      me={me}
      eyebrow="Head Console · Settings"
      chips={<span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold">{roleText}</span>}
      tabs={tabs}
      render={(tab) => ({
        profile: <ProfileForm key={me._id} me={me} />,
        security: <><ChangeEmailCard /><PasswordCard /></>,
        landing: <PublicContact />,
        roles: <Roles />,
        system: <SystemPanel q={sysQ} />,
        appearance: <AppearanceCard />,
        account: <AccountCard me={me} roleLabel={roleText} note="You hold the highest access level in e-SK Manage." />,
      }[tab])}
    />
  );
}

/* ───────── Public contact (landing page) with live preview ───────── */
function PublicContact() {
  const q = useQuery({ queryKey: ['public-settings'], queryFn: async () => (await api.get('/settings/public')).data.settings || {} });
  if (q.isLoading) return <div className="flex justify-center rounded-xl border border-border bg-surface py-12"><Spinner className="h-6 w-6 text-primary" /></div>;
  return <ContactForm initial={q.data || {}} />;
}

function ContactForm({ initial }) {
  const qc = useQueryClient();
  const start = { address: initial.address || '', email: initial.email || '', phone: initial.phone || '', facebook: initial.facebook || '' };
  const [saved, setSaved] = useState(start);
  const [form, setForm] = useState(start);
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const dirty = Object.keys(form).some((k) => form[k].trim() !== saved[k].trim());

  const saveM = useMutation({
    mutationFn: (p) => api.put('/settings', p),
    onSuccess: () => { toast.success('Saved — the landing page now shows this.'); setSaved(form); qc.invalidateQueries({ queryKey: ['public-settings'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save.'),
  });

  const rows = [
    { icon: MapPin, label: 'Office', value: form.address },
    { icon: Mail, label: 'Email', value: form.email },
    { icon: Phone, label: 'Phone', value: form.phone },
    { icon: Globe, label: 'Facebook', value: form.facebook.replace(/^https?:\/\/(www\.)?/i, '') },
  ].filter((r) => r.value.trim());

  return (
    <SettingsCard
      icon={Globe}
      title="Public contact details"
      description="Shown to everyone in the “Contact us” section of the landing page."
      footer={
        <>
          {dirty && <span className="mr-auto text-sm font-medium text-warning" role="status">Unsaved changes</span>}
          <Button variant="ghost" disabled={!dirty} onClick={() => setForm(saved)}>Discard</Button>
          <Button loading={saveM.isPending} disabled={!dirty} onClick={() => saveM.mutate(form)}>Save & publish</Button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <Input label="Office address" name="address" value={form.address} onChange={on} leftIcon={<MapPin className="h-4 w-4" />} placeholder="SK Office, Barangay Tawiran, Sta. Cruz, Marinduque" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Public email" name="email" type="email" value={form.email} onChange={on} leftIcon={<Mail className="h-4 w-4" />} placeholder="sktawiran@gmail.com" />
            <Input label="Phone / contact line" name="phone" type="tel" value={form.phone} onChange={on} leftIcon={<Phone className="h-4 w-4" />} placeholder="0912 345 6789" />
          </div>
          <Input label="Facebook page (optional)" name="facebook" value={form.facebook} onChange={on} leftIcon={<Globe className="h-4 w-4" />} placeholder="facebook.com/SKTawiran" />
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-subtle"><Eye aria-hidden="true" className="h-3.5 w-3.5" /> Live preview</p>
          <div className="rounded-lg border border-border bg-bg p-4">
            <p className="text-sm font-bold text-fg">Contact us</p>
            <ul className="mt-3 space-y-3">
              {rows.length === 0 && <li className="text-xs text-subtle">Nothing to show yet.</li>}
              {rows.map(({ icon, label, value }) => {
                const RowIcon = icon;
                return (
                <li key={label} className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><RowIcon aria-hidden="true" className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0"><span className="block text-[11px] text-subtle">{label}</span><span className="block break-words text-xs font-semibold text-fg">{value}</span></span>
                </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

/* ───────── Roles overview ───────── */
function Roles() {
  return (
    <SettingsCard icon={ShieldCheck} title="Roles & access" description="Roles are assigned when an account is created. The server enforces the same rules shown here.">
      <div className="grid gap-4 md:grid-cols-2">
        {ROLES_INFO.map((r) => (
          <div key={r.role} className="rounded-lg border border-border p-4 transition-shadow hover:shadow-pop">
            <p className="flex items-center gap-2 font-semibold text-fg"><span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', r.color)} />{r.role}</p>
            <ul className="mt-3 space-y-1.5">
              {r.perms.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-muted"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

/* ───────── System: status, quick actions, backup, version ───────── */
const fmtUptime = (sec) => {
  const s = Number(sec) || 0;
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

function SystemPanel({ q }) {
  const [exporting, setExporting] = useState(false);
  const d = q.data || {};
  const c = d.counts || {};
  const online = d.status === 'ok';
  const dbOk = d.db === 'connected';
  const allGood = online && dbOk;

  const exportBackup = async () => {
    setExporting(true);
    try {
      const [members, programs, meetings] = await Promise.all([
        api.get('/auth/members').then((r) => r.data.users || r.data).catch(() => []),
        api.get('/programs').then((r) => r.data.programs || r.data).catch(() => []),
        api.get('/meetings').then((r) => r.data.meetings || r.data).catch(() => []),
      ]);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), barangay: 'Tawiran', members, programs, meetings }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `esk-backup-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded. It contains personal data — store it securely.');
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const ACTIONS = [
    { to: '/admin/users', icon: Users, label: 'Verify members', sub: 'Review residency documents', badge: c.pendingVerification },
    { to: '/admin/create-sk', icon: UserPlus, label: 'Create SK account', sub: 'Add an officer' },
    { to: '/admin/logs', icon: ScrollText, label: 'Audit logs', sub: 'Everything that happened' },
  ];

  return (
    <>
      <SettingsCard icon={Server} title="System status" description={q.isLoading ? 'Checking…' : d.lastChecked ? `Checked ${new Date(d.lastChecked).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} · refreshes every minute` : 'Live health of the server and database.'}>
        <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3', allGood ? 'bg-success/10' : 'bg-danger/10')} role="status">
          {q.isLoading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted" />
            : allGood ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" /> : <AlertTriangle aria-hidden="true" className="h-5 w-5 text-danger" />}
          <p className="text-sm font-semibold text-fg">{q.isLoading ? 'Checking the system…' : allGood ? 'All systems are operating normally.' : 'Something needs attention.'}</p>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[['Application server', online], ['Database connection', dbOk]].map(([label, ok]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-fg"><span aria-hidden="true" className={cn('h-2 w-2 rounded-full', ok ? 'bg-success' : 'bg-danger')} />{label}</dt>
              <dd className={cn('text-xs font-bold', ok ? 'text-success' : 'text-danger')}>{q.isLoading ? '…' : ok ? 'Healthy' : 'Down'}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Members', c.totalUsers], ['Awaiting verification', c.pendingVerification, true], ['Programs', c.programs], ['Upcoming events', c.upcomingMeetings]].map(([label, value, warn]) => (
            <div key={label} className={cn('rounded-lg p-3', warn && value > 0 ? 'bg-warning/10 ring-1 ring-warning/30' : 'bg-surface2/70')}>
              <dd className={cn('text-xl font-bold tabular-nums', warn && value > 0 ? 'text-warning' : 'text-fg')}><AnimatedNumber value={value ?? 0} /></dd>
              <dt className="text-xs text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </SettingsCard>

      <SettingsCard icon={ChevronRight} title="Quick actions" description="Common administration tasks.">
        <ul className="-mx-2 divide-y divide-border">
          {ACTIONS.map(({ to, icon, label, sub, badge }) => {
            const ActionIcon = icon;
            return (
            <li key={to}>
              <Link to={to} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ActionIcon aria-hidden="true" className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-fg">{label}</span><span className="block text-xs text-muted">{sub}</span></span>
                {badge > 0 ? <span className="rounded-md bg-warning px-2 py-0.5 text-xs font-bold text-warning-fg">{badge}</span> : <ChevronRight aria-hidden="true" className="h-4 w-4 text-subtle" />}
              </Link>
            </li>
            );
          })}
        </ul>
      </SettingsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard icon={Download} title="Backup" description="Download members, programs and meetings as a JSON file."
          footer={<Button variant="outline" loading={exporting} onClick={exportBackup}><Download className="h-4 w-4" /> Export data</Button>}>
          <p className="text-sm text-muted">The file includes members’ personal information. Keep it in a secure place and do not share it.</p>
        </SettingsCard>
        <SettingsCard icon={Server} title="Version" description="About this installation.">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Application</dt><dd className="font-semibold text-fg">v{d.version || '1.0.0'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Environment</dt><dd className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-semibold capitalize text-fg">{d.environment || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Uptime</dt><dd className="font-semibold text-fg">{d.uptimeSeconds != null ? fmtUptime(d.uptimeSeconds) : '—'}</dd></div>
          </dl>
        </SettingsCard>
      </div>
    </>
  );
}
