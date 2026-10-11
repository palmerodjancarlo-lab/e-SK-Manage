// Program (PPA) details: who it's for, progress log, projects & activities (with attendance),
// photos and supporting documents. Everyone in the consoles can read it; the Chairperson
// (canManage) manages it. Any SK officer can record attendance and add photos.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, MessageSquarePlus, Paperclip, Trash2, FileText, Upload, ExternalLink, EyeOff, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { STATUS_DOT, statusLabel } from '../../lib/programs';
import { Modal, Button, Textarea, Input, Select, IconButton, Badge } from '../ui';
import ProjectsPanel from './ProjectsPanel';
import PhotosPanel from './PhotosPanel';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const STATUSES = ['planned', 'ongoing', 'completed', 'cancelled'];

export default function ProgramDetail({ program: p, canManage, onClose, onChanged }) {
  const [tab, setTab] = useState('updates');
  const updates = [...(p.progressUpdates || [])].reverse();
  const docs = p.documents || [];

  return (
    <Modal open onClose={onClose} size="xl" title={p.title}
      description={[p.category, p.referenceCode].filter(Boolean).join(' · ')}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-fg">
            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[p.status] || 'bg-subtle')} />{statusLabel(p.status)}
          </span>
          {p.showToKabataan === false && <Badge variant="default"><EyeOff className="h-3 w-3" /> Hidden from kabataan</Badge>}
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-surface2/60 p-3">
          <Users aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold text-fg">Target beneficiaries</p>
            <p className="text-muted">
              {p.targetBeneficiaries || p.beneficiaryCount != null
                ? [p.beneficiaryCount != null ? `${p.beneficiaryCount.toLocaleString()} people` : '', p.targetBeneficiaries].filter(Boolean).join(' · ')
                : 'Not set yet.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1 sm:flex" role="tablist" aria-label="Program details">
          {[['updates', 'Updates', updates.length], ['projects', 'Projects & activities'], ['photos', 'Photos', (p.photos || []).length], ['documents', 'Files', docs.length]].map(([k, label, n]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn('inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                tab === k ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
              {label}{n > 0 && <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{n}</span>}
            </button>
          ))}
        </div>

        {tab === 'projects' && <ProjectsPanel program={p} canManage={canManage} onChanged={onChanged} />}
        {tab === 'photos' && <PhotosPanel program={p} canManage={canManage} onChanged={onChanged} />}

        {tab === 'updates' && (
          <div className="space-y-4">
            {canManage && <UpdateForm program={p} onDone={onChanged} />}
            {updates.length === 0 ? <p className="py-4 text-center text-sm text-muted">No progress updates yet.</p> : (
              <ol className="relative space-y-4 border-l-2 border-border pl-5">
                {updates.map((u) => (
                  <li key={u._id} className="relative">
                    <span aria-hidden="true" className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-primary" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-subtle">
                          {fmt(u.postedAt)}{u.postedBy?.firstName ? ` · ${u.postedBy.firstName} ${u.postedBy.lastName}` : ''}
                          {u.status ? ` · marked ${statusLabel(u.status).toLowerCase()}` : ''}
                        </p>
                        <p className="mt-0.5 whitespace-pre-line text-sm text-fg">{u.note}</p>
                        {u.progress != null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface2" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${u.progress}%` }} /></div>
                            <span className="text-xs font-semibold tabular-nums text-muted">{u.progress}% done</span>
                          </div>
                        )}
                      </div>
                      {canManage && <RemoveButton label="Remove this update" url={`/programs/${p._id}/updates/${u._id}`} onDone={onChanged} />}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            {canManage && <DocumentForm program={p} onDone={onChanged} />}
            {docs.length === 0 ? <p className="py-4 text-center text-sm text-muted">No documents attached yet.</p> : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {docs.map((d) => (
                  <li key={d._id} className="flex items-center gap-3 px-3 py-2.5">
                    <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-sm font-semibold text-fg hover:text-primary hover:underline">
                        <span className="truncate">{d.name}</span><ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      </a>
                      <p className="text-xs text-subtle">{fmt(d.uploadedAt)}{d.uploadedBy?.firstName ? ` · ${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : ''}</p>
                    </div>
                    {canManage && <RemoveButton label={`Remove ${d.name}`} url={`/programs/${p._id}/documents/${d._id}`} onDone={onChanged} />}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-subtle">Documents are for SK officers only; kabataan don’t see them.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RemoveButton({ label, url, onDone }) {
  const m = useMutation({
    mutationFn: () => api.delete(url),
    onSuccess: (r) => { toast.success(r.data.message || 'Removed.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not remove.'),
  });
  return <IconButton icon={m.isPending ? Loader2 : Trash2} tone="danger" label={label} disabled={m.isPending}
    onClick={() => { if (window.confirm(`${label}?`)) m.mutate(); }} />;
}

function UpdateForm({ program, onDone }) {
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState('');
  const [status, setStatus] = useState('');
  const m = useMutation({
    mutationFn: () => api.post(`/programs/${program._id}/updates`, { note: note.trim(), progress: progress === '' ? null : Number(progress), status }),
    onSuccess: (r) => { toast.success(r.data.message || 'Posted.'); setNote(''); setProgress(''); setStatus(''); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not post.'),
  });
  return (
    <form className="space-y-3 rounded-xl border border-border p-3" onSubmit={(e) => { e.preventDefault(); if (note.trim() && !m.isPending) m.mutate(); }}>
      <Textarea label="Post a progress update" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Venue booked and 40 participants registered." />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input label="Done so far (%)" type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="Optional" />
        <Select label="Change status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Keep “{statusLabel(program.status)}”</option>
          {STATUSES.filter((s) => s !== program.status).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </Select>
        <Button type="submit" loading={m.isPending} disabled={!note.trim()}><MessageSquarePlus className="h-4 w-4" /> Post</Button>
      </div>
    </form>
  );
}

function DocumentForm({ program, onDone }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const m = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/document', fd, { timeout: 60000 });
      return api.post(`/programs/${program._id}/documents`, { name: name.trim() || file.name, url: data.url });
    },
    onSuccess: (r) => { toast.success(r.data.message || 'Attached.'); setFile(null); setName(''); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not upload the file.'),
  });
  return (
    <form className="space-y-3 rounded-xl border border-border p-3" onSubmit={(e) => { e.preventDefault(); if (file && !m.isPending) m.mutate(); }}>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted hover:border-primary/50 hover:bg-primary/[0.03]">
        <Paperclip aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{file ? file.name : 'Choose a PDF or photo (up to 5 MB)'}</span>
        <input type="file" accept="application/pdf,image/*" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 5 * 1024 * 1024) { toast.error('That file is over 5 MB.'); return; } setFile(f || null); if (f && !name) setName(f.name.replace(/\.[^.]+$/, '')); }} />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Document name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Project proposal, SK Resolution No. 5" />
        <Button type="submit" loading={m.isPending} disabled={!file}><Upload className="h-4 w-4" /> Attach</Button>
      </div>
    </form>
  );
}
