import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Printer, Save, RefreshCw, Plus, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import { Button, Spinner } from '../../components/ui';

const CUR = new Date().getFullYear();
const CYCLES = [CUR + 1, CUR, CUR - 1, CUR - 2];
const n = (v) => Number(v) || 0;
const money = (v) => n(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cellCls = 'w-full resize-none bg-transparent px-1 py-1 text-xs text-fg outline-none focus:bg-primary/5 rounded';
const numCls = cellCls + ' text-right tabular-nums';

function SigField({ heading, name, title, onName, onTitle }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{heading}</p>
      <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Full name"
        className="mt-2 w-full border-b border-border bg-transparent pb-1 text-center text-sm font-bold text-fg outline-none focus:border-primary" />
      <input value={title} onChange={(e) => onTitle(e.target.value)}
        className="mt-1 w-full bg-transparent text-center text-xs text-muted outline-none" />
    </div>
  );
}

export default function CbydpReport() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const loc = useLocation();
  const base = loc.pathname.startsWith('/admin') ? '/admin' : '/sk';
  const reportId = params.get('id');
  const [from, setFrom] = useState(CUR);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      if (reportId) {
        const r = await api.get(`/finance/reports/${reportId}`);
        const saved = r.data.report?.data;
        if (saved) {
          setDoc({
            cycleFrom: saved.cycleFrom || f,
            cycleTo: saved.cycleTo || (f + 2),
            years: saved.years || [f, f + 1, f + 2],
            centers: (saved.centers && saved.centers.length) ? saved.centers : [{ center: 'Education', rows: [] }],
            signatories: saved.signatories || {},
          });
          return;
        }
      }
      const { data } = await api.get('/finance/reports/cbydp/prefill', { params: { from: f, to: f + 2 } });
      setDoc({
        cycleFrom: data.cycleFrom,
        cycleTo: data.cycleTo,
        years: data.years || [f, f + 1, f + 2],
        centers: (data.centers && data.centers.length) ? data.centers : [{ center: 'Education', rows: [] }],
        signatories: data.signatories || {},
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load CBYDP data.');
    } finally { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(from); }, [from, load]);

  if (loading || !doc) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary" /></div>;

  const blank = () => ({ concern: '', objective: '', performanceIndicator: '', fy1: '', fy2: '', fy3: '', ppa: '', budget: 0, personResponsible: '' });
  const setSig = (k, v) => setDoc((d) => ({ ...d, signatories: { ...d.signatories, [k]: v } }));
  const setCenter = (ci, k, v) => setDoc((d) => { const centers = [...d.centers]; centers[ci] = { ...centers[ci], [k]: v }; return { ...d, centers }; });
  const setCell = (ci, ri, k, v) => setDoc((d) => { const centers = [...d.centers]; const rows = [...centers[ci].rows]; rows[ri] = { ...rows[ri], [k]: v }; centers[ci] = { ...centers[ci], rows }; return { ...d, centers }; });
  const addRow = (ci) => setDoc((d) => { const centers = [...d.centers]; centers[ci] = { ...centers[ci], rows: [...centers[ci].rows, blank()] }; return { ...d, centers }; });
  const delRow = (ci, ri) => setDoc((d) => { const centers = [...d.centers]; centers[ci] = { ...centers[ci], rows: centers[ci].rows.filter((_, i) => i !== ri) }; return { ...d, centers }; });
  const addCenter = () => setDoc((d) => ({ ...d, centers: [...d.centers, { center: 'New Center of Participation', rows: [blank()] }] }));
  const delCenter = (ci) => setDoc((d) => ({ ...d, centers: d.centers.filter((_, i) => i !== ci) }));

  const grandTotal = doc.centers.reduce((s, c) => s + c.rows.reduce((t, r) => t + n(r.budget), 0), 0);
  const [y1, y2, y3] = doc.years;

  const save = async (status) => {
    setSaving(true);
    try {
      await api.post('/finance/reports', {
        title: `CBYDP ${doc.cycleFrom}-${doc.cycleTo}`,
        type: 'cbydp',
        periodStart: `${doc.cycleFrom}-01-01`,
        periodEnd: `${doc.cycleTo}-12-31`,
        data: doc,
        summary: { grandTotal },
        status,
      });
      toast.success(status === 'finalized' ? 'CBYDP finalized and saved.' : 'Draft saved.');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const buildDocHTML = () => {
    const body = doc.centers.map((c) => {
      const band = `<tr><td colspan="9" style="background:#f2b6b6;font-weight:bold;padding:4px 6px;border:1px solid #333;">${esc(c.center)}</td></tr>`;
      const rows = c.rows.map((r) => {
        const td = (v, al = 'left') => `<td style="border:1px solid #333;padding:3px 5px;text-align:${al};">${v}</td>`;
        return `<tr>${td(esc(r.concern))}${td(esc(r.objective))}${td(esc(r.performanceIndicator))}${td(esc(r.fy1), 'center')}${td(esc(r.fy2), 'center')}${td(esc(r.fy3), 'center')}${td(esc(r.ppa))}${td(r.budget ? money(r.budget) : '', 'right')}${td(esc(r.personResponsible))}</tr>`;
      }).join('');
      return band + rows;
    }).join('');

    const totalsRow = `<tr><td colspan="7" style="border:1px solid #333;padding:4px 6px;text-align:right;font-weight:bold;">GRAND TOTAL</td><td style="border:1px solid #333;padding:4px;text-align:right;font-weight:bold;">₱ ${money(grandTotal)}</td><td style="border:1px solid #333;"></td></tr>`;
    const th = (t, span = 1) => `<th colspan="${span}" style="border:1px solid #333;padding:4px;background:#c0392b;color:#fff;">${t}</th>`;
    const s = doc.signatories;

    return `<div style="font-family:Arial,sans-serif;font-size:11px;color:#111;">
      <div style="text-align:center;line-height:1.35;">
        <div>Republic of the Philippines</div><div>Province of Marinduque</div>
        <div>Municipality of Santa Cruz</div><div><b>BARANGAY TAWIRAN</b></div>
        <div>Office of the Sangguniang Kabataan</div>
      </div>
      <h2 style="text-align:center;margin:10px 0;font-size:14px;">COMPREHENSIVE BARANGAY YOUTH DEVELOPMENT PROGRAM (CBYDP) FOR ${doc.cycleFrom}-${doc.cycleTo}</h2>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>${th('Youth Development Concern')}${th('Objective')}${th('Performance Indicator')}${th('Target', 3)}${th('PPAs')}${th('Budget')}${th('Person Responsible')}</tr>
          <tr>${th('')}${th('')}${th('')}${th('FY ' + y1)}${th('FY ' + y2)}${th('FY ' + y3)}${th('')}${th('')}${th('')}</tr>
        </thead>
        <tbody>${body}${totalsRow}</tbody>
      </table>
      <table style="width:100%;margin-top:34px;border-collapse:collapse;">
        <tr>
          <td style="width:33%;vertical-align:top;">Prepared by:<br><br><br><b>${esc(s.preparedBy)}</b><br>${esc(s.preparedByTitle || 'SK Secretary')}</td>
          <td style="width:33%;vertical-align:top;">Recommending Approval:<br><br><br><b>${esc(s.recommendingApproval)}</b><br>${esc(s.recommendingApprovalTitle || 'SK Chairperson')}</td>
          <td style="width:33%;vertical-align:top;">Noted and Approved:<br><br><br><b>${esc(s.notedApproved)}</b><br>${esc(s.notedApprovedTitle || 'Punong Barangay')}</td>
        </tr>
      </table>
    </div>`;
  };

  const printDoc = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow pop-ups to print.'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>CBYDP ${doc.cycleFrom}-${doc.cycleTo}</title><style>@page{size:landscape;margin:12mm;}body{margin:0;}</style></head><body>${buildDocHTML()}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  const exportExcel = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${buildDocHTML()}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `CBYDP_${doc.cycleFrom}-${doc.cycleTo}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <button onClick={() => nav(`${base}/reports`)} className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Reports
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-fg">CBYDP</h2>
          <p className="text-sm text-muted">Comprehensive Barangay Youth Development Program — 3-year plan, pre-filled from your Programs, fully editable.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg outline-none focus:border-primary">
            {CYCLES.map((y) => <option key={y} value={y}>{y}–{y + 2}</option>)}
          </select>
          <Button variant="outline" onClick={() => load(from)}><RefreshCw className="h-4 w-4" /> Reload</Button>
          <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={printDoc}><Printer className="h-4 w-4" /> Print / PDF</Button>
          <Button variant="outline" loading={saving} onClick={() => save('draft')}><Save className="h-4 w-4" /> Save draft</Button>
          <Button loading={saving} onClick={() => save('finalized')}><CheckCircle2 className="h-4 w-4" /> Finalize</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[1150px] text-xs">
          <thead>
            <tr className="bg-primary text-primary-fg">
              {['Youth Dev. Concern', 'Objective', 'Perf. Indicator', `FY ${y1}`, `FY ${y2}`, `FY ${y3}`, 'PPAs', 'Budget', 'Person Resp.', ''].map((h, i) => (
                <th key={i} className="border border-primary-fg/20 px-2 py-2 text-left font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.centers.map((c, ci) => (
              <Fragment key={ci}>
                <tr className="bg-rose-100/70 dark:bg-rose-500/15">
                  <td colSpan={9} className="px-2 py-1.5">
                    <input value={c.center} onChange={(e) => setCenter(ci, 'center', e.target.value)} className="w-full bg-transparent font-bold text-fg outline-none" />
                  </td>
                  <td className="px-1 text-center">
                    <button onClick={() => delCenter(ci)} className="text-danger hover:opacity-70" title="Remove center"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
                {c.rows.map((r, ri) => (
                  <tr key={ri} className="align-top">
                    <td className="border border-border px-1"><textarea rows={2} value={r.concern} onChange={(e) => setCell(ci, ri, 'concern', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.objective} onChange={(e) => setCell(ci, ri, 'objective', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.performanceIndicator} onChange={(e) => setCell(ci, ri, 'performanceIndicator', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><input value={r.fy1} onChange={(e) => setCell(ci, ri, 'fy1', e.target.value)} className={cellCls + ' text-center'} /></td>
                    <td className="border border-border px-1"><input value={r.fy2} onChange={(e) => setCell(ci, ri, 'fy2', e.target.value)} className={cellCls + ' text-center'} /></td>
                    <td className="border border-border px-1"><input value={r.fy3} onChange={(e) => setCell(ci, ri, 'fy3', e.target.value)} className={cellCls + ' text-center'} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.ppa} onChange={(e) => setCell(ci, ri, 'ppa', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><input type="number" value={r.budget} onChange={(e) => setCell(ci, ri, 'budget', e.target.value)} className={numCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.personResponsible} onChange={(e) => setCell(ci, ri, 'personResponsible', e.target.value)} className={cellCls} /></td>
                    <td className="px-1 text-center"><button onClick={() => delRow(ci, ri)} className="text-danger hover:opacity-70" title="Remove row"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={10} className="px-2 py-1">
                    <button onClick={() => addRow(ci)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="h-3.5 w-3.5" /> Add row</button>
                  </td>
                </tr>
              </Fragment>
            ))}
            <tr className="bg-surface2 font-bold text-fg">
              <td colSpan={7} className="border border-border px-2 py-2 text-right">GRAND TOTAL</td>
              <td className="border border-border px-2 text-right tabular-nums">₱ {money(grandTotal)}</td>
              <td colSpan={2} className="border border-border" />
            </tr>
          </tbody>
        </table>
      </div>

      <Button variant="outline" onClick={addCenter}><Plus className="h-4 w-4" /> Add Center of Participation</Button>

      <div className="grid gap-4 sm:grid-cols-3">
        <SigField heading="Prepared by" name={doc.signatories.preparedBy || ''} title={doc.signatories.preparedByTitle || 'SK Secretary'} onName={(v) => setSig('preparedBy', v)} onTitle={(v) => setSig('preparedByTitle', v)} />
        <SigField heading="Recommending Approval" name={doc.signatories.recommendingApproval || ''} title={doc.signatories.recommendingApprovalTitle || 'SK Chairperson'} onName={(v) => setSig('recommendingApproval', v)} onTitle={(v) => setSig('recommendingApprovalTitle', v)} />
        <SigField heading="Noted and Approved" name={doc.signatories.notedApproved || ''} title={doc.signatories.notedApprovedTitle || 'Punong Barangay'} onName={(v) => setSig('notedApproved', v)} onTitle={(v) => setSig('notedApprovedTitle', v)} />
      </div>
    </div>
  );
}