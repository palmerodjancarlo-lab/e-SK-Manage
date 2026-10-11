// src/pages/sk/AccomplishmentReport.jsx — planned vs actual spending per PPA for a fiscal year.
// Pre-filled from programs (planned budget) and approved expenses (actual); every cell is editable.
// cspell:words PPAs
import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wallet, TrendingDown, PiggyBank, Percent } from 'lucide-react';
import api from '../../lib/api';
import { Button, Spinner, EmptyState } from '../../components/ui';
import ReportToolbar from '../../components/reports/ReportToolbar';
import {
  persistReport, printHtml, downloadExcel, letterhead, signatoryBlock,
  reportNumber as n, reportMoney as money, escHtml as esc,
} from '../../lib/reports';

const CUR = new Date().getFullYear();
const YEARS = [CUR, CUR - 1, CUR - 2, CUR + 1];
const STATUSES = ['planned', 'ongoing', 'completed', 'cancelled'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const cellCls = 'w-full resize-none rounded bg-transparent px-1 py-1 text-xs text-fg outline-none focus:bg-primary/5';
const numCls = `${cellCls} text-right tabular-nums`;

function SigField({ heading, name, title, onName, onTitle }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{heading}</p>
      <input aria-label={`${heading} — name`} value={name} onChange={(e) => onName(e.target.value)} placeholder="Full name"
        className="mt-2 w-full border-b border-border bg-transparent pb-1 text-center text-sm font-bold text-fg outline-none focus:border-primary" />
      <input aria-label={`${heading} — position`} value={title} onChange={(e) => onTitle(e.target.value)}
        className="mt-1 w-full bg-transparent text-center text-xs text-muted outline-none" />
    </div>
  );
}

function Total({ icon, label, value, tone = 'text-fg' }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />{label}</p>
      <p className={`mt-1 text-lg font-extrabold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

const blank = () => ({ referenceCode: '', ppa: '', planned: 0, actual: 0, status: 'planned', remarks: '', personResponsible: '' });

export default function AccomplishmentReport() {
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
            areas: saved.areas?.length ? saved.areas : [{ area: 'General Program', rows: [blank()] }],
            signatories: saved.signatories || {},
          });
          return;
        }
      }
      const { data } = await api.get('/finance/reports/accomplishment/prefill', { params: { year: y } });
      setDirty(false);
      setDoc({
        fiscalYear: data.fiscalYear,
        areas: data.areas?.length ? data.areas.map((a) => ({ ...a, rows: a.rows.map((r) => ({ ...blank(), ...r })) })) : [],
        signatories: data.signatories || {},
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load the accomplishment data.');
    } finally { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(year); }, [year, load]);

  if (loading || !doc) return <div className="flex justify-center py-20" role="status"><Spinner className="h-8 w-8 text-primary" /><span className="sr-only">Loading…</span></div>;

  const setSig = (k, v) => edit((d) => ({ ...d, signatories: { ...d.signatories, [k]: v } }));
  const setArea = (ai, v) => edit((d) => { const areas = [...d.areas]; areas[ai] = { ...areas[ai], area: v }; return { ...d, areas }; });
  const setCell = (ai, ri, k, v) => edit((d) => { const areas = [...d.areas]; const rows = [...areas[ai].rows]; rows[ri] = { ...rows[ri], [k]: v }; areas[ai] = { ...areas[ai], rows }; return { ...d, areas }; });
  const addRow = (ai) => edit((d) => { const areas = [...d.areas]; areas[ai] = { ...areas[ai], rows: [...areas[ai].rows, blank()] }; return { ...d, areas }; });
  const delRow = (ai, ri) => edit((d) => { const areas = [...d.areas]; areas[ai] = { ...areas[ai], rows: areas[ai].rows.filter((_, i) => i !== ri) }; return { ...d, areas }; });
  const addArea = () => edit((d) => ({ ...d, areas: [...d.areas, { area: 'New Program Area', rows: [blank()] }] }));
  const delArea = (ai) => edit((d) => ({ ...d, areas: d.areas.filter((_, i) => i !== ai) }));

  const totals = doc.areas.reduce((acc, a) => {
    a.rows.forEach((r) => { acc.planned += n(r.planned); acc.actual += n(r.actual); });
    return acc;
  }, { planned: 0, actual: 0 });
  const balance = totals.planned - totals.actual;
  const pct = totals.planned > 0 ? Math.round((totals.actual / totals.planned) * 100) : 0;
  const rowPct = (r) => (n(r.planned) > 0 ? `${Math.round((n(r.actual) / n(r.planned)) * 100)}%` : '—');

  const save = async (nextStatus) => {
    setSaving(true);
    try {
      const id = await persistReport(savedId, {
        title: `Accomplishment Report FY ${doc.fiscalYear}`,
        type: 'accomplishment',
        fiscalYear: doc.fiscalYear,
        periodStart: `${doc.fiscalYear}-01-01`,
        periodEnd: `${doc.fiscalYear}-12-31`,
        data: doc,
        summary: { ...totals, balance, pct },
        status: nextStatus,
      });
      setSavedId(id); setStatus(nextStatus); setDirty(false);
      toast.success(nextStatus === 'finalized' && status !== 'finalized' ? 'Accomplishment report finalized and saved.' : savedId ? 'Changes saved.' : 'Draft saved.');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const buildDocHTML = () => {
    const td = (v, al = 'left', bold = false) => `<td style="border:1px solid #333;padding:3px 5px;text-align:${al};${bold ? 'font-weight:bold;' : ''}">${v}</td>`;
    const th = (t) => `<th style="border:1px solid #333;padding:4px;background:#c0392b;color:#fff;">${t}</th>`;
    const body = doc.areas.map((a) => {
      const band = `<tr><td colspan="9" style="background:#f2b6b6;font-weight:bold;padding:4px 6px;border:1px solid #333;">${esc(a.area)}</td></tr>`;
      const rows = a.rows.map((r) => `<tr>${td(esc(r.referenceCode))}${td(esc(r.ppa))}${td(money(r.planned), 'right')}${td(money(r.actual), 'right')}${td(money(n(r.planned) - n(r.actual)), 'right')}${td(rowPct(r), 'center')}${td(esc(cap(r.status)))}${td(esc(r.remarks))}${td(esc(r.personResponsible))}</tr>`).join('');
      return band + rows;
    }).join('');
    const totalsRow = `<tr>${'<td colspan="2" style="border:1px solid #333;padding:4px 6px;text-align:right;font-weight:bold;">TOTAL</td>'}${td(`₱ ${money(totals.planned)}`, 'right', true)}${td(`₱ ${money(totals.actual)}`, 'right', true)}${td(`₱ ${money(balance)}`, 'right', true)}${td(`${pct}%`, 'center', true)}<td colspan="3" style="border:1px solid #333;"></td></tr>`;
    return `<div style="font-family:Arial,sans-serif;font-size:11px;color:#111;">
      ${letterhead(`ACCOMPLISHMENT REPORT — F.Y. ${doc.fiscalYear}`)}
      <table style="border-collapse:collapse;width:100%;">
        <thead><tr>${th('Reference Code')}${th('PPAs')}${th('Planned Budget')}${th('Actual Spent')}${th('Balance')}${th('Utilization')}${th('Status')}${th('Remarks')}${th('Person Responsible')}</tr></thead>
        <tbody>${body}${totalsRow}</tbody>
      </table>
      ${signatoryBlock(doc.signatories, { preparedByTitle: 'SK Treasurer' })}
    </div>`;
  };

  const printDoc = () => { if (!printHtml(`Accomplishment Report FY ${doc.fiscalYear}`, buildDocHTML())) toast.error('Allow pop-ups to print.'); };
  const exportExcel = () => downloadExcel(`Accomplishment_Report_FY_${doc.fiscalYear}.xls`, buildDocHTML());
  const s = doc.signatories;

  return (
    <div className="space-y-6">
      <ReportToolbar
        title={`Accomplishment report · FY ${doc.fiscalYear}`}
        description="Planned budget vs actual approved spending for each program, project and activity (PPA)."
        backTo={`${base}/reports`} saved={!!savedId} status={status} dirty={dirty} saving={saving}
        periodLabel="Fiscal year" periodValue={savedId ? doc.fiscalYear : year}
        periodOptions={[...new Set([...YEARS, doc.fiscalYear])].sort((a, b) => b - a).map((y) => ({ value: y, label: `FY ${y}` }))}
        onPeriodChange={setYear} onRefresh={() => load(year)}
        onExcel={exportExcel} onPrint={printDoc} onSave={save}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Total icon={Wallet} label="Planned budget" value={`₱ ${money(totals.planned)}`} />
        <Total icon={TrendingDown} label="Actual spent" value={`₱ ${money(totals.actual)}`} />
        <Total icon={PiggyBank} label="Balance" value={`₱ ${money(balance)}`} tone={balance < 0 ? 'text-danger' : 'text-success'} />
        <Total icon={Percent} label="Utilization" value={`${pct}%`} />
      </div>

      {doc.areas.length === 0 ? (
        <EmptyState icon={Wallet} title={`No programs for FY ${doc.fiscalYear}`}
          description="Programs with dates in this year appear here automatically. You can also add rows by hand."
          action={<Button onClick={addArea}><Plus className="h-4 w-4" /> Add program area</Button>} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1050px] text-xs">
              <thead>
                <tr className="bg-primary text-primary-fg">
                  {['Ref. code', 'PPAs', 'Planned (₱)', 'Actual (₱)', 'Balance', 'Used', 'Status', 'Remarks', 'Person resp.', ''].map((h, i) => (
                    <th key={i} scope="col" className="border border-primary-fg/20 px-2 py-2 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.areas.map((a, ai) => (
                  <Fragment key={ai}>
                    <tr className="bg-surface2">
                      <td colSpan={9} className="px-2 py-1.5">
                        <input aria-label="Program area" value={a.area} onChange={(e) => setArea(ai, e.target.value)} className="w-full bg-transparent font-bold text-fg outline-none" />
                      </td>
                      <td className="px-1 text-center">
                        <button type="button" onClick={() => delArea(ai)} className="text-danger hover:opacity-70" title="Remove area" aria-label={`Remove area ${a.area}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                    {a.rows.map((r, ri) => {
                      const bal = n(r.planned) - n(r.actual);
                      return (
                        <tr key={ri} className="align-top">
                          <td className="border border-border px-1"><input aria-label="Reference code" value={r.referenceCode} onChange={(e) => setCell(ai, ri, 'referenceCode', e.target.value)} className={cellCls} /></td>
                          <td className="border border-border px-1"><textarea aria-label="PPA" rows={2} value={r.ppa} onChange={(e) => setCell(ai, ri, 'ppa', e.target.value)} className={cellCls} /></td>
                          <td className="border border-border px-1"><input aria-label="Planned budget" type="number" min="0" value={r.planned} onChange={(e) => setCell(ai, ri, 'planned', e.target.value)} className={numCls} /></td>
                          <td className="border border-border px-1"><input aria-label="Actual spent" type="number" min="0" value={r.actual} onChange={(e) => setCell(ai, ri, 'actual', e.target.value)} className={numCls} /></td>
                          <td className={`border border-border px-2 py-1 text-right font-semibold tabular-nums ${bal < 0 ? 'text-danger' : 'text-fg'}`}>{money(bal)}</td>
                          <td className="border border-border px-2 py-1 text-center tabular-nums text-muted">{rowPct(r)}</td>
                          <td className="border border-border px-1">
                            <select aria-label="Status" value={r.status || 'planned'} onChange={(e) => setCell(ai, ri, 'status', e.target.value)} className={`${cellCls} cursor-pointer`}>
                              {STATUSES.map((st) => <option key={st} value={st}>{cap(st)}</option>)}
                            </select>
                          </td>
                          <td className="border border-border px-1"><textarea aria-label="Remarks" rows={2} value={r.remarks} onChange={(e) => setCell(ai, ri, 'remarks', e.target.value)} className={cellCls} placeholder="What was done" /></td>
                          <td className="border border-border px-1"><textarea aria-label="Person responsible" rows={2} value={r.personResponsible} onChange={(e) => setCell(ai, ri, 'personResponsible', e.target.value)} className={cellCls} /></td>
                          <td className="px-1 text-center"><button type="button" onClick={() => delRow(ai, ri)} className="text-danger hover:opacity-70" title="Remove row" aria-label={`Remove row ${ri + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={10} className="px-2 py-1">
                        <button type="button" onClick={() => addRow(ai)} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="h-3.5 w-3.5" /> Add PPA row</button>
                      </td>
                    </tr>
                  </Fragment>
                ))}
                <tr className="bg-surface2 font-bold text-fg">
                  <td colSpan={2} className="border border-border px-2 py-2 text-right">TOTAL</td>
                  <td className="border border-border px-2 text-right tabular-nums">{money(totals.planned)}</td>
                  <td className="border border-border px-2 text-right tabular-nums">{money(totals.actual)}</td>
                  <td className={`border border-border px-2 text-right tabular-nums ${balance < 0 ? 'text-danger' : ''}`}>{money(balance)}</td>
                  <td className="border border-border px-2 text-center tabular-nums">{pct}%</td>
                  <td colSpan={4} className="border border-border" />
                </tr>
              </tbody>
            </table>
          </div>
          <Button variant="outline" onClick={addArea}><Plus className="h-4 w-4" /> Add program area</Button>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SigField heading="Prepared by" name={s.preparedBy || ''} title={s.preparedByTitle || 'SK Treasurer'} onName={(v) => setSig('preparedBy', v)} onTitle={(v) => setSig('preparedByTitle', v)} />
        <SigField heading="Recommending approval" name={s.recommendingApproval || ''} title={s.recommendingApprovalTitle || 'SK Chairperson'} onName={(v) => setSig('recommendingApproval', v)} onTitle={(v) => setSig('recommendingApprovalTitle', v)} />
        <SigField heading="Noted and approved" name={s.notedApproved || ''} title={s.notedApprovedTitle || 'Punong Barangay'} onName={(v) => setSig('notedApproved', v)} onTitle={(v) => setSig('notedApprovedTitle', v)} />
      </div>
    </div>
  );
}
