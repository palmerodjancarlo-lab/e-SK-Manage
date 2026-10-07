import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Award, Gift, Trophy, Star } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, CardHeader, CardTitle, Spinner, Badge, Button,
  Input, Textarea, Select, Modal, EmptyState, Avatar,
} from '../../components/ui';

export default function Rewards() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const rewardsQ = useQuery({ queryKey: ['rewards'], queryFn: async () => (await api.get('/rewards')).data.rewards });
  const boardQ = useQuery({ queryKey: ['leaderboard'], queryFn: async () => (await api.get('/points/leaderboard')).data.leaderboard });
  const kabQ = useQuery({ queryKey: ['admin-users'], queryFn: async () => (await api.get('/admin/users')).data.users });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['rewards'] }); qc.invalidateQueries({ queryKey: ['leaderboard'] }); };
  const delM = useMutation({ mutationFn: (id) => api.delete(`/rewards/${id}`), onSuccess: () => { toast.success('Removed.'); setDel(null); qc.invalidateQueries({ queryKey: ['rewards'] }); }, onError: (e) => toast.error(e.response?.data?.message || 'Failed.') });

  const rewards = rewardsQ.data || [];
  const board = boardQ.data || [];
  const kabataan = (kabQ.data || []).filter((u) => u.role === 'kabataan');

  return (
    <>
      <PageHeader title="Rewards & Points" description="Manage the rewards catalog and award points to kabataan."
        actions={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New reward</Button>} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rewards catalog */}
        <div className="lg:col-span-2">
          {rewardsQ.isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
            : rewards.length === 0 ? <EmptyState icon={Gift} title="No rewards yet" description="Add a reward the kabataan can redeem with points." action={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New reward</Button>} />
            : (
              <div className="grid gap-4 sm:grid-cols-2">
                {rewards.map((r) => (
                  <Card key={r._id}>
                    {r.image ? <img src={r.image} alt={r.title} className="h-36 w-full rounded-t-2xl object-cover" />
                      : <div className="flex h-36 items-center justify-center rounded-t-2xl bg-primary/10"><Gift className="h-10 w-10 text-primary/50" /></div>}
                    <CardContent>
                      <div className="mb-1 flex items-center justify-between">
                        <Badge variant="accent"><Star className="h-3 w-3" /> {r.pointsRequired} pts</Badge>
                        {!r.isActive && <Badge variant="default">Inactive</Badge>}
                      </div>
                      <h3 className="font-bold text-fg">{r.title}</h3>
                      {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>}
                      <p className="mt-1 text-xs text-subtle">{r.stock === -1 ? 'Unlimited stock' : `${r.stock} in stock`}</p>
                      <div className="mt-3 flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', data: r })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>

        {/* Award + leaderboard */}
        <div className="space-y-6">
          <AwardCard kabataan={kabataan} onDone={refresh} />
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" /> Leaderboard</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {board.length === 0 ? <p className="text-sm text-muted">No points yet.</p> :
                board.map((u, i) => (
                  <div key={u._id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-subtle">{i + 1}</span>
                    <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium text-fg">{u.firstName} {u.lastName}</span>
                    <Badge variant="accent">{u.points ?? 0}</Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {modal && <RewardForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); qc.invalidateQueries({ queryKey: ['rewards'] }); }} />}
      <Modal open={!!del} onClose={() => setDel(null)} title="Remove reward"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Remove</Button></>}>
        <p className="text-sm text-muted">Remove “{del?.title}” from the catalog?</p>
      </Modal>
    </>
  );
}

function AwardCard({ kabataan, onDone }) {
  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => api.post('/points/award', { userId, points: Number(points), reason }),
    onSuccess: (r) => { toast.success(r.data.message || 'Points awarded.'); setUserId(''); setPoints(''); setReason(''); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => { e.preventDefault(); if (!userId || !points || !reason) return toast.error('All fields required.'); m.mutate(); };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Award points</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Select label="Kabataan" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="" disabled>Select member…</option>
            {kabataan.map((u) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
          </Select>
          <Input label="Points" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Volunteered at clean-up" />
          <Button type="submit" loading={m.isPending} className="w-full">Award</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RewardForm({ modal, onClose, onDone }) {
  const isEdit = modal.mode === 'edit';
  const d = modal.data;
  const [form, setForm] = useState({
    title: d.title || '', description: d.description || '', pointsRequired: d.pointsRequired || '',
    image: d.image || '', stock: d.stock ?? -1, isActive: d.isActive ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, image: data.url }));
      toast.success('Image uploaded.');
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/rewards/${d._id}`, p) : api.post('/rewards', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Created.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.pointsRequired) return toast.error('Title and points are required.');
    m.mutate({ ...form, pointsRequired: Number(form.pointsRequired), stock: Number(form.stock), isActive: !!form.isActive });
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit reward' : 'New reward'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <Textarea label="Description" name="description" value={form.description} onChange={on} rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Points required" name="pointsRequired" type="number" value={form.pointsRequired} onChange={on} />
          <Input label="Stock (-1 = unlimited)" name="stock" type="number" value={form.stock} onChange={on} />
        </div>
        <div>
          <label className="label">Image</label>
          <div className="flex items-center gap-3">
            {form.image && <img src={form.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <input type="file" accept="image/*" onChange={upload} className="text-sm text-muted" />
            {uploading && <Spinner className="h-4 w-4 text-primary" />}
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/50 px-4 py-3">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
          <span className="text-sm text-fg">Active (visible to kabataan)</span>
        </label>
      </form>
    </Modal>
  );
}