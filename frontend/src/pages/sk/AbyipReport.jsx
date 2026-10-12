import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { Button, Spinner } from '../../components/ui';
import ReportToolbar from '../../components/reports/ReportToolbar';
import { persistReport, printHtml, downloadExcel, letterhead, abyipSignatoryBlock, abyipSignatories } from '../../lib/reports';

const CUR = new Date().getFullYear();
const YEARS = [CUR + 1, CUR, CUR - 1, CUR - 2];
const n = (v) => Number(v) || 0;
const money = (v) => n(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cellCls = 'w-full resize-none bg-transparent px-1 py-1 text-xs text-fg outline-none focus:bg-primary/5 rounded';
const numCls = cellCls + ' text-right tabular-nums';

function NumField({ label, value, onChange }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <label className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-lg font-extrabold tabular-nums text-fg outline-none" />
    </div>
  );
}

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

export default function AbyipReport() {
  const [params] = useSearchParams();
  const loc = useLocation();
  const base = loc.pathname.startsWith('/admin') ? '/admin' : '/sk';
  const reportId = params.get('id');
  const [year, setYear] = useState(CUR);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(reportId);
  const [status, setStatus] = useState('draft');
  const [dirty, setDirty] = useState(false);
  const edit = (fn) => { setDoc(fn); setDirty(true); };

  const load = useCallback(async (y) => {
    setLoading(true);
    try {
      if (reportId) {
        const r = await api.get(`/finance/reports/${reportId}`);
        const saved = r.data.report?.data;
        setStatus(r.data.report?.status || 'draft');
        setDirty(false);
        if (saved) {
          setDoc({
            fiscalYear: saved.fiscalYear || r.data.report.fiscalYear || y,
            fundingHeader: saved.fundingHeader || { beginningBalance: 0, tenPercentGF: 0, fundRaising: 0 },
            areas: (saved.areas && saved.areas.length) ? saved.areas : [{ area: 'General Administrative Program', rows: [] }],
            signatories: abyipSignatories(saved.signatories),
          });
          return;
        }
      }
      const { data } = await api.get('/finance/reports/abyip/prefill', { params: { year: y } });
      setDirty(false);
      setDoc({
        fiscalYear: data.fiscalYear,
        fundingHeader: data.fundingHeader || { beginningBalance: 0, tenPercentGF: 0, fundRaising: 0 },
        areas: (data.areas && data.areas.length) ? data.areas : [{ area: 'General Administrative Program', rows: [] }],
        signatories: abyipSignatories(data.signatories),
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load ABYIP data.');
    } finally { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(year); }, [year, load]);

  if (loading || !doc) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary" /></div>;

  const blank = () => ({ referenceCode: '', ppa: '', description: '', expectedResults: '', performanceIndicator: '', dateOfImplementation: `January - December ${doc.fiscalYear}`, mooe: 0, ps: 0, co: 0, personResponsible: '' });
  const setHeader = (k, v) => edit((d) => ({ ...d, fundingHeader: { ...d.fundingHeader, [k]: v } }));
  const setSig = (k, v) => edit((d) => ({ ...d, signatories: { ...d.signatories, [k]: v } }));
  const setArea = (ai, k, v) => edit((d) => { const areas = [...d.areas]; areas[ai] = { ...areas[ai], [k]: v }; return { ...d, areas }; });
  const setCell = (ai, ri, k, v) => edit((d) => { const areas = [...d.areas]; const rows = [...areas[ai].rows]; rows[ri] = { ...rows[ri], [k]: v }; areas[ai] = { ...areas[ai], rows }; return { ...d, areas }; });
  const addRow = (ai) => edit((d) => { const areas = [...d.areas]; areas[ai] = { ...areas[ai], rows: [...areas[ai].rows, blank()] }; return { ...d, areas }; });
  const delRow = (ai, ri) => edit((d) => { const areas = [...d.areas]; areas[ai] = { ...areas[ai], rows: areas[ai].rows.filter((_, i) => i !== ri) }; return { ...d, areas }; });
  const addArea = () => edit((d) => ({ ...d, areas: [...d.areas, { area: 'New Program Area', rows: [blank()] }] }));
  const delArea = (ai) => edit((d) => ({ ...d, areas: d.areas.filter((_, i) => i !== ai) }));

  const colTotals = doc.areas.reduce((acc, a) => {
    a.rows.forEach((r) => { acc.mooe += n(r.mooe); acc.ps += n(r.ps); acc.co += n(r.co); });
    return acc;
  }, { mooe: 0, ps: 0, co: 0 });
  const grandTotal = colTotals.mooe + colTotals.ps + colTotals.co;
  const totalAvailable = n(doc.fundingHeader.beginningBalance) + n(doc.fundingHeader.tenPercentGF) + n(doc.fundingHeader.fundRaising);

  const save = async (nextStatus) => {
    setSaving(true);
    try {
      const id = await persistReport(savedId, {
        title: `ABYIP FY ${doc.fiscalYear}`,
        type: 'abyip',
        fiscalYear: doc.fiscalYear,
        periodStart: `${doc.fiscalYear}-01-01`,
        periodEnd: `${doc.fiscalYear}-12-31`,
        data: { ...doc, fundingHeader: { ...doc.fundingHeader, totalAvailable } },
        summary: { grandTotal, totalAvailable, colTotals },
        status: nextStatus,
      });
      setSavedId(id); setStatus(nextStatus); setDirty(false);
      toast.success(nextStatus === 'finalized' && status !== 'finalized' ? 'ABYIP finalized and saved.' : savedId ? 'Changes saved.' : 'Draft saved.');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const buildDocHTML = () => {
    const body = doc.areas.map((a) => {
      const areaRow = `<tr><td colspan="11" style="background:#f2b6b6;font-weight:bold;padding:4px 6px;border:1px solid #333;">${esc(a.area)}</td></tr>`;
      const rows = a.rows.map((r) => {
        const t = n(r.mooe) + n(r.ps) + n(r.co);
        const td = (v, al = 'left') => `<td style="border:1px solid #333;padding:3px 5px;text-align:${al};">${v}</td>`;
        return `<tr>${td(esc(r.referenceCode))}${td(esc(r.ppa))}${td(esc(r.description))}${td(esc(r.expectedResults))}${td(esc(r.performanceIndicator))}${td(esc(r.dateOfImplementation))}${td(r.mooe ? money(r.mooe) : '', 'right')}${td(r.ps ? money(r.ps) : '', 'right')}${td(r.co ? money(r.co) : '', 'right')}<td style="border:1px solid #333;padding:3px 5px;text-align:right;font-weight:bold;">₱ ${money(t)}</td>${td(esc(r.personResponsible))}</tr>`;
      }).join('');
      return areaRow + rows;
    }).join('');

    const totalsRow = `<tr><td colspan="6" style="border:1px solid #333;padding:4px 6px;text-align:right;font-weight:bold;">GRAND TOTAL</td><td style="border:1px solid #333;padding:4px;text-align:right;font-weight:bold;">${money(colTotals.mooe)}</td><td style="border:1px solid #333;padding:4px;text-align:right;font-weight:bold;">${money(colTotals.ps)}</td><td style="border:1px solid #333;padding:4px;text-align:right;font-weight:bold;">${money(colTotals.co)}</td><td style="border:1px solid #333;padding:4px;text-align:right;font-weight:bold;">₱ ${money(grandTotal)}</td><td style="border:1px solid #333;"></td></tr>`;
    const th = (t) => `<th style="border:1px solid #333;padding:4px;background:#c0392b;color:#fff;">${t}</th>`;
    const s = doc.signatories;

    return `<div style="font-family:Arial,sans-serif;font-size:11px;color:#111;">
      ${letterhead(`ANNUAL BARANGAY YOUTH INVESTMENT PROGRAM (ABYIP) F.Y. ${doc.fiscalYear}`)}
      <table style="border-collapse:collapse;margin-bottom:8px;">
        <tr><td style="border:1px solid #333;padding:3px 6px;">Beginning Balance from Year ${doc.fiscalYear - 1}</td><td style="border:1px solid #333;padding:3px 6px;text-align:right;">${money(doc.fundingHeader.beginningBalance)}</td></tr>
        <tr><td style="border:1px solid #333;padding:3px 6px;">10% of the Barangay General Fund of ${doc.fiscalYear}</td><td style="border:1px solid #333;padding:3px 6px;text-align:right;">${money(doc.fundingHeader.tenPercentGF)}</td></tr>
        <tr><td style="border:1px solid #333;padding:3px 6px;">Receipts from fund raising activities</td><td style="border:1px solid #333;padding:3px 6px;text-align:right;">${money(doc.fundingHeader.fundRaising)}</td></tr>
        <tr><td style="border:1px solid #333;padding:3px 6px;font-weight:bold;">Total</td><td style="border:1px solid #333;padding:3px 6px;text-align:right;font-weight:bold;">${money(totalAvailable)}</td></tr>
      </table>
      <table style="border-collapse:collapse;width:100%;">
        <thead><tr>${th('Reference Code')}${th('PPAs')}${th('Description')}${th('Expected Results')}${th('Performance Indicator')}${th('Date of Implementation')}${th('MOOE')}${th('Personnel Services')}${th('Capital Outlay')}${th('Total')}${th('Person Responsible')}</tr></thead>
        <tbody>${body}${totalsRow}</tbody>
      </table>
      ${abyipSignatoryBlock(s)}
    </div>`;
  };

  const printDoc = () => { if (!printHtml(`ABYIP FY ${doc.fiscalYear}`, buildDocHTML())) toast.error('Allow pop-ups to print.'); };
  const exportExcel = () => downloadExcel(`ABYIP_FY_${doc.fiscalYear}.xls`, buildDocHTML());

  return (
    <div className="space-y-6">
      <ReportToolbar
        title={`ABYIP · FY ${doc.fiscalYear}`}
        description="Annual Barangay Youth Investment Program — pre-filled from your programs and funds, fully editable."
        backTo={`${base}/reports`} saved={!!savedId} status={status} dirty={dirty} saving={saving}
        periodLabel="Fiscal year" periodValue={savedId ? doc.fiscalYear : year}
        periodOptions={[...new Set([...YEARS, doc.fiscalYear])].map((y) => ({ value: y, label: `FY ${y}` }))}
        onPeriodChange={setYear} onRefresh={() => load(year)}
        onExcel={exportExcel} onPrint={printDoc} onSave={save}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NumField label={`Beginning Balance (${doc.fiscalYear - 1})`} value={doc.fundingHeader.beginningBalance} onChange={(v) => setHeader('beginningBalance', v)} />
        <NumField label="10% of Barangay General Fund" value={doc.fundingHeader.tenPercentGF} onChange={(v) => setHeader('tenPercentGF', v)} />
        <NumField label="Fund-raising Receipts" value={doc.fundingHeader.fundRaising} onChange={(v) => setHeader('fundRaising', v)} />
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Total Available</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-fg">₱ {money(totalAvailable)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[1150px] text-xs">
          <thead>
            <tr className="bg-primary text-primary-fg">
              {['Ref. Code', 'PPAs', 'Description', 'Expected Results', 'Perf. Indicator', 'Date of Impl.', 'MOOE', 'Personnel', 'Capital Outlay', 'Total', 'Person Resp.', ''].map((h, i) => (
                <th key={i} className="border border-primary-fg/20 px-2 py-2 text-left font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.areas.map((a, ai) => (
              <Fragment key={ai}>
                <tr className="bg-rose-100/70 dark:bg-rose-500/15">
                  <td colSpan={11} className="px-2 py-1.5">
                    <input value={a.area} onChange={(e) => setArea(ai, 'area', e.target.value)} className="w-full bg-transparent font-bold text-fg outline-none" />
                  </td>
                  <td className="px-1 text-center">
                    <button type="button" onClick={() => delArea(ai)} className="text-danger hover:opacity-70" title="Remove area" aria-label={`Remove area ${a.area}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
                {a.rows.map((r, ri) => (
                  <tr key={ri} className="align-top">
                    <td className="border border-border px-1"><input value={r.referenceCode} onChange={(e) => setCell(ai, ri, 'referenceCode', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.ppa} onChange={(e) => setCell(ai, ri, 'ppa', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.description} onChange={(e) => setCell(ai, ri, 'description', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.expectedResults} onChange={(e) => setCell(ai, ri, 'expectedResults', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.performanceIndicator} onChange={(e) => setCell(ai, ri, 'performanceIndicator', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><input value={r.dateOfImplementation} onChange={(e) => setCell(ai, ri, 'dateOfImplementation', e.target.value)} className={cellCls} /></td>
                    <td className="border border-border px-1"><input type="number" value={r.mooe} onChange={(e) => setCell(ai, ri, 'mooe', e.target.value)} className={numCls} /></td>
                    <td className="border border-border px-1"><input type="number" value={r.ps} onChange={(e) => setCell(ai, ri, 'ps', e.target.value)} className={numCls} /></td>
                    <td className="border border-border px-1"><input type="number" value={r.co} onChange={(e) => setCell(ai, ri, 'co', e.target.value)} className={numCls} /></td>
                    <td className="border border-border px-2 text-right font-bold tabular-nums text-fg">₱ {money(n(r.mooe) + n(r.ps) + n(r.co))}</td>
                    <td className="border border-border px-1"><textarea rows={2} value={r.personResponsible} onChange={(e) => setCell(ai, ri, 'personResponsible', e.target.value)} className={cellCls} /></td>
                    <td className="px-1 text-center"><button type="button" onClick={() => delRow(ai, ri)} className="text-danger hover:opacity-70" title="Remove row" aria-label={`Remove row ${ri + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={12} className="px-2 py-1">
                    <button onClick={() => addRow(ai)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="h-3.5 w-3.5" /> Add PPA row</button>
                  </td>
                </tr>
              </Fragment>
            ))}
            <tr className="bg-surface2 font-bold text-fg">
              <td colSpan={6} className="border border-border px-2 py-2 text-right">GRAND TOTAL</td>
              <td className="border border-border px-2 text-right tabular-nums">{money(colTotals.mooe)}</td>
              <td className="border border-border px-2 text-right tabular-nums">{money(colTotals.ps)}</td>
              <td className="border border-border px-2 text-right tabular-nums">{money(colTotals.co)}</td>
              <td className="border border-border px-2 text-right tabular-nums">₱ {money(grandTotal)}</td>
              <td colSpan={2} className="border border-border" />
            </tr>
          </tbody>
        </table>
      </div>

      <Button variant="outline" onClick={addArea}><Plus className="h-4 w-4" /> Add program area</Button>

      <div className="grid gap-4 sm:grid-cols-3">
        <SigField heading="Prepared by" name={doc.signatories.preparedBy || ''} title={doc.signatories.preparedByTitle || 'SK Secretary'} onName={(v) => setSig('preparedBy', v)} onTitle={(v) => setSig('preparedByTitle', v)} />
        <SigField heading="Certified by" name={doc.signatories.certifiedBy || ''} title={doc.signatories.certifiedByTitle || 'SK Treasurer'} onName={(v) => setSig('certifiedBy', v)} onTitle={(v) => setSig('certifiedByTitle', v)} />
        <SigField heading="Approved by" name={doc.signatories.approvedBy || ''} title={doc.signatories.approvedByTitle || 'SK Chairperson'} onName={(v) => setSig('approvedBy', v)} onTitle={(v) => setSig('approvedByTitle', v)} />
      </div>
    </div>
  );
}