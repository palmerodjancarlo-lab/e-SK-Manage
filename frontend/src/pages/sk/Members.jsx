// cspell:words kabataan kagawad Tawiran Barangay Purok purok
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Mail, Phone, MapPin, Calendar, Star, Cake, VenetianMask,
  Accessibility, X, ShieldCheck, ShieldAlert, BadgeCheck, Users, MailCheck, Heart,
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { roleLabel, ROLES } from '../../lib/roles';
import {
  PageHeader, Card, Badge, Input, Spinner, Modal, Avatar, EmptyState,
} from '../../components/ui';

/* ---------- helpers (module scope — not created during render) ---------- */

function fullName(m) {
  const n = `${m?.firstName || ''} ${m?.lastName || ''}`.trim();
  return n || m?.name || m?.email || 'Unknown';
}

function isKabataan(m) {
  return m?.role === ROLES.KABATAAN || m?.role === 'kabataan';
}

function ageOf(m, now) {
  if (typeof m?.age === 'number') return m.age; // model virtual
  const dob = m?.birthDate || m?.birthdate;
  if (!dob || !now) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  let age = new Date(now).getFullYear() - b.getFullYear();
  const mo = new Date(now).getMonth() - b.getMonth();
  if (mo < 0 || (mo === 0 && new Date(now).getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-subtle">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="truncate text-sm font-medium text-fg">{value ?? '—'}</div>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'all', label: 'Everyone' },
  { key: 'kabataan', label: 'Kabataan' },
  { key: 'sk_chairperson', label: 'Chairperson' },
  { key: 'sk_secretary', label: 'Secretary' },
  { key: 'sk_treasurer', label: 'Treasurer' },
  { key: 'sk_kagawad', label: 'Kagawad' },
];

/* ------------------------------ one row ------------------------------ */

function MemberRow({ member, onClick }) {
  const kab = isKabataan(member);
  const verified = !!member.idVerified;
  const active = member.isActive !== false;
  const name = fullName(member);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface2"
    >
      <Avatar name={name} src={member.photo} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-fg">{name}</span>
          {kab && verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <div className="truncate text-sm text-muted">{member.email}</div>
      </div>

      <div className="hidden items-center gap-6 sm:flex">
        <span className="w-24 text-right text-sm font-medium text-primary">
          {roleLabel(member.role)}
        </span>
        <span className={cn('w-16 text-sm font-medium', active ? 'text-success' : 'text-subtle')}>
          {active ? 'Active' : 'Inactive'}
        </span>
        {/* verification only applies to kabataan (residency) */}
        <span className="flex w-28 justify-start">
          {kab ? (
            <span className={cn('inline-flex items-center gap-1 text-sm font-medium',
              verified ? 'text-success' : 'text-warning')}>
              {verified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {verified ? 'Verified' : 'Pending'}
            </span>
          ) : (
            <span className="text-sm text-subtle">Official</span>
          )}
        </span>
      </div>

      {/* compact status for mobile */}
      <span className="sm:hidden">
        {kab
          ? (verified
            ? <ShieldCheck className="h-5 w-5 text-success" />
            : <ShieldAlert className="h-5 w-5 text-warning" />)
          : <BadgeCheck className="h-5 w-5 text-primary" />}
      </span>
    </button>
  );
}

/* ---------------------------- detail modal ---------------------------- */

function MemberDetail({ member, now, onClose }) {
  if (!member) return null;
  const kab = isKabataan(member);
  const age = ageOf(member, now);
  const verified = !!member.idVerified;
  const name = fullName(member);
  return (
    <Modal open={!!member} onClose={onClose} title={null} size="lg">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute right-0 top-0 rounded-lg p-1.5 text-subtle hover:bg-surface2 hover:text-fg"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-3 border-b border-border pb-5 text-center">
          <Avatar name={name} src={member.photo} size="xl" />
          <div>
            <h3 className="flex items-center justify-center gap-1.5 text-lg font-semibold text-fg">
              {name}
              {kab && verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </h3>
            <p className="text-sm text-muted">
              {roleLabel(member.role)}{member.position ? ` · ${member.position}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {member.isActive !== false
              ? <Badge variant="success">Active</Badge>
              : <Badge variant="default">Inactive</Badge>}
            {kab && (
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                verified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                {verified ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {verified ? 'Verified resident' : 'Pending verification'}
              </span>
            )}
            {member.isPWD && (
              <Badge variant="info" className="gap-1">
                <Accessibility className="h-3 w-3" /> PWD
              </Badge>
            )}
            {kab && (
              <Badge variant="primary" className="gap-1">
                <Star className="h-3 w-3" /> {member.points ?? 0} pts
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={member.email} />
          <Row icon={<Phone className="h-4 w-4" />} label="Contact" value={member.contactNumber} />
          <Row icon={<Cake className="h-4 w-4" />} label="Age" value={age != null ? `${age} yrs` : '—'} />
          <Row icon={<VenetianMask className="h-4 w-4" />} label="Sex" value={member.sex} />
          {kab && <Row icon={<Heart className="h-4 w-4" />} label="Civil status" value={member.civilStatus} />}
          <Row icon={<MapPin className="h-4 w-4" />} label="Purok" value={member.purok} />
          <Row icon={<MapPin className="h-4 w-4" />} label="Barangay" value={member.barangay || 'Tawiran'} />
          <Row icon={<Calendar className="h-4 w-4" />} label="Member since" value={fmtDate(member.createdAt)} />
          <Row
            icon={<MailCheck className="h-4 w-4" />}
            label="Email status"
            value={member.isVerified ? 'Email verified' : 'Email not verified'}
          />
          {kab && (
            <Row
              icon={verified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              label="Residency"
              value={
                verified
                  ? `Verified${member.idVerifiedAt ? ' · ' + fmtDate(member.idVerifiedAt) : ''}`
                  : 'Awaiting chairperson verification'
              }
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------- page -------------------------------- */

export default function Members() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const nowQ = useQuery({ queryKey: ['now'], queryFn: async () => Date.now() });
  const now = nowQ.data || 0;

  const membersQ = useQuery({
    queryKey: ['sk-members'],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Prefer the admin source (full user docs incl. idVerified);
      // fall back to /auth/members if this officer lacks admin access.
      try {
        const { data } = await api.get('/admin/users');
        return data.users || data || [];
      } catch {
        const { data } = await api.get('/auth/members');
        return Array.isArray(data) ? data : data.members || data.users || [];
      }
    },
  });

  const members = useMemo(() => membersQ.data || [], [membersQ.data]);

  const counts = useMemo(() => {
    const c = { all: members.length };
    for (const t of TABS) {
      if (t.key === 'all') continue;
      c[t.key] = members.filter((m) => m.role === t.key).length;
    }
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members.filter((m) => {
      if (tab !== 'all' && m.role !== tab) return false;
      if (!term) return true;
      return fullName(m).toLowerCase().includes(term) || m.email?.toLowerCase().includes(term);
    });
  }, [members, tab, q]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Members"
        subtitle="Kabataan and SK officials of Barangay Tawiran"
      />

      {/* search + count */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="pl-9"
          />
        </div>
        <span className="shrink-0 text-sm text-muted">{filtered.length} members</span>
      </div>

      {/* role tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              tab === t.key
                ? 'bg-primary text-primary-fg shadow-sm'
                : 'bg-surface2 text-muted hover:text-fg',
            )}
          >
            {t.label}
            <span className={cn('text-xs', tab === t.key ? 'text-primary-fg/80' : 'text-subtle')}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* list */}
      {membersQ.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No members found"
            description="Try a different filter or search term."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border">
            {filtered.map((m) => (
              <MemberRow key={m._id} member={m} onClick={() => setSelected(m)} />
            ))}
          </div>
        </Card>
      )}

      <MemberDetail member={selected} now={now} onClose={() => setSelected(null)} />
    </div>
  );
}