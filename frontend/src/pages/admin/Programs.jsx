import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, FolderKanban, Search, CalendarRange, Wallet, ChevronRight, Activity, CircleDashed, Hash, Users, EyeOff, ListChecks } from 'lucide-react';
import api from '../../lib/api';
import { peso, cn } from '../../lib/utils';
import { roleLabel, isHead } from '../../lib/roles';
import { programIcon, STATUS_DOT, latestProgress } from '../../lib/programs';
import ProgramDetail from '../../components/programs/ProgramDetail';
import { useAuth } from '../../context/auth-store';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select,
  Modal, EmptyState, IconButton, StatCard,
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
const FILTERS = ['all', ...STATUS];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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

// Shared by the Head Console and the SK Console. Only the Chairperson manages
// programs (the API enforces this); other officers get the same view, read-only.
export default function Programs() {
  const { user } = useAuth();
  const canManage = isHead(user?.role);
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [openId, setOpenId] = useState(null); // details panel (reads the live list so it refreshes)

  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => { const { data } = await api.get('/programs'); return data.programs || data; },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['programs'] });
  const delM = useMutation({ mutationFn: (id) => api.delete(`/programs/${id}`), onSuccess: () => { toast.success('Program deleted.'); setDel(null); refresh(); }, onError: (e) => toast.error(e.response?.data?.message || 'Failed.') });

  const all = useMemo(() => (Array.isArray(programs) ? programs : []), [programs]);
  const term = q.trim().toLowerCase();
  const list = all
    .filter((p) => status === 'all' || p.status === status)
    .filter((p) => !term || `${p.title} ${p.description || ''} ${p.category || ''} ${p.referenceCode || ''}`.toLowerCase().includes(term));
  const count = (st) => (st === 'all' ? all.length : all.filter((p) => p.status === st).length);
  const totalBudget = all.filter((p) => p.status !== 'cancelled').reduce((n, p) => n + num(p.totalBudget), 0);
  const openNew = () => setModal({ mode: 'create', data: {} });

  return (
    <>
      <PageHeader title="Programs & Projects"
        description={canManage
          ? 'Plan the SK’s programs, projects and activities (PPAs) with their budgets and ABYIP/CBYDP details.'
          : 'The SK’s programs, projects and activities (PPAs), their budgets and status. The SK Chairperson manages this list.'}
        actions={canManage ? <Button onClick={openNew}><Plus className="h-4 w-4" /> New program</Button> : null} />

      {isLoading ? <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>
        : all.length === 0 ? <EmptyState icon={FolderKanban} title="No programs yet" description={canManage ? 'Create the first program — projects and activities are added under it.' : 'Programs created by the SK Chairperson will appear here.'} action={canManage ? <Button onClick={openNew}><Plus className="h-4 w-4" /> New program</Button> : null} />
        : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Programs" value={all.length} icon={FolderKanban} tone="primary" />
              <StatCard label="Ongoing" value={count('ongoing')} icon={Activity} tone="warning" />
              <StatCard label="Planned" value={count('planned')} icon={CircleDashed} tone="info" />
              <StatCard label="Total budget" value={peso(totalBudget)} icon={Wallet} tone="success" hint="Excludes cancelled programs" />
            </div>

            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Filter by status">
                {FILTERS.map((st) => (
                  <button key={st} type="button" aria-pressed={status === st} onClick={() => setStatus(st)}
                    className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                      status === st ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
                    {st !== 'all' && <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[st])} />}
                    {st === 'all' ? 'All' : cap(st)}
                    <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{count(st)}</span>
                  </button>
                ))}
              </div>
              <div className="lg:w-72">
                <Input type="search" aria-label="Search programs" placeholder="Search programs…" value={q} onChange={(e) => setQ(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
              </div>
            </div>

            {list.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No programs match" description="Try another status or search term." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => {
                  const Icon = programIcon(p.category);
                  const pct = latestProgress(p);
                  return (
                    <Card key={p._id} className="flex flex-col transition-shadow hover:shadow-pop">
                      <CardContent className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-fg">
                            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[p.status] || 'bg-subtle')} />{cap(p.status || 'planned')}
                          </span>
                        </div>
                        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          {p.category}
                          {p.showToKabataan === false && <span className="inline-flex items-center gap-1 rounded bg-surface2 px-1.5 py-0.5 normal-case tracking-normal text-muted"><EyeOff aria-hidden="true" className="h-3 w-3" /> Hidden from kabataan</span>}
                        </p>
                        <h3 className="mt-0.5 font-bold leading-snug text-fg">
                          <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => setOpenId(p._id)}>{p.title}</button>
                        </h3>
                        {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface2/60 p-3 text-xs">
                          <div><dt className="flex items-center gap-1 text-subtle"><Wallet aria-hidden="true" className="h-3.5 w-3.5" />Budget</dt><dd className="mt-0.5 font-semibold tabular-nums text-fg">{peso(p.totalBudget || 0)}</dd></div>
                          <div><dt className="flex items-center gap-1 text-subtle"><CalendarRange aria-hidden="true" className="h-3.5 w-3.5" />Timeline</dt><dd className="mt-0.5 font-semibold text-fg">{fmt(p.startDate)} – {fmt(p.endDate)}</dd></div>
                          {(p.targetBeneficiaries || p.beneficiaryCount != null) && (
                            <div className="col-span-2"><dt className="flex items-center gap-1 text-subtle"><Users aria-hidden="true" className="h-3.5 w-3.5" />For</dt><dd className="mt-0.5 truncate font-medium text-fg">{[p.beneficiaryCount != null ? `${p.beneficiaryCount.toLocaleString()} people` : '', p.targetBeneficiaries].filter(Boolean).join(' · ')}</dd></div>
                          )}
                          {pct != null && (
                            <div className="col-span-2">
                              <dt className="flex items-center justify-between text-subtle"><span>Progress</span><span className="font-semibold tabular-nums text-fg">{pct}%</span></dt>
                              <dd className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></dd>
                            </div>
                          )}
                          {(p.referenceCode || p.area) && (
                            <div className="col-span-2"><dt className="flex items-center gap-1 text-subtle"><Hash aria-hidden="true" className="h-3.5 w-3.5" />Plan reference</dt><dd className="mt-0.5 truncate font-medium text-fg">{[p.referenceCode, p.area].filter(Boolean).join(' · ')}</dd></div>
                          )}
                        </dl>
                        <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-3 [margin-top:1rem]">
                          <button type="button" onClick={() => setOpenId(p._id)} className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:bg-primary/5">
                            <ListChecks aria-hidden="true" className="h-4 w-4" /> Open details
                            {(p.progressUpdates?.length || 0) + (p.documents?.length || 0) > 0 && <span className="rounded bg-primary/10 px-1.5 text-xs tabular-nums">{(p.progressUpdates?.length || 0) + (p.documents?.length || 0)}</span>}
                          </button>
                          <Link to={canManage ? '/admin/budget' : '/sk/finance'} className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:bg-primary/5">
                            {canManage ? 'Budget utilization' : 'Budget & Finance'} <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                          {canManage && (
                            <span className="ml-auto flex gap-1">
                              <IconButton icon={Pencil} label={`Edit “${p.title}”`} onClick={() => setModal({ mode: 'edit', data: p })} />
                              <IconButton icon={Trash2} label={`Delete “${p.title}”`} tone="danger" onClick={() => setDel(p)} />
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

      {modal && <ProgForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {openId && all.find((p) => p._id === openId) && (
        <ProgramDetail program={all.find((p) => p._id === openId)} canManage={canManage} onClose={() => setOpenId(null)} onChanged={refresh} />
      )}
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this program?"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete</Button></>}>
        <p className="text-sm text-muted">“{del?.title}” will be removed from the program list. Expenses already recorded against it stay in the finance records.</p>
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
    targetBeneficiaries: d.targetBeneficiaries || '',
    beneficiaryCount: d.beneficiaryCount ?? '',
    showToKabataan: d.showToKabataan !== false,
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
      beneficiaryCount: form.beneficiaryCount === '' ? null : num(form.beneficiaryCount),
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
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Input label="Target beneficiaries" name="targetBeneficiaries" value={form.targetBeneficiaries} onChange={on} placeholder="e.g. Out-of-school youth aged 15–24" />
          <Input label="How many" name="beneficiaryCount" type="number" min="0" value={form.beneficiaryCount} onChange={on} placeholder="e.g. 50" />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface2/50 p-3">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" checked={form.showToKabataan}
            onChange={(e) => setForm((f) => ({ ...f, showToKabataan: e.target.checked }))} />
          <span className="text-sm">
            <span className="font-semibold text-fg">Show to kabataan</span>
            <span className="block text-xs text-muted">Appears on the member portal and the public landing page with its status, progress updates and spending. Turn off for internal or not-yet-approved PPAs.</span>
          </span>
        </label>

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