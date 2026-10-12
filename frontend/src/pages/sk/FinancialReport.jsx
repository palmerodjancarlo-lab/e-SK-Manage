// src/pages/sk/FinancialReport.jsx — SK Financial Report for a fiscal year (saved with the internal
// type 'accomplishment', as before). Built from the money records, so the figures are read-only:
//   I.   Statement of receipts and disbursements (beginning balance + receipts − disbursements)
//   II.  Fund utilization by PPA (ABYIP appropriation vs actual; reconciles with I)
//   III. Disbursements by category
//   IV.  Details of receipts and of disbursements
// Notes and signatories are editable. A saved report keeps its figures as they were when saved.
// cspell:words PPAs
import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Info, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { Button, Spinner } from '../../components/ui';
import ReportToolbar from '../../components/reports/ReportToolbar';
import {
  persistReport, printHtml, downloadExcel, letterhead, signatoryBlock,
  reportNumber as n, reportMoney as money, escHtml as esc,
} from '../../lib/reports';

const CUR = new Date().getFullYear();
const YEARS = [CUR, CUR - 1, CUR - 2, CUR + 1];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const SOURCE = { barangay_allocation: 'Barangay allocation', donation: 'Donation', grant: 'Grant', other: 'Other' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const pctOf = (a, b) => (n(b) > 0 ? `${Math.round((n(a) / n(b)) * 100)}%` : '—');

// Everything the page shows comes from the prefill (or the saved snapshot of it)
const fromRecords = (data) => ({
  fiscalYear: data.fiscalYear,
  generatedAt: data.generatedAt,
  statement: data.statement || { beginning: 0, receipts: [], totalReceipts: 0, available: 0, disbursements: 0, ending: 0 },
  ppas: data.ppas || [],
  unlinked: n(data.unlinked),
  categories: data.categories || [],
  receiptList: data.receiptList || [],
  disbursementList: data.disbursementList || [],
  pending: data.pending || { count: 0, amount: 0 },
});

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
      <p className={`mt-1 text-base font-extrabold tabular-nums sm:text-lg ${tone}`}>{value}</p>
    </div>
  );
}

function Section({ no, title, description, children }) {
  return (
    <section aria-labelledby={`fr-${no}`} className="space-y-3">
      <div>
        <h2 id={`fr-${no}`} className="text-base font-bold text-fg">{no}. {title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const thCls = 'border border-primary-fg/20 px-2 py-2 text-left font-bold';
const tdCls = 'border border-border px-2 py-1.5';
const numTd = `${tdCls} text-right tabular-nums`;

function Table({ head, minW = 'min-w-[640px]', children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className={`w-full ${minW} text-xs`}>
        <thead>
          <tr className="bg-primary text-primary-fg">
            {head.map((h, i) => <th key={i} scope="col" className={`${thCls} ${h.right ? 'text-right' : ''}`}>{h.label ?? h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function FinancialReport() {
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

  // fresh = re-read a saved report's figures from records (keeps its notes and signatories)
  const load = useCallback(async (y, { fresh = false } = {}) => {
    const prefill = async (fy) => (await api.get('/finance/reports/financial/prefill', { params: { year: fy } })).data;
    setLoading(true);
    try {
      if (reportId) {
        const r = await api.get(`/finance/reports/${reportId}`);
        const saved = r.data.report?.data || {};
        const fy = saved.fiscalYear || r.data.report?.fiscalYear || y;
        setStatus(r.data.report?.status || 'draft');
        // Reports saved before the redesign have no statement — read their year's figures from records
        const figures = saved.statement && !fresh ? fromRecords(saved) : fromRecords(await prefill(fy));
        setDoc({ ...figures, notes: saved.notes || '', signatories: saved.signatories || {} });
        setDirty(fresh);
        return;
      }
      const data = await prefill(y);
      setDoc((d) => ({ ...fromRecords(data), notes: d?.fiscalYear === data.fiscalYear ? d.notes : '', signatories: data.signatories || {} }));
      setDirty(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load the financial report data.');
    } finally { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(year); }, [year, load]);

  if (loading || !doc) return <div className="flex justify-center py-20" role="status"><Spinner className="h-8 w-8 text-primary" /><span className="sr-only">Loading…</span></div>;

  const st = doc.statement;
  const fy = doc.fiscalYear;
  const setSig = (k, v) => edit((d) => ({ ...d, signatories: { ...d.signatories, [k]: v } }));
  const appropriation = doc.ppas.reduce((sum, p) => sum + n(p.appropriation), 0);
  const ppaActual = doc.ppas.reduce((sum, p) => sum + n(p.actual), 0) + doc.unlinked;
  const areas = doc.ppas.reduce((acc, p) => { (acc[p.area] ||= []).push(p); return acc; }, {});
  const receiptTotal = doc.receiptList.reduce((sum, r) => sum + n(r.amount), 0);
  const autoNotes = [
    'Figures are taken from the funds received and the expenses approved by the SK Chairperson in e-SK Manage. Voided entries are excluded.',
    doc.pending.count > 0 && `${doc.pending.count} expense${doc.pending.count === 1 ? '' : 's'} worth ₱ ${money(doc.pending.amount)} still awaiting approval ${doc.pending.count === 1 ? 'is' : 'are'} not included.`,
    doc.unlinked > 0 && `₱ ${money(doc.unlinked)} of disbursements is not yet charged to a PPA; it is shown on its own line in Section II so the totals agree with Section I.`,
  ].filter(Boolean);

  const save = async (nextStatus) => {
    setSaving(true);
    try {
      const id = await persistReport(savedId, {
        title: `Financial Report FY ${fy}`,
        type: 'accomplishment',
        fiscalYear: fy,
        periodStart: `${fy}-01-01`,
        periodEnd: `${fy}-12-31`,
        data: doc,
        summary: { beginning: st.beginning, receipts: st.totalReceipts, disbursements: st.disbursements, ending: st.ending, appropriation },
        status: nextStatus,
      });
      setSavedId(id); setStatus(nextStatus); setDirty(false);
      toast.success(nextStatus === 'finalized' && status !== 'finalized' ? 'Financial report finalized and saved.' : savedId ? 'Changes saved.' : 'Draft saved.');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  // ── Printed / Excel version ──
  const buildDocHTML = () => {
    const B = 'border:1px solid #333;padding:3px 6px;';
    const td = (v, al = 'left', bold = false, extra = '') => `<td style="${B}text-align:${al};${bold ? 'font-weight:bold;' : ''}${extra}">${v}</td>`;
    const th = (t, al = 'left') => `<th style="${B}background:#c0392b;color:#fff;text-align:${al};">${t}</th>`;
    const table = (head, rows) => `<table style="border-collapse:collapse;width:100%;margin-bottom:6px;"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    const h3 = (t) => `<h3 style="font-size:12px;margin:16px 0 6px;">${t}</h3>`;
    const peso = (v) => `₱ ${money(v)}`;
    const band = 'background:#f2b6b6;';

    const s1 = table(`${th('Particulars')}${th('Amount', 'right')}${th('Total', 'right')}`, [
      `<tr>${td(`Beginning balance, January 1, ${fy}`)}${td('')}${td(peso(st.beginning), 'right', true)}</tr>`,
      `<tr>${td('Add: Receipts', 'left', true)}${td('')}${td('')}</tr>`,
      ...st.receipts.map((r) => `<tr>${td(esc(r.label), 'left', false, 'padding-left:22px;')}${td(money(r.amount), 'right')}${td('')}</tr>`),
      `<tr>${td('Total receipts', 'left', false, 'padding-left:22px;')}${td('')}${td(peso(st.totalReceipts), 'right', true)}</tr>`,
      `<tr>${td('Total funds available', 'left', true)}${td('')}${td(peso(st.available), 'right', true)}</tr>`,
      `<tr>${td('Less: Disbursements (approved expenses)', 'left', true)}${td('')}${td(`(${money(st.disbursements)})`, 'right', true)}</tr>`,
      `<tr>${td(`Ending balance, December 31, ${fy}`, 'left', true, band)}${td('', 'left', false, band)}${td(peso(st.ending), 'right', true, band)}</tr>`,
    ].join(''));

    const s2rows = Object.entries(areas).map(([area, rows]) =>
      `<tr><td colspan="6" style="${B}${band}font-weight:bold;">${esc(area)}</td></tr>`
      + rows.map((p) => `<tr>${td(esc(p.referenceCode))}${td(esc(p.ppa))}${td(money(p.appropriation), 'right')}${td(money(p.actual), 'right')}${td(money(n(p.appropriation) - n(p.actual)), 'right')}${td(pctOf(p.actual, p.appropriation), 'center')}</tr>`).join('')).join('')
      + (doc.unlinked > 0 ? `<tr>${td('')}${td('<i>Not charged to any PPA</i>')}${td('—', 'right')}${td(money(doc.unlinked), 'right')}${td('—', 'right')}${td('—', 'center')}</tr>` : '')
      + `<tr><td colspan="2" style="${B}text-align:right;font-weight:bold;">TOTAL</td>${td(peso(appropriation), 'right', true)}${td(peso(ppaActual), 'right', true)}${td(peso(appropriation - ppaActual), 'right', true)}${td(pctOf(ppaActual, appropriation), 'center', true)}</tr>`;
    const s2 = table(`${th('Reference Code')}${th('PPAs')}${th('Appropriation', 'right')}${th('Actual Disbursement', 'right')}${th('Balance', 'right')}${th('Utilization')}`, s2rows);

    const s3 = table(`${th('Category')}${th('Amount', 'right')}${th('Share')}`,
      (doc.categories.length
        ? doc.categories.map((c) => `<tr>${td(esc(cap(c.category)))}${td(money(c.amount), 'right')}${td(pctOf(c.amount, st.disbursements), 'center')}</tr>`).join('')
        : `<tr><td colspan="3" style="${B}">No approved disbursements.</td></tr>`)
      + `<tr>${td('TOTAL', 'right', true)}${td(peso(st.disbursements), 'right', true)}${td('')}</tr>`);

    const s4a = table(`${th('Date')}${th('Source')}${th('Type')}${th('Reference No.')}${th('Purpose')}${th('Amount', 'right')}`,
      (doc.receiptList.length
        ? doc.receiptList.map((r) => `<tr>${td(fmtDate(r.date))}${td(esc(r.source))}${td(SOURCE[r.sourceType] || 'Other')}${td(esc(r.referenceNumber))}${td(esc(r.purpose))}${td(money(r.amount), 'right')}</tr>`).join('')
        : `<tr><td colspan="6" style="${B}">No receipts recorded.</td></tr>`)
      + `<tr><td colspan="5" style="${B}text-align:right;font-weight:bold;">TOTAL</td>${td(peso(receiptTotal), 'right', true)}</tr>`);
    const s4b = table(`${th('Date')}${th('Particulars')}${th('Payee')}${th('OR / Invoice No.')}${th('PPA')}${th('Amount', 'right')}`,
      (doc.disbursementList.length
        ? doc.disbursementList.map((e) => `<tr>${td(fmtDate(e.date))}${td(esc(e.particulars))}${td(esc(e.payee))}${td(esc(e.receiptNumber))}${td(esc(e.ppa) || '<i>Not charged</i>')}${td(money(e.amount), 'right')}</tr>`).join('')
        : `<tr><td colspan="6" style="${B}">No approved disbursements.</td></tr>`)
      + `<tr><td colspan="5" style="${B}text-align:right;font-weight:bold;">TOTAL</td>${td(peso(st.disbursements), 'right', true)}</tr>`);

    const notes = [...autoNotes, ...String(doc.notes || '').split('\n').map((l) => l.trim()).filter(Boolean)];
    return `<div style="font-family:Arial,sans-serif;font-size:11px;color:#111;">
      ${letterhead(`FINANCIAL REPORT — F.Y. ${fy}`)}
      <p style="text-align:center;margin:-4px 0 10px;">For the period January 1 – December 31, ${fy}</p>
      ${h3('I. Statement of Receipts and Disbursements')}${s1}
      ${h3('II. Fund Utilization by PPA')}${s2}
      ${h3('III. Disbursements by Category')}${s3}
      ${h3('IV-A. Details of Receipts')}${s4a}
      ${h3('IV-B. Details of Disbursements')}${s4b}
      ${h3('Notes')}<ol style="margin:0 0 0 18px;padding:0;">${notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
      ${signatoryBlock(doc.signatories, { preparedByTitle: 'SK Treasurer' })}
    </div>`;
  };

  const printDoc = () => { if (!printHtml(`Financial Report FY ${fy}`, buildDocHTML(), { portrait: true })) toast.error('Allow pop-ups to print.'); };
  const exportExcel = () => downloadExcel(`Financial_Report_FY_${fy}.xls`, buildDocHTML());
  const s = doc.signatories;
  const canUpdate = savedId && status === 'draft';

  return (
    <div className="space-y-8">
      <ReportToolbar
        title={`Financial report · FY ${fy}`}
        description="Where the SK funds came from, how they were spent, and what is left — taken from recorded funds and approved expenses."
        backTo={`${base}/reports`} saved={!!savedId} status={status} dirty={dirty} saving={saving}
        periodLabel="Fiscal year" periodValue={savedId ? fy : year}
        periodOptions={[...new Set([...YEARS, fy])].sort((a, b) => b - a).map((y) => ({ value: y, label: `FY ${y}` }))}
        onPeriodChange={setYear} onRefresh={() => load(year)}
        onExcel={exportExcel} onPrint={printDoc} onSave={save}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Total icon={Wallet} label="Balance, Jan 1" value={`₱ ${money(st.beginning)}`} />
        <Total icon={ArrowDownToLine} label="Receipts" value={`₱ ${money(st.totalReceipts)}`} tone="text-success" />
        <Total icon={ArrowUpFromLine} label="Disbursements" value={`₱ ${money(st.disbursements)}`} tone="text-danger" />
        <Total icon={PiggyBank} label="Balance, Dec 31" value={`₱ ${money(st.ending)}`} tone={st.ending < 0 ? 'text-danger' : 'text-fg'} />
      </div>

      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-surface2 p-3 text-xs text-muted">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1">
          The amounts cannot be typed over — they come from Budget &amp; Finance, so the report always matches the records.
          To correct a figure, fix the fund or expense there{savedId ? ' and update this report' : ''}.
          {doc.generatedAt && <> Figures as of {new Date(doc.generatedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}.</>}
        </p>
        {canUpdate && (
          <Button size="sm" variant="outline" onClick={() => load(fy, { fresh: true })}><RefreshCw className="h-3.5 w-3.5" /> Update figures</Button>
        )}
      </div>

      <Section no="I" title="Statement of receipts and disbursements" description={`For the period January 1 – December 31, ${fy}.`}>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs sm:text-sm">
            <tbody>
              <tr className="border-b border-border"><td className="px-3 py-2 font-semibold text-fg">Beginning balance, January 1, {fy}</td><td /><td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-fg">₱ {money(st.beginning)}</td></tr>
              <tr><td className="px-3 pt-2 font-semibold text-fg" colSpan={3}>Add: Receipts</td></tr>
              {st.receipts.map((r) => (
                <tr key={r.key}><td className="py-1 pl-6 pr-3 text-muted sm:pl-8">{r.label}</td><td className="whitespace-nowrap px-3 py-1 text-right tabular-nums text-fg">{money(r.amount)}</td><td /></tr>
              ))}
              <tr className="border-b border-border"><td className="py-2 pl-6 pr-3 text-fg sm:pl-8">Total receipts</td><td /><td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-fg">₱ {money(st.totalReceipts)}</td></tr>
              <tr className="border-b border-border"><td className="px-3 py-2 font-semibold text-fg">Total funds available</td><td /><td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-fg">₱ {money(st.available)}</td></tr>
              <tr className="border-b border-border"><td className="px-3 py-2 font-semibold text-fg">Less: Disbursements (approved expenses)</td><td /><td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-danger">({money(st.disbursements)})</td></tr>
              <tr className="bg-primary/10"><td className="px-3 py-2.5 font-extrabold text-fg">Ending balance, December 31, {fy}</td><td /><td className={`whitespace-nowrap px-3 py-2.5 text-right font-extrabold tabular-nums ${st.ending < 0 ? 'text-danger' : 'text-fg'}`}>₱ {money(st.ending)}</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section no="II" title="Fund utilization by PPA" description="Each program’s ABYIP appropriation against what was actually spent on it. The total agrees with the disbursements in Section I.">
        <Table minW="min-w-[760px]" head={['Ref. code', 'PPAs', { label: 'Appropriation (₱)', right: true }, { label: 'Actual (₱)', right: true }, { label: 'Balance (₱)', right: true }, 'Used']}>
          {doc.ppas.length === 0 && doc.unlinked === 0 && (
            <tr><td colSpan={6} className={`${tdCls} py-6 text-center text-muted`}>No programs or spending recorded for FY {fy}.</td></tr>
          )}
          {Object.entries(areas).map(([area, rows]) => (
            <Fragment key={area}>
              <tr className="bg-surface2"><td colSpan={6} className="px-2 py-1.5 font-bold text-fg">{area}</td></tr>
              {rows.map((p) => {
                const bal = n(p.appropriation) - n(p.actual);
                return (
                  <tr key={p.program}>
                    <td className={`${tdCls} text-muted`}>{p.referenceCode || '—'}</td>
                    <td className={`${tdCls} text-fg`}>{p.ppa}</td>
                    <td className={`${numTd} text-fg`}>{money(p.appropriation)}</td>
                    <td className={`${numTd} text-fg`}>{money(p.actual)}</td>
                    <td className={`${numTd} font-semibold ${bal < 0 ? 'text-danger' : 'text-fg'}`}>{money(bal)}</td>
                    <td className={`${tdCls} text-center tabular-nums text-muted`}>{pctOf(p.actual, p.appropriation)}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
          {doc.unlinked > 0 && (
            <tr className="bg-warning/10">
              <td className={tdCls} />
              <td className={`${tdCls} italic text-fg`}>Not charged to any PPA <span className="not-italic text-muted">— link them in Budget &amp; Finance</span></td>
              <td className={`${numTd} text-muted`}>—</td>
              <td className={`${numTd} text-fg`}>{money(doc.unlinked)}</td>
              <td className={`${numTd} text-muted`}>—</td>
              <td className={`${tdCls} text-center text-muted`}>—</td>
            </tr>
          )}
          <tr className="bg-surface2 font-bold text-fg">
            <td colSpan={2} className={`${tdCls} text-right`}>TOTAL</td>
            <td className={numTd}>{money(appropriation)}</td>
            <td className={numTd}>{money(ppaActual)}</td>
            <td className={`${numTd} ${appropriation - ppaActual < 0 ? 'text-danger' : ''}`}>{money(appropriation - ppaActual)}</td>
            <td className={`${tdCls} text-center tabular-nums`}>{pctOf(ppaActual, appropriation)}</td>
          </tr>
        </Table>
      </Section>

      <Section no="III" title="Disbursements by category" description="What the money was spent on.">
        <Table minW="min-w-[420px]" head={['Category', { label: 'Amount (₱)', right: true }, 'Share']}>
          {doc.categories.length === 0 && <tr><td colSpan={3} className={`${tdCls} py-6 text-center text-muted`}>No approved disbursements for FY {fy}.</td></tr>}
          {doc.categories.map((c) => {
            const share = st.disbursements > 0 ? (n(c.amount) / st.disbursements) * 100 : 0;
            return (
              <tr key={c.category}>
                <td className={`${tdCls} text-fg`}>{cap(c.category)}</td>
                <td className={`${numTd} text-fg`}>{money(c.amount)}</td>
                <td className={`${tdCls} w-48`}>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                    <span className="w-9 text-right tabular-nums text-muted">{Math.round(share)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-surface2 font-bold text-fg"><td className={`${tdCls} text-right`}>TOTAL</td><td className={numTd}>{money(st.disbursements)}</td><td className={tdCls} /></tr>
        </Table>
      </Section>

      <Section no="IV" title="Details" description="Every receipt and approved disbursement in the year, oldest first.">
        <h3 className="text-sm font-semibold text-fg">A. Receipts</h3>
        <Table minW="min-w-[760px]" head={['Date', 'Source', 'Type', 'Reference no.', 'Purpose', { label: 'Amount (₱)', right: true }]}>
          {doc.receiptList.length === 0 && <tr><td colSpan={6} className={`${tdCls} py-6 text-center text-muted`}>No receipts recorded for FY {fy}.</td></tr>}
          {doc.receiptList.map((r, i) => (
            <tr key={i}>
              <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDate(r.date)}</td>
              <td className={`${tdCls} text-fg`}>{r.source}</td>
              <td className={`${tdCls} text-muted`}>{SOURCE[r.sourceType] || 'Other'}</td>
              <td className={`${tdCls} text-muted`}>{r.referenceNumber || '—'}</td>
              <td className={`${tdCls} text-muted`}>{r.purpose || '—'}</td>
              <td className={`${numTd} text-fg`}>{money(r.amount)}</td>
            </tr>
          ))}
          <tr className="bg-surface2 font-bold text-fg"><td colSpan={5} className={`${tdCls} text-right`}>TOTAL</td><td className={numTd}>{money(receiptTotal)}</td></tr>
        </Table>

        <h3 className="pt-2 text-sm font-semibold text-fg">B. Disbursements</h3>
        <Table minW="min-w-[860px]" head={['Date', 'Particulars', 'Payee', 'OR / invoice no.', 'PPA', { label: 'Amount (₱)', right: true }]}>
          {doc.disbursementList.length === 0 && <tr><td colSpan={6} className={`${tdCls} py-6 text-center text-muted`}>No approved disbursements for FY {fy}.</td></tr>}
          {doc.disbursementList.map((e, i) => (
            <tr key={i}>
              <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDate(e.date)}</td>
              <td className={`${tdCls} text-fg`}>{e.particulars}</td>
              <td className={`${tdCls} text-muted`}>{e.payee || '—'}</td>
              <td className={`${tdCls} text-muted`}>{e.receiptNumber || '—'}</td>
              <td className={`${tdCls} ${e.ppa ? 'text-fg' : 'italic text-warning'}`}>{e.ppa || 'Not charged'}</td>
              <td className={`${numTd} text-fg`}>{money(e.amount)}</td>
            </tr>
          ))}
          <tr className="bg-surface2 font-bold text-fg"><td colSpan={5} className={`${tdCls} text-right`}>TOTAL</td><td className={numTd}>{money(st.disbursements)}</td></tr>
        </Table>
      </Section>

      <section aria-labelledby="fr-notes" className="space-y-2">
        <h2 id="fr-notes" className="text-base font-bold text-fg">Notes</h2>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
          {autoNotes.map((t) => <li key={t}>{t}</li>)}
        </ol>
        <label htmlFor="fr-notes-input" className="block pt-1 text-xs font-semibold text-fg">Additional notes <span className="font-normal text-muted">(one per line — printed after the notes above)</span></label>
        <textarea id="fr-notes-input" rows={3} value={doc.notes || ''} onChange={(e) => edit((d) => ({ ...d, notes: e.target.value }))}
          placeholder="e.g. The remaining Sports Fest balance will be used for the barangay league in January."
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary" />
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <SigField heading="Prepared by" name={s.preparedBy || ''} title={s.preparedByTitle || 'SK Treasurer'} onName={(v) => setSig('preparedBy', v)} onTitle={(v) => setSig('preparedByTitle', v)} />
        <SigField heading="Recommending approval" name={s.recommendingApproval || ''} title={s.recommendingApprovalTitle || 'SK Chairperson'} onName={(v) => setSig('recommendingApproval', v)} onTitle={(v) => setSig('recommendingApprovalTitle', v)} />
        <SigField heading="Noted and approved" name={s.notedApproved || ''} title={s.notedApprovedTitle || 'Punong Barangay'} onName={(v) => setSig('notedApproved', v)} onTitle={(v) => setSig('notedApprovedTitle', v)} />
      </div>
    </div>
  );
}
