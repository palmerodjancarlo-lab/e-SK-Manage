import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, FolderKanban } from 'lucide-react';
import api from '../../lib/api';
import { peso } from '../../lib/utils';
import { roleLabel } from '../../lib/roles';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select,
  Modal, EmptyState,
} from '../../components/ui';

const CATS = ['Youth Development', 'Health', 'Livelihood', 'Education', 'Environment', 'Sports', 'Peace and Order', 'Other'];
const STATUS = ['planned', 'ongoing', 'completed', 'cancelled'];
const STATUS_TONE = { planned: 'info', ongoing: 'warning', completed: 'success', cancelled: 'danger' };
const CENTERS = ['Health', 'Education', 'Economic Empowerment', 'Social Inclusion and Equity', 'Governance', 'Active Citizenship', 'Environment', 'Global Mobility', 'Peace-Building and Security'];
const AREAS = ['General Administration Program', 'Governance and Administration', 'Social Development', 'Economic Development', 'Health and Nutrition', 'Education and Human Capital', 'Environmental Management', 'Sports and Recreation', 'Peace and Security', 'Disaster Risk Reduction'];
const IMPL = ['January - December', '1st Quarter (Jan-Mar)', '2nd Quarter (Apr-Jun)', '3rd Quarter (Jul-Sep)', '4th Quarter (Oct-Dec)', '1st Semester (Jan-Jun)', '2nd Semester (Jul-Dec)'];
const ROLE_TITLES = ['SK Chairperson', 'SK Secretary', 'SK Treasurer', 'SK Kagawad'];
const CUR = new Date().getFullYear();
const YEARS = [CUR - 1, CUR, CUR + 1, CUR + 2, CUR + 3];
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const num = (v) => Number(v) || 0;

function SectionLabel({ children }) {
  return <p className="border-t border-border pt-4 text-xs font-bold uppercase tracking-wide text-subtle">{children}</p>;
}

// Select with the listed options plus an "Other…" escape that reveals a text field.
function ComboField({ label, options, value, onChange, placeholder }) {
  const inList = options.includes(value);
  const [custom, setCustom] = useState(!!value && !inList);
  const handle = (e) => {
    const v = e.target.value;
    if (v === '__other__') { setCustom(true); onChange(''); }
    else { setCustom(false); onChange(v); }
  };
  return (
    <div>
      <Select label={label} value={custom ? '__other__' : value} onChange={handle}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </Select>
      {custom && (
        <Input className="mt-2" placeholder={placeholder || 'Type a value'} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function Programs() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => (await api.get('/programs')).data.programs || (await api.get('/programs')).data,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['programs'] });
  const delM = useMutation({ mutationFn: (id) => api.delete(`/programs/${id}`), onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); }, onError: (e) => toast.error(e.response?.data?.message || 'Failed.') });

  const list = Array.isArray(programs) ? programs : [];

  return (
    <>
      <PageHeader title="Programs & Projects" description="Track SK programs, their budgets, status, and ABYIP/CBYDP plan details."
        actions={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button>} />

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : list.length === 0 ? <EmptyState icon={FolderKanban} title="No programs yet" description="Create your first program." action={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button>} />
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
                    {(p.area || p.referenceCode) && <p>{p.referenceCode ? `${p.referenceCode} · ` : ''}{p.area || ''}</p>}
                    <p>{fmt(p.startDate)} → {fmt(p.endDate)}</p>
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', data: p })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
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

  // SK officers for the "Person Responsible" dropdown
  const membersQ = useQuery({
    queryKey: ['members'],
    queryFn: async () => { const { data } = await api.get('/auth/members'); return data.users || data || []; },
  });
  const officers = (membersQ.data || []).filter((m) => m.role && m.role !== 'kabataan');
  const personOptions = [
    ...ROLE_TITLES,
    ...officers.map((o) => `${o.firstName} ${o.lastName} (${roleLabel(o.role)})`),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const [form, setForm] = useState({
    title: d.title || '', description: d.description || '', category: d.category || 'Other',
    status: d.status || 'planned',
    startDate: d.startDate ? d.startDate.slice(0, 10) : '', endDate: d.endDate ? d.endDate.slice(0, 10) : '',
    // ABYIP / CBYDP plan details
    fiscalYear: d.fiscalYear || CUR,
    area: d.area || '',
    referenceCode: d.referenceCode || '',
    centerOfParticipation: d.centerOfParticipation || '',
    objective: d.objective || '',
    performanceIndicator: d.performanceIndicator || '',
    expectedResults: d.expectedResults || '',
    dateOfImplementation: d.dateOfImplementation || '',
    personResponsible: d.personResponsible || '',
    targets: { fy1: d.targets?.fy1 || '', fy2: d.targets?.fy2 || '', fy3: d.targets?.fy3 || '' },
    budget: {
      mooe: d.budget?.mooe ?? '',
      personnelServices: d.budget?.personnelServices ?? '',
      capitalOutlay: d.budget?.capitalOutlay ?? '',
    },
  });

  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onTarget = (k, v) => setForm((f) => ({ ...f, targets: { ...f.targets, [k]: v } }));
  const onBudget = (k, v) => setForm((f) => ({ ...f, budget: { ...f.budget, [k]: v } }));
  const bTotal = num(form.budget.mooe) + num(form.budget.personnelServices) + num(form.budget.capitalOutlay);

  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/programs/${d._id}`, p) : api.post('/programs', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Created.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title is required.');
    m.mutate({
      ...form,
      fiscalYear: num(form.fiscalYear) || CUR,
      budget: {
        mooe: num(form.budget.mooe),
        personnelServices: num(form.budget.personnelServices),
        capitalOutlay: num(form.budget.capitalOutlay),
      },
    });
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit program' : 'New program'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title (PPA)" name="title" value={form.title} onChange={on} />
        <Textarea label="Description" name="description" value={form.description} onChange={on} rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" name="category" value={form.category} onChange={on}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select label="Status" name="status" value={form.status} onChange={on}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" name="startDate" type="date" value={form.startDate} onChange={on} />
          <Input label="End date" name="endDate" type="date" value={form.endDate} onChange={on} />
        </div>

        {/* ABYIP / CBYDP plan details */}
        <SectionLabel>ABYIP / CBYDP Plan Details</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Fiscal Year" name="fiscalYear" value={form.fiscalYear} onChange={on}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Input label="Reference Code" name="referenceCode" value={form.referenceCode} onChange={on} placeholder="e.g. 1000-001-001" />
          <ComboField label="Area (ABYIP group)" options={AREAS} value={form.area} onChange={(v) => setField('area', v)} placeholder="e.g. General Administrative Program" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Center of Participation (CBYDP)" name="centerOfParticipation" value={form.centerOfParticipation} onChange={on}>
            <option value="">Select…</option>
            {CENTERS.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <ComboField label="Date of Implementation" options={IMPL} value={form.dateOfImplementation} onChange={(v) => setField('dateOfImplementation', v)} placeholder="e.g. January - December 2026" />
        </div>
        <Textarea label="Objective (CBYDP)" name="objective" value={form.objective} onChange={on} rows={2} />
        <Textarea label="Performance Indicator" name="performanceIndicator" value={form.performanceIndicator} onChange={on} rows={2} />
        <Textarea label="Expected Results (ABYIP)" name="expectedResults" value={form.expectedResults} onChange={on} rows={2} />
        <ComboField label="Person Responsible" options={personOptions} value={form.personResponsible} onChange={(v) => setField('personResponsible', v)} placeholder="e.g. SK C.O. Education" />

        {/* 3-year targets (CBYDP) */}
        <SectionLabel>3-Year Targets (CBYDP)</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="FY 1" value={form.targets.fy1} onChange={(e) => onTarget('fy1', e.target.value)} />
          <Input label="FY 2" value={form.targets.fy2} onChange={(e) => onTarget('fy2', e.target.value)} />
          <Input label="FY 3" value={form.targets.fy3} onChange={(e) => onTarget('fy3', e.target.value)} />
        </div>

        {/* Budget split (ABYIP) */}
        <SectionLabel>Budget Classification (ABYIP)</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="MOOE" type="number" value={form.budget.mooe} onChange={(e) => onBudget('mooe', e.target.value)} />
          <Input label="Personnel Services" type="number" value={form.budget.personnelServices} onChange={(e) => onBudget('personnelServices', e.target.value)} />
          <Input label="Capital Outlay" type="number" value={form.budget.capitalOutlay} onChange={(e) => onBudget('capitalOutlay', e.target.value)} />
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-muted">ABYIP line total: </span>
          <span className="font-extrabold tabular-nums text-fg">{peso(bTotal)}</span>
        </div>
      </form>
    </Modal>
  );
}