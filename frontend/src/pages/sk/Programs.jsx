import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, FolderKanban } from 'lucide-react';
import api from '../../lib/api';
import { peso } from '../../lib/utils';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select,
  Modal, EmptyState,
} from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { isHead } from '../../lib/roles';

const CATS = ['Youth Development', 'Health', 'Livelihood', 'Education', 'Environment', 'Sports', 'Peace and Order', 'Other'];
const STATUS = ['planned', 'ongoing', 'completed', 'cancelled'];
const STATUS_TONE = { planned: 'info', ongoing: 'warning', completed: 'success', cancelled: 'danger' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function Programs() {
  const { user } = useAuth();
  const canManage = isHead(user?.role);
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => (await api.get('/programs')).data,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['programs'] });
  const delM = useMutation({ mutationFn: (id) => api.delete(`/programs/${id}`), onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); }, onError: (e) => toast.error(e.response?.data?.message || 'Failed.') });

  const list = Array.isArray(data) ? data : data?.programs || [];

  return (
    <>
      <PageHeader title="Programs & Projects" description="Track SK programs, their budgets, and status."
        actions={canManage ? <Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button> : null} />

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : list.length === 0 ? <EmptyState icon={FolderKanban} title="No programs yet" description={canManage ? 'Create your first program.' : 'No programs have been created yet.'} action={canManage ? <Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button> : null} />
        : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <Card key={p._id}>
                <CardContent>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="primary">{p.category}</Badge>
                    <Badge variant={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </div>
                  <h3 className="font-bold text-fg">{p.title}</h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <div className="mt-3 space-y-1 text-xs text-subtle">
                    <p>Budget: <span className="font-semibold text-fg">{peso(p.totalBudget || 0)}</span></p>
                    <p>{fmt(p.startDate)} → {fmt(p.endDate)}</p>
                  </div>
                  {canManage && (
                    <div className="mt-4 flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', data: p })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(p)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {modal && <ProgForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete program"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete</Button></>}>
        <p className="text-sm text-muted">Delete “{del?.title}” and its projects?</p>
      </Modal>
    </>
  );
}

function ProgForm({ modal, onClose, onDone }) {
  const isEdit = modal.mode === 'edit';
  const d = modal.data;
  const [form, setForm] = useState({
    title: d.title || '', description: d.description || '', category: d.category || 'Other',
    status: d.status || 'planned',
    startDate: d.startDate ? d.startDate.slice(0, 10) : '', endDate: d.endDate ? d.endDate.slice(0, 10) : '',
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/programs/${d._id}`, p) : api.post('/programs', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Created.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => { e.preventDefault(); if (!form.title) return toast.error('Title is required.'); m.mutate(form); };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit program' : 'New program'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <Textarea label="Description" name="description" value={form.description} onChange={on} rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" name="category" value={form.category} onChange={on}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select label="Status" name="status" value={form.status} onChange={on}>{STATUS.map((st) => <option key={st} value={st}>{st}</option>)}</Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" name="startDate" type="date" value={form.startDate} onChange={on} />
          <Input label="End date" name="endDate" type="date" value={form.endDate} onChange={on} />
        </div>
      </form>
    </Modal>
  );
}