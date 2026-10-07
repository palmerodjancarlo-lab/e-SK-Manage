// src/components/finance/ReceiptScanner.jsx
// Scan / upload a receipt → OCR → line items → review → record as an expense.
// "Take a photo" opens a LIVE webcam (works on laptop/PC and phone). Falls back
// to the file picker if the camera is unavailable or blocked.
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Camera, Upload, ScanLine, Loader2, Plus, Trash2, RotateCcw, Check, FileText, Aperture,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal, Button } from '../ui';
import { cn } from '../../lib/utils';

const CATEGORIES = [
  'supplies', 'food', 'transportation', 'equipment',
  'venue', 'printing', 'honorarium', 'other',
];

const peso = (n) =>
  `\u20B1${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Only ever called from event handlers (never in render), so new Date() is safe.
function toDateInput(s) {
  if (!s) return new Date().toISOString().slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m = String(s).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let [, mo, da, yr] = m;
    if (yr.length === 2) yr = `20${yr}`;
    return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 10);
}

const blankItem = () => ({ description: '', quantity: 1, amount: '', category: 'other' });

export default function ReceiptScanner({ open, onClose, onDone }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const camRef = useRef(null);       // mobile capture input (phones)
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [step, setStep] = useState('capture');   // 'capture' | 'camera' | 'review'
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [preview, setPreview] = useState('');
  const [rawText, setRawText] = useState('');

  const [form, setForm] = useState({
    title: '', vendor: '', category: 'other',
    dateSpent: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [items, setItems] = useState([blankItem()]);

  const itemsTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  // ---- live camera lifecycle ----
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (step !== 'camera') return undefined;
    let cancelled = false;
    (async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not open the camera. Use "Upload file" instead.');
          setStep('capture');
        }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [step]);

  function reset() {
    stopCamera();
    setStep('capture');
    setScanning(false);
    setSaving(false);
    setPreview('');
    setRawText('');
    setForm({ title: '', vendor: '', category: 'other', dateSpent: new Date().toISOString().slice(0, 10), notes: '' });
    setItems([blankItem()]);
  }

  function close() {
    reset();
    onClose?.();
  }

  // ---- OCR upload (shared by upload, phone capture, and webcam capture) ----
  async function processFile(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('receipt', file);
    setScanning(true);
    try {
      const { data } = await api.post('/upload/scan-receipt', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const ocr = data.ocr || {};
      setPreview(data.url || '');
      setRawText(ocr.rawText || '');
      const scanned = (ocr.items || []).map((it) => ({
        description: it.description || '',
        quantity: it.quantity || 1,
        amount: it.amount != null ? String(it.amount) : '',
        category: it.category || 'other',
      }));
      setForm((f) => ({
        ...f,
        vendor: ocr.vendor || '',
        title: ocr.vendor ? `Purchase — ${ocr.vendor}` : 'Scanned receipt',
        dateSpent: toDateInput(ocr.date),
      }));
      setItems(scanned.length ? scanned : [blankItem()]);
      setStep('review');
      toast.success(scanned.length ? `Read ${scanned.length} item(s) from the receipt` : 'Receipt uploaded — add the items below');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not read that document. Try a clearer photo.');
    } finally {
      setScanning(false);
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    processFile(file);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      setStep('capture');   // leave the camera view; processFile moves us to review
      processFile(file);
    }, 'image/jpeg', 0.92);
  }

  // ---- item helpers ----
  const setItem = (i, key, val) => setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addItem = () => setItems((rows) => [...rows, blankItem()]);
  const removeItem = (i) => setItems((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  // ---- save as expense ----
  async function save() {
    const clean = items
      .map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        amount: Number(it.amount) || 0,
        category: it.category || 'other',
      }))
      .filter((it) => it.description && it.amount > 0);

    if (!form.title.trim()) return toast.error('Give this expense a title.');
    if (clean.length === 0) return toast.error('Add at least one item with a description and amount.');

    setSaving(true);
    try {
      await api.post('/finance/expenses', {
        title: form.title.trim(),
        vendor: form.vendor.trim(),
        category: form.category,
        dateSpent: form.dateSpent,
        notes: form.notes.trim(),
        amount: clean.reduce((s, it) => s + it.amount, 0),
        items: clean,
        source: 'scanned',
        receiptPhoto: preview,
      });
      toast.success('Expense recorded from receipt.');
      qc.invalidateQueries({ queryKey: ['fin-summary'] });
      qc.invalidateQueries({ queryKey: ['fin-expenses'] });
      onDone?.();
      close();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save this expense.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
  const labelCls = 'mb-1 block text-xs font-semibold text-muted';

  const titles = { capture: 'Scan a receipt or document', camera: 'Take a photo', review: 'Review & record expense' };

  return (
    <Modal
      open={open}
      onClose={close}
      title={titles[step]}
      size="lg"
      footer={
        step === 'review' ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep('capture')}><RotateCcw className="h-4 w-4" /> Rescan</Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Record expense'}
              </Button>
            </div>
          </div>
        ) : step === 'camera' ? (
          <Button variant="ghost" onClick={() => { stopCamera(); setStep('capture'); }}>Back</Button>
        ) : (
          <Button variant="ghost" onClick={close}>Cancel</Button>
        )
      }
    >
      {/* hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFileInput} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileInput} />

      {step === 'capture' && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-border bg-surface2/50 px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {scanning ? <Loader2 className="h-7 w-7 animate-spin" /> : <ScanLine className="h-7 w-7" />}
            </div>
            <p className="mt-3 text-sm font-semibold text-fg">
              {scanning ? 'Reading your document…' : 'Snap a photo or upload a file'}
            </p>
            <p className="mt-1 text-xs text-muted">
              The system reads the receipt, pulls out the vendor, date and each line item, then lets you review before saving.
            </p>
            {!scanning && (
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button onClick={() => setStep('camera')}><Camera className="h-4 w-4" /> Take a photo</Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload file</Button>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-subtle">Camera works on laptop, PC and phone · or upload a JPG, PNG or PDF.</p>
        </div>
      )}

      {step === 'camera' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="max-h-[60vh] w-full object-contain" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Button onClick={capturePhoto} disabled={scanning}><Aperture className="h-4 w-4" /> Capture</Button>
          </div>
          <p className="text-center text-xs text-subtle">Line the receipt up in the frame, then Capture.</p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Expense title</label>
                  <input className={inputCls} value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Supplies for Youth Summit" />
                </div>
                <div>
                  <label className={labelCls}>Vendor / store</label>
                  <input className={inputCls} value={form.vendor}
                    onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Store name" />
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={form.dateSpent}
                    onChange={(e) => setForm((f) => ({ ...f, dateSpent: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Overall category</label>
                  <select className={inputCls} value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted">Line items</label>
                  <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_56px_92px_auto] items-center gap-2">
                      <input className={cn(inputCls, 'py-1.5')} value={it.description}
                        onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Item description" />
                      <input type="number" min="1" className={cn(inputCls, 'py-1.5 text-center')} value={it.quantity}
                        onChange={(e) => setItem(i, 'quantity', e.target.value)} title="Quantity" />
                      <input type="number" min="0" step="0.01" className={cn(inputCls, 'py-1.5 text-right')} value={it.amount}
                        onChange={(e) => setItem(i, 'amount', e.target.value)} placeholder="0.00" />
                      <button type="button" onClick={() => removeItem(i)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-surface2 px-3 py-2.5">
                  <span className="text-sm font-semibold text-muted">Total</span>
                  <span className="text-lg font-extrabold tabular-nums text-fg">{peso(itemsTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelCls}>Attached receipt</label>
              {preview ? (
                <a href={preview} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-border">
                  <img src={preview} alt="Receipt" className="max-h-72 w-full object-contain bg-surface2" />
                </a>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-surface2/50 text-subtle">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              {rawText && (
                <details className="rounded-xl border border-border bg-surface2/40 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted">Raw scanned text</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-subtle">{rawText}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}