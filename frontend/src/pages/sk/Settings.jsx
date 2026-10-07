// src/pages/sk/Settings.jsx — SK officer account settings
// cspell:words kabataan kagawad Tawiran Barangay Purok sitio
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  User, Lock, Palette, ShieldCheck, LogOut, Camera, Eye, EyeOff,
  Sun, Moon, Mail, MapPin, Cake, Phone, BadgeCheck, Loader2, KeyRound, Settings,
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { roleLabel } from '../../lib/roles';
import { useAuth } from '../../context/auth-store';
import {
  Card, CardContent, Button, Input, Spinner, Avatar, Badge,
} from '../../components/ui';

const TABS = [
  { k: 'profile', label: 'Profile', icon: User },
  { k: 'security', label: 'Security', icon: Lock },
  { k: 'appearance', label: 'Appearance', icon: Palette },
  { k: 'account', label: 'Account', icon: ShieldCheck },
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

export default function SKSettings() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('profile');

  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/auth/profile')).data.user,
  });
  const me = profileQ.data || user || {};

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* title */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-sm"><Settings className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Settings</h1>
          <p className="text-sm text-muted">Manage your SK officer account and preferences.</p>
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
      ) : tab === 'security' ? (
        <SecuritySection />
      ) : tab === 'appearance' ? (
        <AppearanceSection />
      ) : (
        <AccountSection me={me} logout={logout} />
      )}
    </div>
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
            <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={roleLabel(me.role)} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={me.email} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Contact" value={me.contactNumber} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Barangay" value={`${me.barangay || 'Tawiran'}, ${me.municipality || 'Santa Cruz'}`} />
            <InfoRow icon={<Cake className="h-4 w-4" />} label="Member since" value={fmtDate(me.createdAt)} />
          </div>
          <div className="mt-3"><Badge variant="info">SK Official accounts are managed by the Chairperson.</Badge></div>
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