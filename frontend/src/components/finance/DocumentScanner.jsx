// components/finance/DocumentScanner.jsx
// The ONE way to record a fund or expense. Three starts, one form:
//   • upload a photo/PDF or • take a photo  → it is stored and read → prefilled
//   • type it in                           → same form, empty
// The user confirms/edits everything before it is saved.
//
//   kind="expense"  store receipts, ORs, sales invoices  → POST /finance/expenses
//   kind="fund"     deposit slips, checks, GCash/Maya, ORs from the treasury,
//                   acknowledgement receipts              → POST /finance/funds
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Camera, ScanLine, Plus, Trash2, RotateCcw, Check, FileText, Aperture,
  Sparkles, AlertTriangle, ExternalLink, ImageOff, PencilLine, Upload,
} from 'lucide-react';
import api from '../../lib/api';
import { scanDocument, isPdfFile } from '../../lib/scanDocument';
import { Modal, Button, Input, Select, Textarea } from '../ui';
import { cn, localDateInput } from '../../lib/utils';
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../../lib/finance';


const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const todayInput = () => localDateInput();
const blankItem = () => ({ description: '', quantity: 1, amount: '' });

const COPY = {
  expense: {
    title: 'Record an expense',
    what: 'store receipts, official receipts and sales invoices',
    proof: 'receipt',
    save: 'Record expense',
  },
  fund: {
    title: 'Record a fund',
    what: 'deposit slips, checks, GCash / Maya transfers and acknowledgement receipts',
    proof: 'document',
    save: 'Record fund',
  },
};

/* Label with an indicator of whether the value came from the document */
function FieldLabel({ children, read, confidence }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      {read && (confidence === 'high'
        ? <span className="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-success"><Sparkles aria-hidden="true" className="h-3 w-3" />Read</span>
        : <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-warning"><AlertTriangle aria-hidden="true" className="h-3 w-3" />Check this</span>)}
    </span>
  );
}

export default function DocumentScanner({ open, kind = 'expense', onClose, onDone }) {
  const copy = COPY[kind];
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [step, setStep] = useState('pick'); // pick | camera | reading | review
  const [stage, setStage] = useState('');
  const [localPreview, setLocalPreview] = useState('');
  const [doc, setDoc] = useState(null);     // { url, previewUrl, isPdf, ocr }
  const [form, setForm] = useState({});
  const [items, setItems] = useState([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [manual, setManual] = useState(false); // typed in, no document read

  const ocr = doc?.ocr || {};
  const conf = ocr.confidence || {};
  const itemsTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const mismatch = kind === 'expense' && ocr.total != null && items.some((i) => Number(i.amount) > 0)
    && Math.abs(itemsTotal - ocr.total) >= 0.01;

  /* ── camera ─────────────────────────────────────────────── */
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (step !== 'camera') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })
          .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      } catch {
        if (!cancelled) { toast.error('Could not open the camera. Upload a photo instead.'); setStep('pick'); }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [step]);

  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const reset = () => {
    stopCamera();
    setStep('pick'); setStage(''); setDoc(null); setSaving(false); setPreviewBroken(false); setManual(false);
    setLocalPreview(''); setForm({}); setItems([blankItem()]);
  };
  const close = () => { reset(); onClose?.(); };

  /* ── read a file ────────────────────────────────────────── */
  // keepTyped: a document added after typing fills only the fields still empty
  const prefill = (data, keepTyped = false) => {
    const o = data.ocr || {};
    const merge = (next) => setForm((prev) => (keepTyped
      ? Object.fromEntries(Object.entries(next).map(([key, val]) => [key, String(prev[key] ?? '').trim() ? prev[key] : val]))
      : next));
    if (kind === 'expense') {
      const read = (o.items || []).map((it) => ({ description: it.description, quantity: it.quantity || 1, amount: String(it.amount) }));
      const fromDoc = read.length ? read : o.total ? [{ description: o.vendor ? `Purchase at ${o.vendor}` : 'Receipt total', quantity: 1, amount: String(o.total) }] : [blankItem()];
      setItems((prev) => (keepTyped && prev.some((it) => it.description || it.amount) ? prev : fromDoc));
      merge({
        title: o.vendor ? `Purchase — ${o.vendor}` : '',
        vendor: o.vendor || '',
        category: EXPENSE_CATEGORIES.includes(o.category) ? o.category : 'other',
        dateSpent: o.date || todayInput(),
        receiptNumber: o.referenceNumber || '',
        notes: '',
      });
    } else {
      merge({
        source: o.payer || o.vendor || '',
        sourceType: o.sourceType || 'barangay_allocation',
        amount: o.total != null ? String(o.total) : '',
        referenceNumber: o.referenceNumber || '',
        dateReceived: o.date || todayInput(),
        purpose: '',
        notes: '',
      });
    }
  };

  const startManual = () => { prefill({}); setManual(true); setStep('review'); };

  const readFile = async (file) => {
    if (!file) return;
    const typed = manual;
    if (file.size > 10 * 1024 * 1024) { toast.error('That file is over 10 MB. Try a smaller photo or scan.'); return; }
    setLocalPreview(isPdfFile(file) || /hei[cf]/i.test(file.type + file.name) ? '' : URL.createObjectURL(file));
    setStep('reading');
    try {
      const data = await scanDocument(file, setStage);
      setDoc(data);
      prefill(data, typed);
      setManual(false);
      setStep('review');
      if (data.ocr?.error) toast(data.ocr.error, { icon: '⚠️', duration: 6000 });
      else toast.success('Document read — please check the details.');
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Reading took too long. Check your connection and try again.'
        : err.response?.data?.message || 'Could not upload that document. Please try again.';
      toast.error(msg);
      setStep(typed ? 'review' : 'pick');
    }
  };

  const onFileInput = (e) => { const f = e.target.files?.[0]; e.target.value = ''; readFile(f); };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); };

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stopCamera();
      readFile(new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  /* ── edit helpers ───────────────────────────────────────── */
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const setItem = (i, key, val) => setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addItem = () => setItems((rows) => [...rows, blankItem()]);
  const removeItem = (i) => setItems((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [blankItem()]));
  const receiptDiff = ocr.total != null ? Math.round((ocr.total - itemsTotal) * 100) / 100 : 0;
  // Extra charges become their own line; a discount (items > total) is recorded
  // as one line at the printed total, since item amounts cannot be negative.
  const fixMismatch = () => {
    if (receiptDiff > 0) {
      setItems((rows) => [...rows.filter((r) => r.description || r.amount), { description: 'Other charges on receipt', quantity: 1, amount: String(receiptDiff) }]);
    } else {
      setItems([{ description: `Receipt total${form.vendor ? ` — ${form.vendor}` : ''} (after discount)`, quantity: 1, amount: String(ocr.total) }]);
    }
  };

  /* ── save ───────────────────────────────────────────────── */
  const save = async () => {
    try {
      if (kind === 'expense') {
        const clean = items
          .map((it) => ({ description: it.description.trim(), quantity: Number(it.quantity) || 1, amount: Number(it.amount) || 0, category: form.category }))
          .filter((it) => it.description && it.amount > 0);
        const total = clean.reduce((s, it) => s + it.amount, 0);
        if (!form.title?.trim()) return toast.error('Give this expense a title.');
        if (!clean.length || total <= 0) return toast.error('Add at least one item with a description and amount.');
        if (!form.dateSpent) return toast.error('Enter the date on the receipt.');
        setSaving(true);
        await api.post('/finance/expenses', {
          title: form.title.trim(), vendor: form.vendor.trim(), category: form.category,
          dateSpent: form.dateSpent, receiptDate: form.dateSpent, receiptNumber: form.receiptNumber.trim(),
          notes: form.notes.trim(), amount: total, items: clean,
          source: doc ? 'scanned' : 'manual', receiptPhoto: doc?.url || '',
        });
        toast.success('Expense recorded — waiting for the Chairperson’s approval.');
      } else {
        const amount = Number(form.amount);
        if (!form.source?.trim()) return toast.error('Enter where the fund came from.');
        if (!(amount > 0)) return toast.error('Enter the amount received.');
        if (!form.dateReceived) return toast.error('Enter the date received.');
        setSaving(true);
        await api.post('/finance/funds', {
          source: form.source.trim(), sourceType: form.sourceType, amount,
          referenceNumber: form.referenceNumber.trim(), dateReceived: form.dateReceived,
          purpose: form.purpose.trim(), notes: form.notes.trim(), receiptPhoto: doc?.url || '',
        });
        toast.success('Fund recorded.');
      }
      onDone?.();
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  /* ── render ─────────────────────────────────────────────── */
  const titles = { pick: copy.title, camera: 'Take a photo', reading: 'Reading your document…', review: doc ? 'Check what we read' : 'Enter the details' };

  const footer = step === 'review' ? (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Start over</Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button onClick={save} loading={saving}><Check className="h-4 w-4" /> {copy.save}</Button>
      </div>
    </div>
  ) : step === 'camera' ? (
    <><Button variant="outline" onClick={() => { stopCamera(); setStep('pick'); }}>Back</Button>
      <Button onClick={capture}><Aperture className="h-4 w-4" /> Capture</Button></>
  ) : step === 'pick' ? <Button variant="outline" onClick={close}>Cancel</Button> : null;

  return (
    <Modal open={open} onClose={step === 'reading' ? undefined : close} title={titles[step]} size="xl" footer={footer}
      description={step === 'pick' ? `Add the ${copy.proof} and the details are filled in for you — works with ${copy.what}. You can check and edit everything before saving.` : undefined}>
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif,application/pdf" className="sr-only" tabIndex={-1} onChange={onFileInput} />

      {step === 'pick' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'group flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-surface2/40 hover:border-primary/50 hover:bg-primary/5',
            )}
          >
            <span className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:-translate-y-0.5">
              <ScanLine aria-hidden="true" className="h-7 w-7" />
            </span>
            <span className="mt-4 text-base font-semibold text-fg">Drop a photo or PDF here, or click to browse</span>
            <span className="mt-1 text-sm text-muted">JPG, PNG, HEIC (iPhone) or PDF · up to 10 MB</span>
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => setStep('camera')}><Camera className="h-4 w-4" /> Take a photo</Button>
            <Button variant="ghost" onClick={startManual}><PencilLine className="h-4 w-4" /> No {copy.proof}? Type it in</Button>
          </div>
          <ul className="grid gap-2 text-xs text-muted sm:grid-cols-3">
            <li className="rounded-lg bg-surface2/60 px-3 py-2">Lay the document flat in good light.</li>
            <li className="rounded-lg bg-surface2/60 px-3 py-2">Fit the whole document in the frame.</li>
            <li className="rounded-lg bg-surface2/60 px-3 py-2">Digital PDFs give the most exact result.</li>
          </ul>
        </div>
      )}

      {step === 'camera' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="max-h-[60dvh] w-full object-contain" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/60" />
          </div>
          <p className="text-center text-sm text-muted">Line the document up inside the frame, then press Capture.</p>
        </div>
      )}

      {step === 'reading' && (
        <div className="flex flex-col items-center gap-5 py-4" aria-busy="true">
          <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-border bg-surface2">
            {localPreview
              ? <img src={localPreview} alt="" className="max-h-80 w-full object-contain opacity-90" />
              : <div className="flex h-64 items-center justify-center text-subtle"><FileText aria-hidden="true" className="h-16 w-16" /></div>}
            <span aria-hidden="true" className="absolute inset-x-0 h-1 animate-scan bg-primary shadow-[0_0_18px_4px_rgb(var(--primary)/0.55)]" />
          </div>
          <p className="text-sm font-medium text-fg" role="status" aria-live="polite">{stage || 'Starting…'}</p>
          <p className="max-w-sm text-center text-xs text-muted">The first scan can take up to a minute while the reader starts. Later scans are faster.</p>
        </div>
      )}

      {step === 'review' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            {!doc ? null : ocr.error ? (
              <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-fg" role="alert">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {ocr.error}
              </div>
            ) : (
              <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-fg">
                <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Fields marked <b>Read</b> came from the document; <b>Check this</b> means we are less sure.
                  Correct anything that is wrong — nothing is saved until you press <b>{copy.save}</b>.
                </p>
              </div>
            )}

            {kind === 'expense' ? (
              <>
                <Input label={<FieldLabel>Expense title</FieldLabel>} name="title" value={form.title} onChange={on} placeholder="e.g. Supplies for Youth Summit" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label={<FieldLabel read={!!ocr.vendor} confidence={conf.vendor}>Store / supplier</FieldLabel>} name="vendor" value={form.vendor} onChange={on} />
                  <Input label={<FieldLabel read={!!ocr.date} confidence={conf.date}>Date on receipt</FieldLabel>} name="dateSpent" type="date" max={todayInput()} value={form.dateSpent} onChange={on} />
                  <Input label={<FieldLabel read={!!ocr.referenceNumber} confidence={conf.referenceNumber}>Receipt / OR no.</FieldLabel>} name="receiptNumber" value={form.receiptNumber} onChange={on} />
                  <Select label={<FieldLabel read={ocr.category && ocr.category !== 'other'} confidence="medium">Category</FieldLabel>} name="category" value={form.category} onChange={on}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{capital(c)}</option>)}
                  </Select>
                </div>

                <fieldset>
                  <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-muted">
                    <FieldLabel read={(ocr.items || []).length > 0} confidence={ocr.itemsMatchTotal ? 'high' : 'medium'}>Items</FieldLabel>
                  </legend>
                  <div className="space-y-2">
                    <div className="hidden grid-cols-[minmax(0,1fr)_64px_112px_40px] gap-2 px-1 text-xs font-medium text-subtle sm:grid">
                      <span>Description</span><span className="text-center">Qty</span><span className="text-right">Amount (₱)</span><span />
                    </div>
                    {items.map((it, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_40px] items-center gap-2 border-b border-border pb-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_64px_112px_40px] sm:border-0 sm:pb-0">
                        <input aria-label={`Item ${i + 1} description`} className="input col-span-3 py-2 sm:col-span-1" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Item" />
                        <input aria-label={`Item ${i + 1} quantity`} type="number" min="1" className="input px-2 py-2 text-center" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />
                        <input aria-label={`Item ${i + 1} amount`} type="number" step="0.01" className="input px-2 py-2 text-right tabular-nums" value={it.amount} onChange={(e) => setItem(i, 'amount', e.target.value)} placeholder="0.00" />
                        <button type="button" onClick={() => removeItem(i)} aria-label={`Remove item ${i + 1}`}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-danger/10 hover:text-danger">
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addItem} className="mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5">
                    <Plus aria-hidden="true" className="h-4 w-4" /> Add item
                  </button>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-surface2 px-4 py-3">
                    <span className="text-sm font-medium text-muted">Total to record</span>
                    <span className="text-lg font-bold tabular-nums text-fg">{peso(itemsTotal)}</span>
                  </div>
                  {mismatch && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
                      <span className="flex items-start gap-2 text-fg">
                        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        The receipt total is {peso(ocr.total)}, but the items add up to {peso(itemsTotal)}.
                      </span>
                      <Button size="sm" variant="outline" onClick={fixMismatch}>{receiptDiff > 0 ? 'Add the difference' : 'Use the receipt total'}</Button>
                    </div>
                  )}
                </fieldset>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label={<FieldLabel read={!!(ocr.payer || ocr.vendor)} confidence={ocr.payer ? conf.payer : 'medium'}>Received from</FieldLabel>} name="source" value={form.source} onChange={on} placeholder="e.g. Barangay Tawiran" />
                  <Select label={<FieldLabel read={!!ocr.sourceType} confidence="medium">Source type</FieldLabel>} name="sourceType" value={form.sourceType} onChange={on}>
                    {FUND_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                  <Input label={<FieldLabel read={ocr.total != null} confidence={conf.total}>Amount received (₱)</FieldLabel>} name="amount" type="number" step="0.01" min="0" value={form.amount} onChange={on} />
                  <Input label={<FieldLabel read={!!ocr.date} confidence={conf.date}>Date received</FieldLabel>} name="dateReceived" type="date" max={todayInput()} value={form.dateReceived} onChange={on} />
                  <Input label={<FieldLabel read={!!ocr.referenceNumber} confidence={conf.referenceNumber}>Reference no.</FieldLabel>} name="referenceNumber" value={form.referenceNumber} onChange={on} hint="Check, OR, deposit or transaction number" />
                  <Input label="Purpose" name="purpose" value={form.purpose} onChange={on} placeholder="e.g. SK fund for Q4" />
                </div>
              </>
            )}
            <Textarea label="Notes" name="notes" value={form.notes} onChange={on} rows={2} />
          </div>

          <aside className="space-y-3">
            <p className="text-sm font-medium text-muted">Attached {copy.proof}</p>
            {!doc ? (
              <div className="rounded-xl border border-dashed border-border bg-surface2/50 p-4 text-center">
                <FileText aria-hidden="true" className="mx-auto h-8 w-8 text-subtle" />
                <p className="mt-2 text-sm text-muted">No {copy.proof} attached.</p>
                <p className="mt-1 text-xs text-subtle">Records with proof are easier to audit.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Add {copy.proof}
                </Button>
                <p className="mt-2 text-[11px] text-subtle">Empty fields are filled from it; what you typed stays.</p>
              </div>
            ) : doc.previewUrl && !previewBroken ? (
              <a href={doc.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-border bg-surface2">
                <img src={doc.previewUrl} alt="Uploaded document" onError={() => setPreviewBroken(true)} className="max-h-96 w-full object-contain" />
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-surface/90 px-2 py-1 text-xs font-semibold text-fg opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </span>
              </a>
            ) : (
              <a href={doc?.url} target="_blank" rel="noreferrer" className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface2/50 text-sm font-semibold text-primary">
                {doc?.isPdf ? <FileText aria-hidden="true" className="h-8 w-8" /> : <ImageOff aria-hidden="true" className="h-8 w-8" />} Open document
              </a>
            )}
            {ocr.rawText && (
              <details className="rounded-lg border border-border px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-muted">Text we read</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-subtle">{ocr.rawText}</pre>
              </details>
            )}
          </aside>
        </div>
      )}
    </Modal>
  );
}
