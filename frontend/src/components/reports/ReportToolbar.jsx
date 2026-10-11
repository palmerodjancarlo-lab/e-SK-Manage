// Header + actions shared by the ABYIP, CBYDP and Accomplishment pages.
// Guards unsaved edits: refreshing from records or switching the period asks first.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileSpreadsheet, Printer, Save, CheckCircle2, Lock } from 'lucide-react';
import { Button, Badge, Modal, Select } from '../ui';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '../../lib/reports';

export default function ReportToolbar({
  title, description, backTo, status = 'draft', saved,
  periodLabel, periodValue, periodOptions = [], onPeriodChange,
  dirty, onRefresh, onExcel, onPrint, onSave, saving,
}) {
  const [pending, setPending] = useState(null); // action waiting for "discard changes?"
  const guard = (fn) => (dirty ? setPending(() => fn) : fn());
  const final = status === 'finalized' || status === 'submitted';

  return (
    <>
      <Link to={backTo} className="inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-fg">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Plans & Reports
      </Link>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-fg sm:text-2xl">{title}</h1>
            {saved && <Badge variant={REPORT_STATUS_TONE[status] || 'default'}>{REPORT_STATUS_LABEL[status] || status}</Badge>}
            {!saved && <Badge variant="default">Not saved yet</Badge>}
            {dirty && saved && <span className="text-xs font-semibold text-warning">Unsaved changes</span>}
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {saved ? (
            <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border bg-surface2/60 px-3 text-sm font-semibold text-fg" title="A saved report keeps its period. Generate a new one from Plans & Reports for another period.">
              <Lock aria-hidden="true" className="h-3.5 w-3.5 text-subtle" /> {periodOptions.find((o) => o.value === periodValue)?.label || periodValue}
            </span>
          ) : (
            <div className="w-36">
              <Select aria-label={periodLabel} value={periodValue} onChange={(e) => { const v = Number(e.target.value); guard(() => onPeriodChange(v)); }}>
                {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          )}
          {!saved && <Button variant="outline" onClick={() => guard(onRefresh)}><RefreshCw className="h-4 w-4" /> Refresh from records</Button>}
          <Button variant="outline" onClick={onExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={onPrint}><Printer className="h-4 w-4" /> Print / PDF</Button>
          {final ? (
            <Button loading={saving} onClick={() => onSave(status)}><Save className="h-4 w-4" /> Save changes</Button>
          ) : (
            <>
              <Button variant="outline" loading={saving} onClick={() => onSave('draft')}><Save className="h-4 w-4" /> Save draft</Button>
              <Button loading={saving} onClick={() => onSave('finalized')}><CheckCircle2 className="h-4 w-4" /> Finalize</Button>
            </>
          )}
        </div>
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Discard your changes?"
        footer={<><Button variant="outline" onClick={() => setPending(null)}>Keep editing</Button>
          <Button variant="danger" onClick={() => { const fn = pending; setPending(null); fn(); }}>Discard changes</Button></>}>
        <p className="text-sm text-muted">You have edits that aren’t saved yet. Continuing will replace them with fresh figures from the records.</p>
      </Modal>
    </>
  );
}
