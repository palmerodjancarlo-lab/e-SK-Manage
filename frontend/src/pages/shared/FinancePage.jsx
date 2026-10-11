// pages/shared/FinancePage.jsx — Budget & Finance for the Head Console and the SK Console
// One implementation; what a person can do follows the same rules as the API:
//   Chairperson  record/edit/void funds, approve/reject/void expenses, record expenses
//   Treasurer    record expenses
// Recording always goes through ONE dialog (DocumentScanner): upload/photo → read,
// or type it in. The manual RecordForm below is only for editing a fund.
//   Others       view only
// cspell:words Tawiran Barangay kabataan
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Wallet, TrendingUp, TrendingDown, Clock, Plus, Pencil, Ban, Check, X, History,
  ShieldCheck, ScanLine, FileText, Upload, Loader2, Eye, Paperclip,
} from 'lucide-react';
import api from '../../lib/api';
import { peso, cn } from '../../lib/utils';
import {
  PageHeader, Card, CardContent, CardHeader, CardTitle, Spinner, Badge, Button,
  Input, Textarea, Select, Modal, Table, THead, TBody, TR, TH, TD, SortableTH, TablePagination, EmptyState, StatCard,
} from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { isHead, ROLES } from '../../lib/roles';
import useTableData from '../../lib/useTableData';
import { FUND_SOURCES, humanize, isPdfUrl } from '../../lib/finance';
import { uploadProof } from '../../lib/scanDocument';
import DocumentScanner from '../../components/finance/DocumentScanner';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const FUND_ACCESSORS = { date: (f) => new Date(f.dateReceived), source: (f) => f.source, amount: (f) => f.amount };
const EXPENSE_ACCESSORS = { date: (e) => new Date(e.dateSpent), title: (e) => e.title, amount: (e) => e.amount, status: (e) => (e.isVoided ? 'voided' : e.status) };

export default function FinancePage() {
  const { user } = useAuth();
  const head = isHead(user?.role);
  const canRecordFund = head; // the API only lets the Chairperson record funds
  const canRecordExpense = head || user?.role === ROLES.TREASURER;

  const qc = useQueryClient();
  // ?tab=expenses opens straight to the approval list (dashboard links here)
  const [params] = useSearchParams();
  const [tab, setTab] = useState(() => (['overview', 'funds', 'expenses'].includes(params.get('tab')) ? params.get('tab') : 'overview'));
  // ?record=expense|fund (dashboard quick actions) opens the record dialog straight away
  const [scanner, setScanner] = useState(() => {
    const r = params.get('record');
    return (r === 'expense' && canRecordExpense) || (r === 'fund' && canRecordFund) ? r : null;
  }); // 'fund' | 'expense'
  const [form, setForm] = useState(null);       // { mode: 'fund'|'edit-fund'|'expense', data }
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const summary = useQuery({ queryKey: ['fin-summary'], queryFn: async () => (await api.get('/finance/summary')).data });
  const fundsQ = useQuery({ queryKey: ['fin-funds'], queryFn: async () => (await api.get('/finance/funds')).data });
  const expsQ = useQuery({ queryKey: ['fin-expenses'], queryFn: async () => (await api.get('/finance/expenses')).data });

  const refresh = () => ['fin-summary', 'fin-funds', 'fin-expenses', 'finance-summary', 'budget']
    .forEach((key) => qc.invalidateQueries({ queryKey: [key] }));

  const s = summary.data || {};
  const funds = useMemo(() => fundsQ.data?.funds || [], [fundsQ.data]);
  const expenses = useMemo(() => expsQ.data?.expenses || [], [expsQ.data]);
  const pendingCount = expenses.filter((e) => e.status === 'pending' && !e.isVoided).length;

  const fundTable = useTableData(funds, { accessors: FUND_ACCESSORS, initialSort: { key: 'date', dir: 'desc' } });
  const expTable = useTableData(expenses, { accessors: EXPENSE_ACCESSORS, initialSort: { key: 'date', dir: 'desc' } });

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'funds', label: 'Funds', count: funds.length },
    { key: 'expenses', label: 'Expenses', count: expenses.length, alert: head && pendingCount ? pendingCount : 0 },
  ];

  return (
    <>
      <PageHeader
        title="Budget & Finance"
        description={head ? 'Record funds, review expenses, and keep an auditable money trail.' : canRecordExpense ? 'Record expenses and track the SK budget.' : 'See how the SK budget is received and spent.'}
        actions={
          <>
            {canRecordFund && <Button variant="outline" onClick={() => setScanner('fund')}><Plus className="h-4 w-4" /> Record fund</Button>}
            {canRecordExpense && <Button onClick={() => setScanner('expense')}><Plus className="h-4 w-4" /> Record expense</Button>}
            {!canRecordExpense && <Badge variant="default"><Eye className="h-3.5 w-3.5" /> View only</Badge>}
          </>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>Every money action is permanently logged with who did it. Records are never deleted — they are voided with a reason, and edits keep the original values.</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="tablist" aria-label="Finance sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={cn('inline-flex min-h-[36px] items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors',
              tab === t.key ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
            {t.label}
            {t.count != null && <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{t.count}</span>}
            {t.alert > 0 && <span className="rounded bg-warning px-1.5 text-xs font-bold text-warning-fg" title={`${t.alert} waiting for approval`}>{t.alert}<span className="sr-only"> waiting for approval</span></span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (summary.isLoading ? <Center /> : <Overview s={s} head={head} onPublish={() => setPublishing(true)} />)}

      {tab === 'funds' && (
        <>
          {fundsQ.isLoading ? <Center /> : funds.length === 0 ? (
            <EmptyState icon={Wallet} title="No funds recorded yet"
              description={canRecordFund ? 'Use “Record fund” at the top — add the deposit slip, check or transfer receipt, or type the details in.' : 'Funds appear here once the Chairperson records them.'} />
          ) : (
            <Table label="Funds" stack footer={<TablePagination {...pagerProps(fundTable)} noun="funds" />}>
              <THead><TR>
                <SortableTH sortKey="date" sort={fundTable.sort} onSort={fundTable.toggleSort}>Date</SortableTH>
                <SortableTH sortKey="source" sort={fundTable.sort} onSort={fundTable.toggleSort}>Source</SortableTH>
                <SortableTH sortKey="amount" sort={fundTable.sort} onSort={fundTable.toggleSort} className="text-right">Amount</SortableTH>
                <TH>Recorded by</TH>
                {canRecordFund && <TH className="text-right"><span className="sr-only">Actions</span></TH>}
              </TR></THead>
              <TBody>
                {fundTable.pageRows.map((f) => (
                  <TR key={f._id} className={f.isVoided ? 'opacity-60' : ''}>
                    <TD label="Date" className="whitespace-nowrap">{fmt(f.dateReceived)}</TD>
                    <TD label="Source">
                      <div className="font-semibold text-fg">{f.source}</div>
                      <div className="mt-0.5 flex flex-wrap items-center justify-end gap-1.5 text-xs text-subtle sm:justify-start">
                        {humanize(f.sourceType)}
                        {f.referenceNumber && <span>· Ref {f.referenceNumber}</span>}
                        {f.receiptPhoto && <a href={f.receiptPhoto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Paperclip className="h-3 w-3" /> Proof</a>}
                        {f.editHistory?.length > 0 && <Badge variant="warning"><History className="h-3 w-3" /> Edited</Badge>}
                        {f.isVoided && <Badge variant="danger">Voided</Badge>}
                      </div>
                    </TD>
                    <TD label="Amount" className="text-right font-bold tabular-nums text-success">{peso(f.amount)}</TD>
                    <TD label="Recorded by" className="text-sm">{f.recordedBy?.firstName} {f.recordedBy?.lastName}</TD>
                    {canRecordFund && (
                      <TD className="text-right">
                        {!f.isVoided && (
                          <div className="flex justify-end gap-1">
                            <IconAction label={`Edit fund from ${f.source}`} icon={Pencil} onClick={() => setForm({ mode: 'edit-fund', data: f })} />
                            <IconAction label={`Void fund from ${f.source}`} icon={Ban} tone="danger" onClick={() => setReason({ kind: 'void-fund', id: f._id })} />
                          </div>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}

      {tab === 'expenses' && (
        <>
          {expsQ.isLoading ? <Center /> : expenses.length === 0 ? (
            <EmptyState icon={TrendingDown} title="No expenses recorded yet"
              description={canRecordExpense ? 'Use “Record expense” at the top — add the receipt and the items, total and date are filled in for you.' : 'Recorded expenses appear here.'} />
          ) : (
            <Table label="Expenses" stack footer={<TablePagination {...pagerProps(expTable)} noun="expenses" />}>
              <THead><TR>
                <SortableTH sortKey="date" sort={expTable.sort} onSort={expTable.toggleSort}>Date</SortableTH>
                <SortableTH sortKey="title" sort={expTable.sort} onSort={expTable.toggleSort}>Expense</SortableTH>
                <SortableTH sortKey="amount" sort={expTable.sort} onSort={expTable.toggleSort} className="text-right">Amount</SortableTH>
                <SortableTH sortKey="status" sort={expTable.sort} onSort={expTable.toggleSort}>Status</SortableTH>
                {head && <TH className="text-right"><span className="sr-only">Actions</span></TH>}
              </TR></THead>
              <TBody>
                {expTable.pageRows.map((e) => (
                  <TR key={e._id} className={e.isVoided ? 'opacity-60' : ''}>
                    <TD label="Date" className="whitespace-nowrap">{fmt(e.dateSpent)}</TD>
                    <TD label="Expense">
                      <button type="button" className="text-right sm:text-left" onClick={() => setDetail(e)}>
                        <span className="block font-semibold text-fg hover:text-primary hover:underline">{e.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center justify-end gap-1.5 text-xs text-subtle sm:justify-start">
                          {humanize(e.category)}{e.vendor ? ` · ${e.vendor}` : ''}
                          {e.program?.title ? ` · ${e.program.title}` : ''}
                          {e.items?.length > 0 && <Badge variant="info">{e.items.length} items</Badge>}
                          {e.source === 'scanned' && <Badge variant="default"><ScanLine className="h-3 w-3" /> Scanned</Badge>}
                        </span>
                      </button>
                      {e.status === 'rejected' && e.rejectionReason && <div className="mt-1 text-xs text-danger">Rejected: {e.rejectionReason}</div>}
                    </TD>
                    <TD label="Amount" className="text-right font-bold tabular-nums text-danger">{peso(e.amount)}</TD>
                    <TD label="Status"><StatusBadge status={e.isVoided ? 'voided' : e.status} /></TD>
                    {head && (
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          {e.status === 'pending' && !e.isVoided && (
                            <>
                              <IconAction label={`Approve ${e.title}`} icon={Check} tone="success" onClick={() => setReason({ kind: 'approve', id: e._id })} />
                              <IconAction label={`Reject ${e.title}`} icon={X} tone="danger" onClick={() => setReason({ kind: 'reject', id: e._id })} />
                            </>
                          )}
                          {e.status === 'approved' && !e.isVoided && (
                            <IconAction label={`Void ${e.title}`} icon={Ban} tone="danger" onClick={() => setReason({ kind: 'void-expense', id: e._id })} />
                          )}
                        </div>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}

      {form && <RecordForm modal={form} onClose={() => setForm(null)} onDone={() => { setForm(null); refresh(); }} />}
      {reason && <ReasonModal state={reason} onClose={() => setReason(null)} onDone={() => { setReason(null); refresh(); }} />}
      {detail && <ExpenseDetail expense={detail} onClose={() => setDetail(null)} />}
      {scanner && <DocumentScanner open kind={scanner} onClose={() => setScanner(null)} onDone={refresh} />}
      {publishing && <PublishBudgetModal s={s} onClose={() => setPublishing(false)} onDone={() => { setPublishing(false); refresh(); }} />}
    </>
  );
}

const pagerProps = (t) => ({ page: t.page, pageCount: t.pageCount, total: t.total, pageSize: t.pageSize, onPage: t.setPage });

function Center() {
  return <div className="flex justify-center rounded-xl border border-border bg-surface py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>;
}

function IconAction({ label, icon, tone, onClick }) {
  const Icon = icon;
  const tones = { danger: 'text-danger hover:bg-danger/10', success: 'text-success hover:bg-success/10' };
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-fg', tones[tone])}>
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

function StatusBadge({ status }) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger', voided: 'default' };
  return <Badge variant={map[status] || 'default'}>{humanize(status)}</Badge>;
}

/* Overview: headline numbers + where money comes from and goes */
function Overview({ s, head, onPublish }) {
  const funded = s.totalFunds || 0;
  const spent = s.totalExpenses || 0;
  const usedPct = funded > 0 ? Math.min(100, Math.round((spent / funded) * 100)) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total funds" value={peso(funded)} icon={TrendingUp} tone="success" />
        <StatCard label="Total spent" value={peso(spent)} icon={TrendingDown} tone="danger" />
        <StatCard label="Balance" value={peso(s.balance || 0)} icon={Wallet} tone="primary" />
        <StatCard label="Waiting for approval" value={s.pendingExpenses?.count || 0} icon={Clock} tone="warning" hint={peso(s.pendingExpenses?.total || 0)} />
      </div>

      <PublishedBudgetCard published={s.published} spent={spent} head={head} onEdit={onPublish} />

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted">Budget used</p>
              <p className="text-2xl font-bold tabular-nums text-fg">{usedPct}%</p>
            </div>
            <p className="text-sm text-muted">{peso(spent)} of {peso(funded)}</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
            <div className={cn('h-full rounded-full transition-[width] duration-700', usedPct > 85 ? 'bg-danger' : 'bg-primary')} style={{ width: `${usedPct}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="Funds by source" rows={s.fundsBySource} empty="No funds recorded." unit="record" tone="bg-success" />
        <Breakdown title="Approved spending by category" rows={s.expensesByCategory} empty="No approved expenses yet." unit="item" tone="bg-primary" />
      </div>
    </div>
  );
}

function Breakdown({ title, rows = [], empty, unit, tone }) {
  const max = Math.max(1, ...rows.map((r) => r.total || 0));
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : rows.map((r) => (
          <div key={r._id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-fg">{humanize(r._id)}</span>
              <span className="font-semibold tabular-nums text-fg">{peso(r.total)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
              <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(3, (r.total / max) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-subtle">{r.count} {unit}{r.count === 1 ? '' : 's'}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ExpenseDetail({ expense: e, onClose }) {
  return (
    <Modal open onClose={onClose} size="md" title={e.title}
      description={`${humanize(e.category)}${e.vendor ? ` · ${e.vendor}` : ''} · ${fmt(e.dateSpent)}`}
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        {e.receiptPhoto && (isPdfUrl(e.receiptPhoto)
          ? <a href={e.receiptPhoto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-surface2"><FileText className="h-4 w-4" /> View receipt (PDF)</a>
          : <a href={e.receiptPhoto} target="_blank" rel="noreferrer"><img src={e.receiptPhoto} alt="Receipt" className="max-h-72 w-full rounded-lg border border-border bg-surface2 object-contain" /></a>)}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {e.receiptNumber && <div><dt className="text-xs text-subtle">Receipt no.</dt><dd className="font-medium text-fg">{e.receiptNumber}</dd></div>}
          <div><dt className="text-xs text-subtle">Status</dt><dd><StatusBadge status={e.isVoided ? 'voided' : e.status} /></dd></div>
          {e.recordedBy && <div><dt className="text-xs text-subtle">Recorded by</dt><dd className="font-medium text-fg">{e.recordedBy.firstName} {e.recordedBy.lastName}</dd></div>}
          {e.program?.title && <div><dt className="text-xs text-subtle">Program</dt><dd className="font-medium text-fg">{e.program.title}{e.activity?.title ? ` › ${e.activity.title}` : ''}</dd></div>}
        </dl>
        {e.items?.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Breakdown</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {e.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="text-fg">{it.description || 'Item'}{it.quantity > 1 && <span className="text-subtle"> × {it.quantity}</span>}</span>
                  <span className="font-semibold tabular-nums text-fg">{peso(it.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="text-sm text-muted">No itemized breakdown for this expense.</p>}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-muted">Total</span>
          <span className="text-lg font-bold tabular-nums text-fg">{peso(e.amount)}</span>
        </div>
      </div>
    </Modal>
  );
}

/* Attach a receipt / proof document (no reading) */
function ProofField({ value, onChange, hint }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadProof(file)); toast.success('Document attached.'); }
    catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <p className="label">Receipt / proof document <span className="font-normal text-subtle">(optional)</span></p>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          {isPdfUrl(value)
            ? <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface2 text-primary"><FileText className="h-5 w-5" /></span>
            : <img src={value} alt="" className="h-12 w-12 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><Check className="h-4 w-4" /> Attached</p>
            <a href={value} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">View</a>
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => onChange('')}>Remove</Button>
        </div>
      ) : (
        <label className={cn('flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary', busy && 'pointer-events-none opacity-60')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {busy ? 'Uploading…' : 'Attach photo or PDF'}
          <input type="file" accept="image/*,.heic,.heif,application/pdf" capture={undefined} className="sr-only" onChange={pick} disabled={busy} />
        </label>
      )}
      {hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/* Edit an existing fund (new funds and expenses are recorded through DocumentScanner) */
function RecordForm({ modal, onClose, onDone }) {
  const d = modal.data || {};
  const [form, setForm] = useState({
    source: d.source || '', sourceType: d.sourceType || 'barangay_allocation',
    amount: d.amount ?? '', referenceNumber: d.referenceNumber || '',
    purpose: d.purpose || '', notes: d.notes || '', receiptPhoto: d.receiptPhoto || '',
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const m = useMutation({
    mutationFn: (payload) => api.put(`/finance/funds/${d._id}`, payload),
    onSuccess: (r) => { toast.success(r.data.message || 'Saved.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save.'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (m.isPending) return; // no double submit
    if (!form.source.trim() || !(Number(form.amount) > 0)) return toast.error('Source and amount are required.');
    m.mutate({ ...form, amount: Number(form.amount) });
  };

  return (
    <Modal open onClose={onClose} size="lg"
      title="Edit fund"
      description="The original values are kept in the edit history."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Received from" name="source" value={form.source} onChange={on} placeholder="e.g. Barangay Tawiran" />
          <Select label="Source type" name="sourceType" value={form.sourceType} onChange={on}>
            {FUND_SOURCES.map((so) => <option key={so.value} value={so.value}>{so.label}</option>)}
          </Select>
          <Input label="Amount (₱)" name="amount" type="number" step="0.01" min="0" value={form.amount} onChange={on} />
          <Input label="Reference no." name="referenceNumber" value={form.referenceNumber} onChange={on} hint="Check, OR, deposit or transaction number" />
          <Input label="Purpose" name="purpose" value={form.purpose} onChange={on} />
        </div>
        <Textarea label="Notes" name="notes" value={form.notes} onChange={on} rows={2} />
        <ProofField value={form.receiptPhoto} onChange={(v) => setForm((f) => ({ ...f, receiptPhoto: v }))} hint="Replace or add the deposit slip, check, transfer receipt or acknowledgement receipt." />

        {d.editHistory?.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-warning"><History className="h-4 w-4" /> Edit history</p>
            <ul className="space-y-1 text-xs text-fg">
              {d.editHistory.map((h, i) => <li key={i}>{fmt(h.editedAt)} — {h.changes || 'edited'}</li>)}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  );
}

function ReasonModal({ state, onClose, onDone }) {
  const [text, setText] = useState('');
  const needsReason = state.kind !== 'approve';
  const cfg = {
    approve: { title: 'Approve expense', verb: 'Approve', run: (id) => api.put(`/finance/expenses/${id}/approve`) },
    reject: { title: 'Reject expense', verb: 'Reject', run: (id, r) => api.put(`/finance/expenses/${id}/reject`, { reason: r }) },
    'void-expense': { title: 'Void expense', verb: 'Void', run: (id, r) => api.put(`/finance/expenses/${id}/void`, { reason: r }) },
    'void-fund': { title: 'Void fund', verb: 'Void', run: (id, r) => api.put(`/finance/funds/${id}/void`, { reason: r }) },
  }[state.kind];

  const m = useMutation({
    mutationFn: () => cfg.run(state.id, text.trim()),
    onSuccess: (r) => { toast.success(r.data.message || 'Done.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <Modal open onClose={onClose} title={cfg.title}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={state.kind === 'approve' ? 'primary' : 'danger'} loading={m.isPending}
          disabled={needsReason && !text.trim()} onClick={() => m.mutate()}>{cfg.verb}</Button></>}>
      {needsReason
        ? <Textarea label="Reason (required)" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="State the reason — it is saved in the audit trail." />
        : <p className="text-sm text-muted">Approving counts this expense against the balance. This action is logged.</p>}
    </Modal>
  );
}

/* The budget figure kabataan see on Budget Transparency. Spending always comes from approved expenses. */
function PublishedBudgetCard({ published, spent, head, onEdit }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info"><Eye aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">What kabataan see</p>
            {published ? (
              <p className="mt-0.5 text-sm text-muted">
                Budget <span className="font-semibold tabular-nums text-fg">{peso(published.amount)}</span>
                {published.label ? ` (${published.label})` : ''} · spent <span className="font-semibold tabular-nums text-fg">{peso(spent)}</span>
                {' '}· remaining <span className="font-semibold tabular-nums text-fg">{peso(Math.max(0, published.amount - spent))}</span>
                <span className="block text-xs text-subtle">Published {fmt(published.updatedAt)} by the Chairperson</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted">Only the amount spent ({peso(spent)}). No budget figure is published.</p>
            )}
          </div>
        </div>
        {head && <Button variant="outline" className="shrink-0" onClick={onEdit}><Pencil className="h-4 w-4" /> {published ? 'Change' : 'Publish a budget'}</Button>}
      </CardContent>
    </Card>
  );
}

function PublishBudgetModal({ s, onClose, onDone }) {
  const spent = s.totalExpenses || 0;
  const [amount, setAmount] = useState(s.published?.amount ?? '');
  const [label, setLabel] = useState(s.published?.label || '');
  const n = Number(amount);
  const tooLow = amount !== '' && n < spent;

  const m = useMutation({
    mutationFn: (payload) => api.put('/finance/published-budget', payload),
    onSuccess: (r) => { toast.success(r.data.message || 'Saved.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save.'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (m.isPending) return;
    if (amount === '' || !(n >= 0)) return toast.error('Enter the budget amount.');
    if (tooLow) return;
    m.mutate({ amount: n, label: label.trim() });
  };

  return (
    <Modal open onClose={onClose} title="Budget shown to kabataan"
      description="Kabataan see this amount, what has been spent, and what remains on their Budget Transparency page."
      footer={<>
        {s.published && <Button variant="ghost" className="mr-auto text-danger" loading={m.isPending} onClick={() => m.mutate({ amount: null })}>Stop showing</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={m.isPending} disabled={tooLow} onClick={submit}>Publish</Button>
      </>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Budget amount (₱)" type="number" min={spent} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
          error={tooLow ? `Can't be lower than what has been spent (${peso(spent)}).` : undefined}
          hint={`Recorded funds: ${peso(s.totalFunds || 0)} · spent so far: ${peso(spent)}`} />
        <Input label="Label (optional)" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. SK Fund FY 2026" />
        <p className="flex items-start gap-2 rounded-xl bg-surface2/70 p-3 text-xs text-muted">
          <History aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Every change is saved in the audit log with the recorded funds at that time. Spending can't be changed here — it always comes from approved expenses.
        </p>
      </form>
    </Modal>
  );
}
