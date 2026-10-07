// cspell:words kabataan Tawiran Barangay
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pin, PinOff, Pencil, Trash2, Megaphone, Link2, CalendarClock, Calendar, Clock, MapPin, Star, HandHeart, ClipboardList, Activity } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select,
  Modal, EmptyState,
} from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { isHead } from '../../lib/roles';

// Categories a person can post manually. "Programs" and "History" are managed by the
// system (auto-posted from a PPA, or archived when an event ends) — never hand-picked.
const CREATE_CATS = ['General', 'Events', 'Opportunities', 'Reminder'];
const TAB_ORDER = ['General', 'Events', 'Programs', 'Opportunities', 'Reminder', 'History'];

const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
const fmtEvent = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '');
const fmtShort = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const sourceLabel = (t) => (t === 'meeting' ? 'Event' : t === 'program' ? 'Program' : null);
const metaSummary = (meta) => {
  if (!meta || !meta.kind) return '';
  if (meta.kind === 'meeting') return [fmtShort(meta.date), meta.time, meta.venue].filter(Boolean).join(' · ');
  if (meta.kind === 'program') return [meta.status, meta.startDate ? `Starts ${fmtShort(meta.startDate)}` : ''].filter(Boolean).join(' · ');
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

export default function Announcements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = isHead(user?.role) || user?.role === 'sk_secretary';

  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null);  // {mode, data}
  const [detail, setDetail] = useState(null); // announcement being viewed
  const [del, setDel] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get('/announcements')).data.announcements,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['announcements'] });

  const pinM = useMutation({
    mutationFn: (id) => api.put(`/announcements/${id}/pin`),
    onSuccess: refresh,
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const delM = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  // Only show tabs for categories that actually have posts (keeps it clean).
  const tabs = useMemo(() => {
    const present = new Set(items.map((a) => a.category));
    return ['All', ...TAB_ORDER.filter((c) => present.has(c))];
  }, [items]);

  const shown = filter === 'All' ? items : items.filter((a) => a.category === filter);
  const pinned = shown.filter((a) => a.isPinned);
  const rest = shown.filter((a) => !a.isPinned);

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Post updates for the kabataan of Barangay Tawiran."
        actions={canManage ? <Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button> : null}
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-surface2 p-1">
        {tabs.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${filter === c ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description={canManage ? 'Post the first announcement.' : 'No announcements yet.'}
          action={canManage ? <Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button> : null}
        />
      ) : (
        <div className="space-y-3">
          {[...pinned, ...rest].map((a) => {
            const src = sourceLabel(a.sourceType);
            return (
              <Card key={a._id} className="transition hover:border-primary/40">
                <CardContent className="flex items-start justify-between gap-4">
                  <button type="button" onClick={() => setDetail(a)} className="min-w-0 flex-1 text-left">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="primary">{a.category}</Badge>
                      {a.isPinned && <Badge variant="accent"><Pin className="h-3 w-3" /> Pinned</Badge>}
                      {src && <Badge variant="info"><Link2 className="h-3 w-3" /> From {src}</Badge>}
                    </div>
                    <h3 className="font-bold text-fg">{a.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{a.content}</p>
                    {metaSummary(a.meta) && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Calendar className="h-3.5 w-3.5" /> {metaSummary(a.meta)}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-subtle">
                      {a.author?.firstName} {a.author?.lastName} · {fmt(a.createdAt)}
                    </p>
                  </button>

                  {canManage && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => pinM.mutate(a._id)} title={a.isPinned ? 'Unpin' : 'Pin'}>
                        {a.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      {a.sourceType === 'manual' && (
                        <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', data: a })} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(a)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modal && <AnnForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}

      <AnnDetail ann={detail} onClose={() => setDetail(null)} />

      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete announcement"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete</Button></>}
      >
        <p className="text-sm text-muted">Delete “{del?.title}”? This cannot be undone.</p>
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
          <Badge variant="primary">{ann.category}</Badge>
          {ann.isPinned && <Badge variant="accent"><Pin className="h-3 w-3" /> Pinned</Badge>}
          {src && <Badge variant="info"><Link2 className="h-3 w-3" /> From {src}</Badge>}
        </div>

        {ann.content && <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{ann.content}</p>}

        <MetaBlock meta={ann.meta} />

        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-subtle">
          <CalendarClock className="h-4 w-4" />
          <span>Posted by {ann.author?.firstName} {ann.author?.lastName} · {fmt(ann.createdAt)}</span>
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
  const [form, setForm] = useState({ title: d.title || '', content: d.content || '', category: d.category || 'General' });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/announcements/${d._id}`, p) : api.post('/announcements', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Posted.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('Title and content are required.');
    m.mutate(form);
  };
  // If editing a post whose category is system-only, keep it selectable so it isn't lost.
  const cats = CREATE_CATS.includes(form.category) ? CREATE_CATS : [form.category, ...CREATE_CATS];
  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit announcement' : 'New announcement'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <Select label="Category" name="category" value={form.category} onChange={on}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Textarea label="Content" name="content" value={form.content} onChange={on} rows={5} />
      </form>
    </Modal>
  );
}