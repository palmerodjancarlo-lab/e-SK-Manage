// src/pages/sk/ReportsHub.jsx — Plans & Reports (Chairperson + Treasurer)
// cspell:words ABYIP abyip CBYDP cbydp Barangay
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileSpreadsheet, FileText, BarChart3, Trash2, ScrollText, ChevronRight, FolderOpen } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Spinner, Badge, Button, EmptyState, Modal, IconButton,
  Table, THead, TBody, TR, TH, TD,
} from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { isHead } from '../../lib/roles';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE, REPORT_TYPE_LABEL } from '../../lib/reports';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const routeFor = (type) => (type === 'cbydp' ? 'cbydp' : type === 'accomplishment' ? 'accomplishment' : 'abyip');

const KINDS = [
  { to: 'abyip', title: 'ABYIP', icon: FileSpreadsheet, text: 'Annual Barangay Youth Investment Program — the yearly plan built from your PPAs and funds.' },
  { to: 'cbydp', title: 'CBYDP', icon: FileText, text: '3-year Comprehensive Barangay Youth Development Plan, grouped by Center of Participation.' },
  { to: 'accomplishment', title: 'Accomplishment report', icon: BarChart3, text: 'Planned budget vs actual spending per PPA, from approved expenses.' },
];

export default function ReportsHub() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canDelete = isHead(user?.role); // the API only lets the Chairperson delete reports
  const loc = useLocation();
  const base = loc.pathname.startsWith('/admin') ? '/admin' : '/sk';
  const [del, setDel] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => (await api.get('/finance/reports')).data.reports || [],
  });
  const delM = useMutation({
    mutationFn: (id) => api.delete(`/finance/reports/${id}`),
    onSuccess: () => { toast.success('Report deleted.'); setDel(null); qc.invalidateQueries({ queryKey: ['reports'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not delete the report.'),
  });

  return (
    <>
      <PageHeader title="Plans & Reports" description="Prepare the SK’s official documents — ABYIP, CBYDP and accomplishment reports — then print or export them." />

      <div className="grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.to} to={`${base}/reports/${k.to}`}
              className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-6 w-6" /></span>
              <h2 className="mt-3 font-bold text-fg">{k.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{k.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Prepare new <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <section className="mt-8" aria-labelledby="saved-reports">
        <h2 id="saved-reports" className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-subtle">Saved reports</h2>
        {isLoading ? <div className="flex justify-center py-12" role="status"><Spinner className="h-6 w-6 text-primary" /><span className="sr-only">Loading…</span></div>
          : reports.length === 0 ? <EmptyState icon={ScrollText} title="No saved reports yet" description="Prepare a report above, then press “Save draft” or “Finalize” to keep it here." />
          : (
            <Table label="Saved reports" stack>
              <THead><TR>
                <TH>Report</TH><TH>Status</TH><TH>Prepared by</TH><TH>Last updated</TH>
                <TH className="text-right"><span className="sr-only">Actions</span></TH>
              </TR></THead>
              <TBody>
                {reports.map((r) => (
                  <TR key={r._id}>
                    <TD label="Report">
                      <Link to={`${base}/reports/${routeFor(r.type)}?id=${r._id}`} className="font-semibold text-fg hover:text-primary hover:underline">{r.title}</Link>
                      <span className="block text-xs text-subtle">{REPORT_TYPE_LABEL[r.type] || r.type}</span>
                    </TD>
                    <TD label="Status"><Badge variant={REPORT_STATUS_TONE[r.status] || 'default'}>{REPORT_STATUS_LABEL[r.status] || r.status}</Badge></TD>
                    <TD label="Prepared by" className="text-muted">{r.generatedBy ? `${r.generatedBy.firstName} ${r.generatedBy.lastName}` : '—'}</TD>
                    <TD label="Last updated" className="whitespace-nowrap text-muted">{fmt(r.updatedAt || r.createdAt)}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`${base}/reports/${routeFor(r.type)}?id=${r._id}`}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-primary hover:bg-primary/5">
                          <FolderOpen aria-hidden="true" className="h-4 w-4" /> Open
                        </Link>
                        {canDelete && <IconButton icon={Trash2} tone="danger" label={`Delete “${r.title}”`} onClick={() => setDel(r)} />}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
      </section>

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this report?"
        footer={<><Button variant="outline" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete report</Button></>}>
        <p className="text-sm text-muted">“{del?.title}” ({REPORT_STATUS_LABEL[del?.status] || del?.status}) will be removed from Plans & Reports. This is recorded in the audit trail and can’t be undone.</p>
      </Modal>
    </>
  );
}
