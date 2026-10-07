// src/pages/admin/CreateSK.jsx — Head creates SK official accounts (single or bulk upload)
// cspell:words kagawad Tawiran councilor councillor pdfjs
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  UserPlus, Eye, EyeOff, ShieldCheck, Info, Loader2, Upload, Download,
  Trash2, FileSpreadsheet, Users, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Button } from '../../components/ui';
import { cn } from '../../lib/utils';

const ROLES = [
  { value: 'sk_chairperson', label: 'SK Chairperson', note: 'Head of the council', single: true },
  { value: 'sk_secretary', label: 'SK Secretary', note: 'Records & minutes', single: true },
  { value: 'sk_treasurer', label: 'SK Treasurer', note: 'Handles finances', single: true },
  { value: 'sk_kagawad', label: 'SK Kagawad', note: 'Council member', single: false },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));
const DEFAULT_PW = 'SKManage2026';

const inputCls =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20';
const cellCls =
  'w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-primary';
const labelCls = 'mb-1.5 block text-xs font-semibold text-muted';

/* ---------------- parsing helpers (module scope) ---------------- */
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
let _uid = 0;
const uid = () => `r${Date.now()}${_uid++}`;

function pick(obj, keys) {
  for (const k of Object.keys(obj)) if (keys.includes(norm(k))) return obj[k];
  return '';
}
function splitName(full) {
  const s = String(full || '').trim();
  if (s.includes(',')) { const [l, f] = s.split(',').map((x) => x.trim()); return { first: f || '', last: l || '' }; }
  const t = s.split(/\s+/); return { first: t[0] || '', last: t.slice(1).join(' ') || '' };
}
function roleFromText(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('chair')) return 'sk_chairperson';
  if (s.includes('secretar')) return 'sk_secretary';
  if (s.includes('treasur')) return 'sk_treasurer';
  return 'sk_kagawad';
}
function makeRow(first, last, email, role, contact = '', address = '') {
  return { id: uid(), firstName: first || '', lastName: last || '', email: String(email || '').trim(), role: role || 'sk_kagawad', contactNumber: contact || '', address: address || '', position: '', password: DEFAULT_PW };
}
function mapObjRow(obj) {
  let first = pick(obj, ['firstname', 'first', 'givenname', 'fname']);
  let last = pick(obj, ['lastname', 'last', 'surname', 'lname', 'familyname']);
  if (!first && !last) { const full = pick(obj, ['name', 'fullname', 'completename']); if (full) ({ first, last } = splitName(full)); }
  const email = pick(obj, ['email', 'emailaddress', 'mail']);
  const roleText = pick(obj, ['role', 'position', 'designation', 'title', 'post']);
  const contact = pick(obj, ['contact', 'contactnumber', 'phone', 'mobile', 'cellphone', 'cellnumber']);
  const address = pick(obj, ['address']);
  return makeRow(first, last, email, roleFromText(roleText), contact, address);
}
async function parseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return json.map(mapObjRow).filter((r) => r.firstName || r.lastName || r.email);
}
async function parsePdf(file) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const byY = {};
    for (const it of tc.items) {
      const y = Math.round(it.transform[5]);
      (byY[y] = byY[y] || []).push({ x: it.transform[4], s: it.str });
    }
    Object.keys(byY).map(Number).sort((a, b) => b - a).forEach((y) => {
      const line = byY[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    });
  }
  const rows = [];
  for (const line of lines) {
    const emailMatch = line.match(/\S+@\S+\.\S+/);
    const email = emailMatch ? emailMatch[0] : '';
    const rest = email ? line.replace(email, '').trim() : line;
    const hasRoleKw = /(chair|secretar|treasur|kagawad|councilor|councillor|member)/i.test(rest);
    const nameText = rest
      .replace(/\b(sk\s*)?(chair(person|man)?|secretary|treasurer|kagawad|councillor|councilor|member)\b/ig, '')
      .replace(/[-–•|,]/g, ' ').replace(/\s+/g, ' ').trim();
    const { first, last } = splitName(nameText);
    const looksLikePerson = email || hasRoleKw || (first && last);
    if (!looksLikePerson) continue;
    rows.push(makeRow(first, last, email, roleFromText(rest)));
  }
  return rows;
}
function downloadTemplate() {
  const headers = ['First Name', 'Last Name', 'Email', 'Position', 'Contact Number', 'Address'];
  const example = ['Juan', 'Dela Cruz', 'juan@email.com', 'SK Kagawad', '09171234567', 'Purok 1, Tawiran'];
  const csv = [headers.join(','), example.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sk-officers-template.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function rowError(r, emails) {
  if (!r.firstName.trim() || !r.lastName.trim()) return 'Name required';
  if (!/^\S+@\S+\.\S+$/.test(r.email)) return 'Invalid email';
  if (emails.filter((e) => e === r.email.trim().toLowerCase()).length > 1) return 'Duplicate email';
  return '';
}

/* ---------------- Bulk upload ---------------- */
function BulkUpload() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file) => {
    setParsing(true); setResult(null);
    try {
      const name = file.name.toLowerCase();
      let parsed = [];
      if (name.endsWith('.pdf')) {
        try { parsed = await parsePdf(file); }
        catch { toast.error('Could not read that PDF. Please use the Excel/CSV template instead.'); setParsing(false); return; }
        if (parsed.length) toast('PDF read is approximate — please review every row.', { icon: '⚠️' });
      } else if (/\.(xlsx|xls|csv)$/.test(name)) {
        parsed = await parseWorkbook(file);
      } else {
        toast.error('Unsupported file. Use .xlsx, .csv, or .pdf.'); setParsing(false); return;
      }
      if (!parsed.length) { toast.error('No rows found in the file.'); setParsing(false); return; }
      setRows((prev) => [...prev, ...parsed]);
      toast.success(`${parsed.length} row(s) loaded.`);
    } catch {
      toast.error('Could not read the file.');
    } finally {
      setParsing(false);
    }
  };

  const setCell = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => setRows((rs) => [...rs, makeRow('', '', '', 'sk_kagawad')]);

  const emails = rows.map((r) => r.email.trim().toLowerCase());
  const anyError = rows.some((r) => rowError(r, emails));

  const createM = useMutation({
    mutationFn: (officers) => api.post('/admin/bulk-create-sk', { officers }),
    onSuccess: (r) => {
      const data = r.data || {};
      setResult(data);
      const createdEmails = new Set((data.created || []).map((c) => c.email));
      setRows((rs) => rs.filter((row) => !createdEmails.has(row.email.trim().toLowerCase())));
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`${data.summary?.created || 0} account(s) created.`);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Bulk create failed.'),
  });

  const create = () => {
    const payload = rows.map((r) => ({
      firstName: r.firstName.trim(), lastName: r.lastName.trim(),
      email: r.email.trim().toLowerCase(), role: r.role,
      password: r.password || DEFAULT_PW, position: r.position, contactNumber: r.contactNumber, address: r.address,
    }));
    createM.mutate(payload);
  };

  return (
    <Card>
      <CardContent className="space-y-5">
        {/* upload zone */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-fg">Upload a roster file</p>
            <p className="text-sm text-muted">Excel/CSV is most accurate. PDF is best-effort — review each row.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4" /> Template</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={pickFile} />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload file
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <button onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface2/40 p-10 text-center text-muted transition hover:border-primary/40 hover:text-fg">
            <FileSpreadsheet className="h-8 w-8" />
            <p className="text-sm font-semibold">Drop in your officers list (.xlsx, .csv, or .pdf)</p>
            <p className="text-xs">Columns: First Name · Last Name · Email · Position · Contact · Address</p>
          </button>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface2/60 text-left text-xs font-semibold text-muted">
                    <th className="px-3 py-2">First name</th>
                    <th className="px-3 py-2">Last name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Temp password</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const err = rowError(r, emails);
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-1.5"><input className={cellCls} value={r.firstName} onChange={(e) => setCell(r.id, 'firstName', e.target.value)} /></td>
                        <td className="px-2 py-1.5"><input className={cellCls} value={r.lastName} onChange={(e) => setCell(r.id, 'lastName', e.target.value)} /></td>
                        <td className="px-2 py-1.5">
                          <input className={cn(cellCls, err === 'Invalid email' || err === 'Duplicate email' ? 'border-danger' : '')} value={r.email} onChange={(e) => setCell(r.id, 'email', e.target.value)} placeholder="name@email.com" />
                          {err && <span className="mt-0.5 block text-[11px] font-semibold text-danger">{err}</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          <select className={cellCls} value={r.role} onChange={(e) => setCell(r.id, 'role', e.target.value)}>
                            {ROLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input className={cellCls} value={r.password} onChange={(e) => setCell(r.id, 'password', e.target.value)} /></td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => removeRow(r.id)} className="rounded-lg p-1.5 text-subtle hover:bg-danger/10 hover:text-danger" title="Remove"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> Add row</Button>
                <Button variant="ghost" size="sm" onClick={() => { setRows([]); setResult(null); }} className="text-danger hover:bg-danger/10">Clear all</Button>
              </div>
              <Button onClick={create} loading={createM.isPending} disabled={anyError || rows.length === 0}>
                <Users className="h-4 w-4" /> Create {rows.length} account{rows.length === 1 ? '' : 's'}
              </Button>
            </div>
            {anyError && <p className="text-xs font-semibold text-danger">Fix the highlighted rows before creating.</p>}
          </>
        )}

        {/* results */}
        {result && (
          <div className="space-y-3 rounded-xl border border-border bg-surface2/40 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-fg">
              <CheckCircle2 className="h-4 w-4 text-success" /> {result.summary?.created || 0} created · {result.summary?.skipped || 0} skipped
            </p>
            {(result.created || []).length > 0 && (
              <p className="text-xs text-muted">
                Created with temp password <span className="font-bold text-fg">{DEFAULT_PW}</span> — officers should change it in Settings.
              </p>
            )}
            {(result.skipped || []).length > 0 && (
              <ul className="space-y-1">
                {result.skipped.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span><b className="text-fg">{s.label}</b> — {s.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Single create (original) ---------------- */
const emptySingle = {
  firstName: '', lastName: '', email: '', password: '',
  role: 'sk_kagawad', position: '', contactNumber: '', address: '',
};

function SingleCreate() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptySingle);
  const [showPw, setShowPw] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const createM = useMutation({
    mutationFn: (payload) => api.post('/admin/create-sk', payload),
    onSuccess: (r) => {
      toast.success(r?.data?.message || 'SK account created.');
      setForm(emptySingle);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not create the account.'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('Enter the first and last name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Enter a valid email address.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    createM.mutate({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase() });
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="space-y-6">
          <div>
            <p className={labelCls}>Role</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => {
                const active = form.role === r.value;
                return (
                  <button type="button" key={r.value} onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                    className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition',
                      active ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:bg-surface2')}>
                    <span className={cn('mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border', active ? 'border-primary bg-primary text-primary-fg' : 'border-border')}>
                      {active && <ShieldCheck className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-fg">{r.label}</span>
                      <span className="block text-xs text-muted">{r.note}{r.single ? ' · only one allowed' : ''}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>First name</label><input className={inputCls} value={form.firstName} onChange={set('firstName')} placeholder="Juan" /></div>
            <div><label className={labelCls}>Last name</label><input className={inputCls} value={form.lastName} onChange={set('lastName')} placeholder="Dela Cruz" /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="name@example.com" /></div>
            <div><label className={labelCls}>Contact number</label><input className={inputCls} value={form.contactNumber} onChange={set('contactNumber')} placeholder="09XX XXX XXXX" /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Position title <span className="font-normal text-subtle">(optional)</span></label><input className={inputCls} value={form.position} onChange={set('position')} placeholder="e.g. Committee on Finance" /></div>
            <div>
              <label className={labelCls}>Temporary password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={cn(inputCls, 'pr-10')} value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:bg-surface2">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div><label className={labelCls}>Address <span className="font-normal text-subtle">(optional)</span></label><input className={inputCls} value={form.address} onChange={set('address')} placeholder="Purok / Sitio, Barangay Tawiran" /></div>

          <div className="flex items-start gap-2 rounded-xl bg-info/8 p-3 text-xs text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            The official signs in with this email and temporary password, then changes it from their own settings.
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(emptySingle)}>Clear</Button>
            <Button type="submit" loading={createM.isPending}><UserPlus className="h-4 w-4" /> Create account</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

/* ---------------- page ---------------- */
export default function CreateSKAccount() {
  const [mode, setMode] = useState('single');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary"><UserPlus className="h-5 w-5" /></span>
        <div>
          <h2 className="text-xl font-extrabold text-fg">Create SK official account</h2>
          <p className="text-sm text-muted">SK officials can't self-register — you create their logins here.</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl bg-surface2 p-1">
        {[{ k: 'single', label: 'One at a time' }, { k: 'bulk', label: 'Bulk upload' }].map((t) => (
          <button key={t.k} onClick={() => setMode(t.k)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition', mode === t.k ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'single' ? <SingleCreate /> : <BulkUpload />}
    </div>
  );
}