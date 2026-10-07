// src/pages/admin/Settings.jsx — Head Console settings
// cspell:words kabataan kagawad Tawiran Barangay Purok sitio saloobin
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  User, Lock, Palette, ShieldCheck, LogOut, Camera, Eye, EyeOff,
  Sun, Moon, Mail, MapPin, BadgeCheck, Loader2, Phone, Globe,
  Download, Users, ScrollText, UserPlus, ChevronRight, KeyRound,
  Settings, Monitor, CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-store';
import {
  Card, CardContent, Button, Input, Spinner, Avatar, Badge,
} from '../../components/ui';

const ROLE_LABEL = {
  admin: 'Head / Chairperson', sk_chairperson: 'SK Chairperson',
  sk_secretary: 'SK Secretary', sk_treasurer: 'SK Treasurer', sk_kagawad: 'SK Kagawad',
};
const roleText = (r) => ROLE_LABEL[r] || 'Administrator';

const TABS = [
  { k: 'profile', label: 'Profile', icon: User },
  { k: 'contact', label: 'Landing Contact', icon: Phone },
  { k: 'roles', label: 'Roles', icon: ShieldCheck },
  { k: 'security', label: 'Security', icon: Lock },
  { k: 'appearance', label: 'Appearance', icon: Palette },
  { k: 'account', label: 'Account', icon: User },
];

const ROLES_INFO = [
  { role: 'SK Chairperson', tone: 'bg-indigo-50 text-indigo-700', perms: ['Full system oversight', 'Manage accounts & verify residents', 'Approve finances & expenses', 'Manage programs, meetings, announcements', 'View the audit trail'] },
  { role: 'SK Secretary', tone: 'bg-sky-50 text-sky-700', perms: ['Post announcements & schedule meetings', 'Record minutes & attendance', 'Manage documents', 'View all SK records'] },
  { role: 'SK Treasurer', tone: 'bg-emerald-50 text-emerald-700', perms: ['Manage funds, budget & expenses', 'Record financial transactions', 'Generate financial reports', 'View all SK records'] },
  { role: 'SK Kagawad', tone: 'bg-amber-50 text-amber-700', perms: ['Record attendance', 'Support committee work', 'View all SK records'] },
  { role: 'Kabataan Member', tone: 'bg-slate-100 text-slate-600', perms: ['Join events & check in for points', 'View programs & budget usage', 'Volunteer & post saloobin', 'Edit own profile'] },
];

function applyTheme(dark) {
  try {
    document.documentElement.classList.toggle('dark', !!dark);
    localStorage.setItem('esk-theme', dark ? 'dark' : 'light');
  } catch { /* ignore */ }
}
function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtUptime(sec) {
  const s = Number(sec) || 0;
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function SectionHead({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <div>
        <h4 className="text-base font-bold text-fg">{title}</h4>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('profile');

  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/auth/profile')).data.user,
  });
  const me = profileQ.data || user || {};

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── main column ── */}
      <div className="min-w-0 space-y-5">
        {/* title */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-sm"><Settings className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fg">System Settings</h1>
            <p className="text-sm text-muted">Manage your account, the public landing page, and the system.</p>
          </div>
        </div>

        {/* tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.k;
              return (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={cn('inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-semibold transition',
                    active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg')}>
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* content */}
        {profileQ.isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        ) : tab === 'profile' ? (
          <ProfileSection me={me} onSaved={() => qc.invalidateQueries({ queryKey: ['profile'] })} />
        ) : tab === 'contact' ? (
          <ContactSection />
        ) : tab === 'roles' ? (
          <RolesSection />
        ) : tab === 'security' ? (
          <SecuritySection />
        ) : tab === 'appearance' ? (
          <AppearanceSection />
        ) : (
          <AccountSection me={me} logout={logout} />
        )}
      </div>

      {/* ── right rail ── */}
      <SystemRail onEditContact={() => setTab('contact')} />
    </div>
  );
}

/* ───────────────── Right rail ───────────────── */
function StatusRow({ label, ok }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2.5 text-sm font-medium text-fg">
        <span className={cn('h-2 w-2 rounded-full', ok ? 'bg-emerald-500' : 'bg-rose-500')} /> {label}
      </span>
      <span className={cn('text-xs font-bold', ok ? 'text-emerald-600' : 'text-rose-600')}>{ok ? 'Healthy' : 'Down'}</span>
    </div>
  );
}
function MiniStat({ label, value, highlight }) {
  const warn = highlight && Number(value) > 0;
  return (
    <div className={cn('rounded-xl p-3', warn ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-surface2')}>
      <p className={cn('text-lg font-black tabular-nums', warn ? 'text-amber-700' : 'text-fg')}>{value ?? 0}</p>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
    </div>
  );
}
function ActionRow({ to, onClick, icon, label, sub, badge, loading }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{label}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
      {badge ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{badge}</span> : <ChevronRight className="h-4 w-4 text-subtle" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface2 disabled:opacity-60';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button onClick={onClick} disabled={loading} className={cls}>{inner}</button>;
}

function SystemRail({ onEditContact }) {
  const [exporting, setExporting] = useState(false);
  const sys = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => (await api.get('/settings/system')).data,
    refetchInterval: 60000,
    retry: false,
  });
  const d = sys.data || {};
  const c = d.counts || {};
  const online = d.status === 'ok';
  const dbOk = d.db === 'connected';
  const checkedAt = d.lastChecked ? new Date(d.lastChecked).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : null;

  const exportBackup = async () => {
    setExporting(true);
    try {
      const [members, programs, meetings] = await Promise.all([
        api.get('/auth/members').then((r) => r.data.users || r.data).catch(() => []),
        api.get('/programs').then((r) => r.data.programs || r.data).catch(() => []),
        api.get('/meetings').then((r) => r.data.meetings || r.data).catch(() => []),
      ]);
      const payload = { exportedAt: new Date().toISOString(), barangay: 'Tawiran', members, programs, meetings };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `esk-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded.');
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      {/* System status */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-fg"><Monitor className="h-4 w-4 text-primary" /> System Status</p>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', online ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
              {sys.isLoading ? '…' : online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="divide-y divide-border">
            <StatusRow label="Application Server" ok={online} />
            <StatusRow label="Database Connection" ok={dbOk} />
          </div>
          {online && dbOk && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">All systems are operating normally.</p>
                {checkedAt && <p className="text-[11px] text-emerald-700/80">Last checked {checkedAt}</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <MiniStat label="Members" value={c.totalUsers} />
            <MiniStat label="Pending verify" value={c.pendingVerification} highlight />
            <MiniStat label="Programs" value={c.programs} />
            <MiniStat label="Upcoming events" value={c.upcomingMeetings} />
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardContent className="space-y-1">
          <p className="mb-1 px-1 text-sm font-bold text-fg">Quick Actions</p>
          <ActionRow to="/admin/users" icon={<Users className="h-4 w-4" />} label="Verify members" sub="Review residency & approve" badge={c.pendingVerification > 0 ? c.pendingVerification : undefined} />
          <ActionRow to="/admin/create-sk" icon={<UserPlus className="h-4 w-4" />} label="Create SK account" sub="Add an officer" />
          <ActionRow to="/admin/logs" icon={<ScrollText className="h-4 w-4" />} label="Audit trail" sub="System activity log" />
          <ActionRow onClick={onEditContact} icon={<Phone className="h-4 w-4" />} label="Edit landing contact" sub="What the public sees" />
          <ActionRow onClick={exportBackup} loading={exporting} icon={<Download className="h-4 w-4" />} label={exporting ? 'Preparing…' : 'Export data'} sub="Download a backup file" />
        </CardContent>
      </Card>

      {/* Version */}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-bold text-fg">Version Information</p>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><dt className="text-muted">Application</dt><dd className="font-semibold text-fg">v{d.version || '1.0.0'}</dd></div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Environment</dt>
              <dd><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold capitalize text-emerald-700">{d.environment || '—'}</span></dd>
            </div>
            <div className="flex items-center justify-between"><dt className="text-muted">Uptime</dt><dd className="font-semibold text-fg">{d.uptimeSeconds != null ? fmtUptime(d.uptimeSeconds) : '—'}</dd></div>
          </dl>
        </CardContent>
      </Card>
    </aside>
  );
}

/* ───────────────── Roles overview ───────────────── */
function RolesSection() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <SectionHead icon={<ShieldCheck className="h-5 w-5" />} title="Roles & access" subtitle="What each role can do. Roles are assigned when an account is created." />
        <div className="space-y-4">
          {ROLES_INFO.map((r) => (
            <div key={r.role} className="rounded-2xl border border-border p-4">
              <span className={cn('inline-flex rounded-full px-3 py-1 text-sm font-bold', r.tone)}>{r.role}</span>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {r.perms.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-fg"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────── Profile ───────────────── */
function ProfileSection({ me, onSaved }) {
  const { setUser } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(me.photo || '');
  const [form, setForm] = useState({
    firstName: me.firstName || '', lastName: me.lastName || '',
    contactNumber: me.contactNumber || '', address: me.address || '',
    purok: me.purok || '', photo: me.photo || '',
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveM = useMutation({
    mutationFn: (p) => api.put('/auth/profile', p),
    onSuccess: (res) => { if (res?.data?.user) setUser(res.data.user); toast.success('Profile updated.'); onSaved(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save.'),
  });

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // instant local preview so the change is visible right away
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data.url || data.photo || data.secure_url;
      const res = await api.put('/auth/profile', { ...form, photo: url });
      setForm((f) => ({ ...f, photo: url }));
      const u = res?.data?.user;
      if (u) {
        // cache-bust so the sidebar/header reload the image even if the URL is unchanged
        const busted = u.photo ? `${u.photo}${u.photo.includes('?') ? '&' : '?'}t=${Date.now()}` : u.photo;
        setUser({ ...u, photo: busted });
        setPreview(busted);
      }
      toast.success('Photo updated.');
      onSaved();
    } catch (err) {
      setPreview(me.photo || '');
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        <SectionHead icon={<User className="h-5 w-5" />} title="Profile" subtitle="Update your personal information." />
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={`${form.firstName} ${form.lastName}`} src={preview || form.photo} size="xl" />
            {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></span>}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Camera className="h-4 w-4" /> Change photo</Button>
            <p className="mt-1 text-xs text-subtle">JPG or PNG. Square images look best.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" name="firstName" value={form.firstName} onChange={on} />
          <Input label="Last name" name="lastName" value={form.lastName} onChange={on} />
          <Input label="Contact number" name="contactNumber" value={form.contactNumber} onChange={on} placeholder="09xxxxxxxxx" />
          <Input label="Purok" name="purok" value={form.purok} onChange={on} placeholder="e.g. Purok 1" />
        </div>
        <Input label="Address" name="address" value={form.address} onChange={on} placeholder="Street / sitio, Barangay Tawiran" />
        <div className="flex justify-end">
          <Button loading={saveM.isPending} onClick={() => saveM.mutate(form)} disabled={!form.firstName || !form.lastName}>Save changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────── Landing Contact ───────────────── */
function ContactSection() {
  const q = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/settings/public')).data.settings || {},
  });
  if (q.isLoading) return <Card><CardContent><div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-primary" /></div></CardContent></Card>;
  return <ContactForm initial={q.data || {}} />;
}

function ContactForm({ initial }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    address: initial.address || '', email: initial.email || '',
    phone: initial.phone || '', facebook: initial.facebook || '',
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveM = useMutation({
    mutationFn: (p) => api.put('/settings', p),
    onSuccess: () => { toast.success('Contact info updated. It now shows on the landing page.'); qc.invalidateQueries({ queryKey: ['public-settings'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save.'),
  });

  return (
    <Card>
      <CardContent className="space-y-6">
        <SectionHead icon={<Phone className="h-5 w-5" />} title="Landing page contact" subtitle="What visitors see in the “Get in touch” section of the public landing page." />
        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><MapPin className="h-3.5 w-3.5" /> Office address</label>
            <Input name="address" value={form.address} onChange={on} placeholder="SK Office, Barangay Tawiran, Sta. Cruz, Marinduque" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><Mail className="h-3.5 w-3.5" /> Email</label>
              <Input name="email" value={form.email} onChange={on} placeholder="sktawiran@gmail.com" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><Phone className="h-3.5 w-3.5" /> Phone / contact line</label>
              <Input name="phone" value={form.phone} onChange={on} placeholder="e.g. 0912 345 6789" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><Globe className="h-3.5 w-3.5" /> Facebook page (optional)</label>
            <Input name="facebook" value={form.facebook} onChange={on} placeholder="facebook.com/SKTawiran" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button loading={saveM.isPending} onClick={() => saveM.mutate(form)}>Save contact info</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────── Security ───────────────── */
function SecuritySection() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const m = useMutation({
    mutationFn: (p) => api.put('/auth/change-password', p),
    onSuccess: () => { toast.success('Password changed.'); setForm({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  const submit = () => {
    if (form.newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    if (form.newPassword !== form.confirm) return toast.error('Passwords do not match.');
    m.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <SectionHead icon={<Lock className="h-5 w-5" />} title="Security" subtitle="Change your account password." />
          <Button variant="ghost" size="sm" onClick={() => setShow((s) => !s)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? 'Hide' : 'Show'}</Button>
        </div>
        <div className="grid max-w-md gap-4">
          <Input label="Current password" name="currentPassword" type={show ? 'text' : 'password'} value={form.currentPassword} onChange={on} />
          <Input label="New password" name="newPassword" type={show ? 'text' : 'password'} value={form.newPassword} onChange={on} />
          <Input label="Confirm new password" name="confirm" type={show ? 'text' : 'password'} value={form.confirm} onChange={on} />
        </div>
        <div className="flex justify-end">
          <Button loading={m.isPending} onClick={submit} disabled={!form.currentPassword || !form.newPassword}><KeyRound className="h-4 w-4" /> Update password</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────── Appearance ───────────────── */
function AppearanceSection() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('esk-theme') === 'dark'; } catch { return false; }
  });
  const choose = (val) => { setDark(val); applyTheme(val); };
  const OPTIONS = [{ v: false, label: 'Light', icon: Sun }, { v: true, label: 'Dark', icon: Moon }];

  return (
    <Card>
      <CardContent className="space-y-6">
        <SectionHead icon={<Palette className="h-5 w-5" />} title="Appearance" subtitle="Choose how e-SK Manage looks on this device." />
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = dark === o.v;
            return (
              <button key={o.label} onClick={() => choose(o.v)}
                className={cn('flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition', active ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-surface2')}>
                <Icon className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted')} />
                <span className={cn('text-sm font-semibold', active ? 'text-primary' : 'text-fg')}>{o.label}</span>
                {active && <BadgeCheck className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-subtle">Your theme choice is saved on this device.</p>
      </CardContent>
    </Card>
  );
}

/* ───────────────── Account ───────────────── */
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface2 text-subtle">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-semibold text-fg">{value || '—'}</p>
      </div>
    </div>
  );
}

function AccountSection({ me, logout }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHead icon={<ShieldCheck className="h-5 w-5" />} title="Account information" subtitle="Your account details in e-SK Manage." />
          <div className="mt-4 divide-y divide-border">
            <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={roleText(me.role)} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={me.email} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Barangay" value={`${me.barangay || 'Tawiran'}, ${me.municipality || 'Santa Cruz'}`} />
            <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Member since" value={fmtDate(me.createdAt)} />
          </div>
          <div className="mt-3"><Badge variant="info">You hold the highest access level in e-SK Manage.</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-fg">Sign out</p>
            <p className="text-sm text-muted">End your session on this device.</p>
          </div>
          <Button variant="outline" onClick={logout} className="text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" /> Log out</Button>
        </CardContent>
      </Card>
    </div>
  );
}