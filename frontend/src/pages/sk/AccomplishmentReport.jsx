// src/pages/sk/Announcements.jsx — SK announcements management
// cspell:words kabataan Tawiran
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Megaphone, Pin, PinOff, Link2, CalendarClock, Calendar, Clock, MapPin, Star, HandHeart, ClipboardList, Activity } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select, Modal, EmptyState, Avatar,
} from '../../components/ui';
import { cn } from '../../lib/utils';

// Categories a person posts manually. "Programs" and "History" are system-managed
// (auto-posted from a PPA, or archived when an event ends) — never hand-picked.
const CREATE_CATS = ['General', 'Events', 'Opportunities', 'Reminder'];
const TAB_ORDER = ['General', 'Events', 'Programs', 'Opportunities', 'Reminder', 'History'];
const CAT_TONE = { General: 'default', Events: 'primary', Programs: 'accent', Opportunities: 'success', Reminder: 'warning', History: 'default' };

const asArray = (d) => (Array.isArray(d) ? d : d?.announcements || []);
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const fmtLong = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
const fmtEvent = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '');
const sourceLabel = (t) => (t === 'meeting' ? 'Event' : t === 'program' ? 'Program' : null);
const metaSummary = (meta) => {
  if (!meta || !meta.kind) return '';
  if (meta.kind === 'meeting') return [fmt(meta.date), meta.time, meta.venue].filter(Boolean).join(' · ');
  if (meta.kind === 'program') return [meta.status, meta.startDate ? `Starts ${fmt(meta.startDate)}` : ''].filter(Boolean).join(' · ');
  return '';
};

function MetaBlock({ meta }) {
  if (!meta || !meta.kind) return null;
  const rows = [];
  if (meta.kind === 'meeting') {
    if (meta.date) rows.push({ k: 'Date', icon: <Calendar className="h-4 w-4" />, v: fmtEvent(meta.date) });
    if (meta.time) rows.push({ k: 'Time', icon: <Clock className="h-4 w-4" />, v: meta.time });
    if (meta.venue) rows.push({ k: 'Venue', icon: <MapPin className="h-4 w-4" />, v: meta.venue });
    if (meta.points) rows.push({ k: 'Reward', icon: <Star className="h-4 w-4" />, v: `${meta.points} points via QR check-in` });
    if (meta.volunteerRole) rows.push({ k: 'Volunteers', icon: <HandHeart className="h-4 w-4" />, v: meta.volunteerRole });
  } else if (meta.kind === 'program') {
    if (meta.status) rows.push({ k: 'Status', icon: <Activity className="h-4 w-4" />, v: meta.status });
    if (meta.startDate) rows.push({ k: 'Starts', icon: <Calendar className="h-4 w-4" />, v: fmtEvent(meta.startDate) });
  }
  if (!rows.length && !meta.agenda) return null;
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="text-muted">{r.icon}</span>
              <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted">{r.k}</span>
              <span className="flex-1 text-sm font-medium text-fg">{r.v}</span>
            </div>
          ))}
        </div>
      )}
      {meta.agenda && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted"><ClipboardList className="h-3.5 w-3.5" /> Agenda</p>
          <p className="whitespace-pre-wrap rounded-xl bg-surface2/60 p-3 text-sm leading-relaxed text-fg">{meta.agenda}</p>
        </div>
      )}
    </div>
  );
}

export default function SKAnnouncements() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);
  const [cat, setCat] = useState('all');

  const { data, isLoading } = useQuery({ queryKey: ['announcements'], queryFn: async () => (await api.get('/announcements')).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ['announcements'] });

  const all = useMemo(() => {
    const list = asArray(data);
    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [data]);

  // Only show tabs for categories that actually have posts.
  const tabs = useMemo(() => {
    const present = new Set(all.map((a) => a.category));
    return ['all', ...TAB_ORDER.filter((c) => present.has(c))];
  }, [all]);

  const shown = cat === 'all' ? all : all.filter((a) => a.category === cat);

  const pinM = useMutation({
    mutationFn: (a) => api.put(`/announcements/${a._id}`, { isPinned: !a.isPinned }),
    onSuccess: () => { refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const delM = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <>
      <PageHeader title="Announcements" description="Post news and reminders for the kabataan of Barangay Tawiran."
        actions={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New announcement</Button>} />

      {/* Category filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cn('rounded-full px-3 py-1.5 text-xs font-bold transition',
              cat === c ? 'bg-primary text-primary-fg' : 'border border-border bg-surface text-muted hover:text-fg')}>
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : shown.length === 0 ? <EmptyState icon={Megaphone} title="No announcements" description="Post your first announcement for the kabataan." action={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New announcement</Button>} />
        : (
          <div className="space-y-3">
            {shown.map((a) => {
              const src = sourceLabel(a.sourceType);
              return (
                <Card key={a._id} className={cn('transition hover:border-primary/40', a.isPinned && 'border-primary/40')}>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><Megaphone className="h-5 w-5" /></span>
                      <button type="button" onClick={() => setDetail(a)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={CAT_TONE[a.category] || 'default'}>{a.category}</Badge>
                          {a.isPinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary"><Pin className="h-3 w-3" /> Pinned</span>}
                          {src && <Badge variant="info"><Link2 className="h-3 w-3" /> From {src}</Badge>}
                        </div>
                        <h3 className="mt-1 font-bold text-fg">{a.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{a.content}</p>
                        {metaSummary(a.meta) && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <Calendar className="h-3.5 w-3.5" /> {metaSummary(a.meta)}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
                          {a.author && <Avatar name={`${a.author.firstName || ''} ${a.author.lastName || ''}`} src={a.author.photo} size="xs" />}
                          <span>{a.author ? `${a.author.firstName} ${a.author.lastName}` : 'SK'} · {fmt(a.createdAt)}</span>
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" title={a.isPinned ? 'Unpin' : 'Pin'} loading={pinM.isPending && pinM.variables?._id === a._id} onClick={() => pinM.mutate(a)}>
                          {a.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                        {a.sourceType === 'manual' || !a.sourceType ? (
                          <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', data: a })}><Pencil className="h-4 w-4" /></Button>
                        ) : null}
                        <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(a)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {modal && <AnnForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}

      <AnnDetail ann={detail} onClose={() => setDetail(null)} />

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete announcement"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete</Button></>}>
        <p className="text-sm text-muted">Delete “{del?.title}”?</p>
      </Modal>
    </>
  );
}

function AnnDetail({ ann, onClose }) {
  if (!ann) return null;
  const src = sourceLabel(ann.sourceType);
  return (
    <Modal open onClose={onClose} size="md" title={ann.title}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={CAT_TONE[ann.category] || 'default'}>{ann.category}</Badge>
          {ann.isPinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary"><Pin className="h-3 w-3" /> Pinned</span>}
          {src && <Badge variant="info"><Link2 className="h-3 w-3" /> From {src}</Badge>}
        </div>

        {ann.content && <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{ann.content}</p>}

        <MetaBlock meta={ann.meta} />

        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-subtle">
          <CalendarClock className="h-4 w-4" />
          <span>{ann.author ? `Posted by ${ann.author.firstName} ${ann.author.lastName} · ` : ''}{fmtLong(ann.createdAt)}</span>
        </div>

        {src && (
          <p className="rounded-lg bg-surface2/60 px-3 py-2 text-xs text-muted">
            This announcement was posted automatically from a {src.toLowerCase()}. It updates and is removed together with that {src.toLowerCase()}.
          </p>
        )}
      </div>
    </Modal>
  );
}

function AnnForm({ modal, onClose, onDone }) {
  const isEdit = modal.mode === 'edit';
  const d = modal.data;
  const [form, setForm] = useState({
    title: d.title || '', content: d.content || '', category: d.category || 'General', isPinned: d.isPinned ?? false,
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/announcements/${d._id}`, p) : api.post('/announcements', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Posted.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required.');
    m.mutate({ ...form, isPinned: !!form.isPinned });
  };
  // Keep a system-only category selectable when editing so it isn't lost.
  const cats = CREATE_CATS.includes(form.category) ? CREATE_CATS : [form.category, ...CREATE_CATS];
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit announcement' : 'New announcement'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>{isEdit ? 'Save' : 'Post'}</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <Textarea label="Content" name="content" value={form.content} onChange={on} rows={5} />
        <Select label="Category" name="category" value={form.category} onChange={on}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/50 px-4 py-3">
          <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
          <span className="text-sm text-fg">Pin to top</span>
        </label>
      </form>
    </Modal>
  );
}