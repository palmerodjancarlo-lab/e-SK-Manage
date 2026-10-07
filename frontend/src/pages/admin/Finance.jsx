// cspell:words Tawiran Barangay kabataan
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Wallet, TrendingUp, TrendingDown, Clock, Plus, Pencil, Ban,
  Check, X, History, ShieldAlert, ScanLine, FileText,
  Upload, Camera, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import { peso } from '../../lib/utils';
import {
  PageHeader, Card, CardContent, CardHeader, CardTitle, Spinner, Badge, Button,
  Input, Textarea, Select, Modal, Table, THead, TBody, TR, TH, TD, EmptyState, StatCard,
} from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { isHead, ROLES } from '../../lib/roles';
import ReceiptScanner from '../../components/finance/ReceiptScanner';

const FUND_SOURCES = [
  { value: 'barangay_allocation', label: 'Barangay Allocation' },
  { value: 'donation', label: 'Donation' },
  { value: 'grant', label: 'Grant' },
  { value: 'other', label: 'Other' },
];
const EXPENSE_CATS = ['supplies', 'food', 'transportation', 'equipment', 'venue', 'printing', 'honorarium', 'other'];
const TABS = [{ key: 'overview', label: 'Overview' }, { key: 'funds', label: 'Funds' }, { key: 'expenses', label: 'Expenses' }];

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const label = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isPdf = (u) => /\.pdf($|\?)/i.test(u || '');

export default function Finance() {
  const { user } = useAuth();
  const head = isHead(user?.role);
  const canRecordExpense = head || user?.role === ROLES.TREASURER;

  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [scanOpen, setScanOpen] = useState(false);

  const summary = useQuery({ queryKey: ['fin-summary'], queryFn: async () => (await api.get('/finance/summary')).data });
  const fundsQ = useQuery({ queryKey: ['fin-funds'], queryFn: async () => (await api.get('/finance/funds')).data });
  const expsQ = useQuery({ queryKey: ['fin-expenses'], queryFn: async () => (await api.get('/finance/expenses')).data });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['fin-summary'] });
    qc.invalidateQueries({ queryKey: ['fin-funds'] });
    qc.invalidateQueries({ queryKey: ['fin-expenses'] });
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
  };

  const [fundModal, setFundModal] = useState(null);
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState(null); // expense breakdown viewer

  const s = summary.data || {};
  const funds = fundsQ.data?.funds || [];
  const expenses = expsQ.data?.expenses || [];

  return (
    <>
      <PageHeader
        title="Budget & Finance"
        description={head ? 'Record funds, review expenses, and keep an auditable money trail.' : 'Record expenses and track the SK budget.'}
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-info/25 bg-info/10 px-5 py-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-info" />
        <p className="text-sm text-fg">
          Every money action is permanently logged with the actor and IP. Edited records keep their original values.
        </p>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-surface2 p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        summary.isLoading ? <Center /> : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Funds" value={peso(s.totalFunds || 0)} icon={TrendingUp} tone="success" />
              <StatCard label="Total Expenses" value={peso(s.totalExpenses || 0)} icon={TrendingDown} tone="danger" />
              <StatCard label="Balance" value={peso(s.balance || 0)} icon={Wallet} tone="primary" />
              <StatCard label="Pending" value={s.pendingExpenses?.count || 0} icon={Clock} tone="warning" hint={peso(s.pendingExpenses?.total || 0)} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Funds by source</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(s.fundsBySource || []).length === 0 ? <p className="text-sm text-muted">No funds recorded.</p> :
                    s.fundsBySource.map((r) => <Row key={r._id} left={label(r._id)} right={peso(r.total)} sub={`${r.count} record(s)`} />)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Expenses by category</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(s.expensesByCategory || []).length === 0 ? <p className="text-sm text-muted">No approved expenses.</p> :
                    s.expensesByCategory.map((r) => <Row key={r._id} left={label(r._id)} right={peso(r.total)} sub={`${r.count} item(s)`} />)}
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}

      {tab === 'funds' && (
        <>
          {head && (
            <div className="mb-3 flex justify-end">
              <Button onClick={() => setFundModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> Record fund</Button>
            </div>
          )}
          <Card><CardContent className="p-0">
            {fundsQ.isLoading ? <Center /> : funds.length === 0 ? (
              <div className="p-6"><EmptyState icon={Wallet} title="No funds yet" description={head ? 'Record your first fund.' : 'No funds have been recorded yet.'} /></div>
            ) : (
              <Table>
                <THead><TR><TH>Date</TH><TH>Source</TH><TH>Amount</TH><TH>Recorded by</TH>{head && <TH className="text-right">Actions</TH>}</TR></THead>
                <TBody>
                  {funds.map((f) => (
                    <TR key={f._id} className={f.isVoided ? 'opacity-60' : ''}>
                      <TD>{fmt(f.dateReceived)}</TD>
                      <TD>
                        <div className="font-semibold text-fg">{f.source}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                          {label(f.sourceType)}
                          {f.receiptPhoto && (
                            <a href={f.receiptPhoto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                              <FileText className="h-3 w-3" /> Proof
                            </a>
                          )}
                          {f.editHistory?.length > 0 && <Badge variant="warning"><History className="h-3 w-3" /> Edited</Badge>}
                          {f.isVoided && <Badge variant="danger">Voided</Badge>}
                        </div>
                      </TD>
                      <TD className="font-bold text-success">{peso(f.amount)}</TD>
                      <TD className="text-sm">{f.recordedBy?.firstName} {f.recordedBy?.lastName}</TD>
                      {head && (
                        <TD className="text-right">
                          {!f.isVoided && (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setFundModal({ mode: 'edit', data: f })}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setReason({ kind: 'void-fund', id: f._id })}><Ban className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent></Card>
        </>
      )}

      {tab === 'expenses' && (
        <>
          {canRecordExpense && (
            <div className="mb-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScanOpen(true)}><ScanLine className="h-4 w-4" /> Scan receipt</Button>
              <Button onClick={() => setFundModal({ mode: 'expense', data: {} })}><Plus className="h-4 w-4" /> Record expense</Button>
            </div>
          )}
          <Card><CardContent className="p-0">
            {expsQ.isLoading ? <Center /> : expenses.length === 0 ? (
              <div className="p-6"><EmptyState icon={TrendingDown} title="No expenses yet" description="Recorded expenses appear here." /></div>
            ) : (
              <Table>
                <THead><TR><TH>Date</TH><TH>Expense</TH><TH>Amount</TH><TH>Status</TH>{head && <TH className="text-right">Actions</TH>}</TR></THead>
                <TBody>
                  {expenses.map((e) => (
                    <TR key={e._id} className={e.isVoided ? 'opacity-60' : ''}>
                      <TD>{fmt(e.dateSpent)}</TD>
                      <TD>
                        <button className="text-left" onClick={() => setDetail(e)}>
                          <div className="font-semibold text-fg hover:text-primary">{e.title}</div>
                          <div className="flex items-center gap-1.5 text-xs text-subtle">
                            {label(e.category)}{e.vendor ? ` · ${e.vendor}` : ''}
                            {e.items?.length > 0 && <Badge variant="info">{e.items.length} items</Badge>}
                            {e.source === 'scanned' && <Badge variant="default"><ScanLine className="h-3 w-3" /> Scanned</Badge>}
                          </div>
                        </button>
                        {e.status === 'rejected' && e.rejectionReason && <div className="text-xs text-danger">Rejected: {e.rejectionReason}</div>}
                      </TD>
                      <TD className="font-bold text-danger">{peso(e.amount)}</TD>
                      <TD><StatusBadge status={e.isVoided ? 'voided' : e.status} /></TD>
                      {head && (
                        <TD className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {e.status === 'pending' && !e.isVoided && (
                              <>
                                <Button size="sm" variant="ghost" className="text-success hover:bg-success/10" onClick={() => setReason({ kind: 'approve', id: e._id })}><Check className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setReason({ kind: 'reject', id: e._id })}><X className="h-4 w-4" /></Button>
                              </>
                            )}
                            {e.status === 'approved' && !e.isVoided && (
                              <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setReason({ kind: 'void-expense', id: e._id })}><Ban className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent></Card>
        </>
      )}

      {fundModal && <FundExpenseForm modal={fundModal} onClose={() => setFundModal(null)} onDone={() => { setFundModal(null); refresh(); }} />}
      {reason && <ReasonModal state={reason} onClose={() => setReason(null)} onDone={() => { setReason(null); refresh(); }} />}
      {detail && <ExpenseDetail expense={detail} onClose={() => setDetail(null)} />}
      <ReceiptScanner open={scanOpen} onClose={() => setScanOpen(false)} onDone={refresh} />
    </>
  );
}

function Center() { return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>; }
function Row({ left, right, sub }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface2/60 px-4 py-2.5">
      <div><p className="text-sm font-semibold text-fg">{left}</p>{sub && <p className="text-xs text-subtle">{sub}</p>}</div>
      <p className="font-bold text-fg">{right}</p>
    </div>
  );
}
function StatusBadge({ status }) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger', voided: 'default' };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
}

function ExpenseDetail({ expense: e, onClose }) {
  return (
    <Modal open onClose={onClose} size="md" title={e.title}
      description={`${label(e.category)}${e.vendor ? ` · ${e.vendor}` : ''} · ${fmt(e.dateSpent)}`}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        {e.receiptPhoto && (
          isPdf(e.receiptPhoto)
            ? <a href={e.receiptPhoto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-surface2"><FileText className="h-4 w-4" /> View receipt (PDF)</a>
            : <img src={e.receiptPhoto} alt="Receipt" className="max-h-64 w-full rounded-xl border border-border object-contain" />
        )}
        {e.items?.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">Breakdown</p>
            <div className="space-y-1.5">
              {e.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-surface2/60 px-3 py-2 text-sm">
                  <span className="text-fg">{it.description || 'Item'}</span>
                  <span className="font-semibold text-fg">{peso(it.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="text-sm text-muted">No itemized breakdown for this expense.</p>}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-muted">Total</span>
          <span className="text-lg font-bold text-fg">{peso(e.amount)}</span>
        </div>
      </div>
    </Modal>
  );
}

// Receipt / proof document uploader for funds (attach a file or scan with the camera)
function ReceiptField({ value, onChange }) {
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.url || data.photo || data.secure_url);
      toast.success('Document attached.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted">Receipt / proof document <span className="font-normal text-subtle">(optional)</span></p>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={pick} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          {isPdf(value)
            ? <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface2 text-primary"><FileText className="h-5 w-5" /></span>
            : <img src={value} alt="Receipt" className="h-12 w-12 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><Check className="h-4 w-4" /> Document attached</p>
            <a href={value} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">View</a>
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => onChange('')}>Remove</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Attach file
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => camRef.current?.click()} disabled={uploading}>
            <Camera className="h-4 w-4" /> Scan (camera)
          </Button>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-subtle">Attach the deposit slip, check, or acknowledgment receipt as proof of the received budget.</p>
    </div>
  );
}

function FundExpenseForm({ modal, onClose, onDone }) {
  const isExpense = modal.mode === 'expense';
  const isEdit = modal.mode === 'edit';
  const d = modal.data || {};
  const [form, setForm] = useState(
    isExpense
      ? { title: '', description: '', category: 'other', amount: '', vendor: '', receiptNumber: '', dateSpent: '' }
      : {
          source: d.source || '', sourceType: d.sourceType || 'barangay_allocation',
          amount: d.amount || '', referenceNumber: d.referenceNumber || '',
          dateReceived: d.dateReceived ? d.dateReceived.slice(0, 10) : '', purpose: d.purpose || '', notes: d.notes || '',
          receiptPhoto: d.receiptPhoto || '',
        }
  );
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const m = useMutation({
    mutationFn: (payload) => {
      if (isExpense) return api.post('/finance/expenses', payload);
      if (isEdit) return api.put(`/finance/funds/${d._id}`, payload);
      return api.post('/finance/funds', payload);
    },
    onSuccess: (r) => { toast.success(r.data.message || 'Saved.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (isExpense) {
      if (!form.title || !form.amount) return toast.error('Title and amount are required.');
    } else if (!form.source || !form.amount) {
      return toast.error('Source and amount are required.');
    }
    m.mutate({ ...form, amount: Number(form.amount) });
  };

  return (
    <Modal open onClose={onClose} size="lg"
      title={isExpense ? 'Record expense' : isEdit ? 'Edit fund' : 'Record fund'}
      description={isEdit ? 'Original values are preserved in the edit history.' : undefined}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        {isExpense ? (
          <>
            <Input label="Title" name="title" value={form.title} onChange={on} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" name="category" value={form.category} onChange={on}>
                {EXPENSE_CATS.map((c) => <option key={c} value={c}>{label(c)}</option>)}
              </Select>
              <Input label="Amount (₱)" name="amount" type="number" value={form.amount} onChange={on} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Vendor / supplier" name="vendor" value={form.vendor} onChange={on} />
              <Input label="Receipt no." name="receiptNumber" value={form.receiptNumber} onChange={on} />
            </div>
            <Input label="Date spent" name="dateSpent" type="date" value={form.dateSpent} onChange={on} />
            <Textarea label="Description" name="description" value={form.description} onChange={on} rows={3} />
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Source" name="source" value={form.source} onChange={on} placeholder="e.g. Barangay Tawiran" />
              <Select label="Source type" name="sourceType" value={form.sourceType} onChange={on}>
                {FUND_SOURCES.map((so) => <option key={so.value} value={so.value}>{so.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Amount (₱)" name="amount" type="number" value={form.amount} onChange={on} />
              <Input label="Reference no." name="referenceNumber" value={form.referenceNumber} onChange={on} />
            </div>
            {!isEdit && <Input label="Date received" name="dateReceived" type="date" value={form.dateReceived} onChange={on} />}
            <Input label="Purpose" name="purpose" value={form.purpose} onChange={on} />
            <Textarea label="Notes" name="notes" value={form.notes} onChange={on} rows={2} />
            <ReceiptField value={form.receiptPhoto} onChange={(v) => setForm((f) => ({ ...f, receiptPhoto: v }))} />
          </>
        )}

        {isEdit && d.editHistory?.length > 0 && (
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
    'approve': { title: 'Approve expense', verb: 'Approve', run: (id) => api.put(`/finance/expenses/${id}/approve`) },
    'reject': { title: 'Reject expense', verb: 'Reject', run: (id, r) => api.put(`/finance/expenses/${id}/reject`, { reason: r }) },
    'void-expense': { title: 'Void expense', verb: 'Void', run: (id, r) => api.put(`/finance/expenses/${id}/void`, { reason: r }) },
    'void-fund': { title: 'Void fund', verb: 'Void', run: (id, r) => api.put(`/finance/funds/${id}/void`, { reason: r }) },
  }[state.kind];

  const m = useMutation({
    mutationFn: () => cfg.run(state.id, text),
    onSuccess: (r) => { toast.success(r.data.message || 'Done.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <Modal open onClose={onClose} title={cfg.title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={state.kind === 'approve' ? 'primary' : 'danger'} loading={m.isPending}
          disabled={needsReason && !text.trim()} onClick={() => m.mutate()}>{cfg.verb}</Button></>}>
      {needsReason
        ? <Textarea label="Reason" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="State the reason…" />
        : <p className="text-sm text-muted">Approving counts this expense against the balance. This is logged.</p>}
    </Modal>
  );
}