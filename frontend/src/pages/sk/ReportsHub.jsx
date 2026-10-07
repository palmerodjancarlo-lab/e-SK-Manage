// cspell:words ABYIP abyip CBYDP cbydp Barangay
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileSpreadsheet, FileText, BarChart3, Plus, Trash2, Eye, ScrollText } from 'lucide-react';
import api from '../../lib/api';
import { PageHeader, Card, CardContent, Spinner, Badge, Button, EmptyState } from '../../components/ui';

const STATUS_TONE = { draft: 'default', finalized: 'info', submitted: 'success' };
const TYPE_LABEL = { abyip: 'ABYIP', cbydp: 'CBYDP', accomplishment: 'Accomplishment' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function ReportsHub() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();
  const base = loc.pathname.startsWith('/admin') ? '/admin' : '/sk';

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => (await api.get('/finance/reports')).data.reports || [],
  });
  const delM = useMutation({
    mutationFn: (id) => api.delete(`/finance/reports/${id}`),
    onSuccess: () => { toast.success('Report deleted.'); qc.invalidateQueries({ queryKey: ['reports'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Only the Chairperson can delete reports.'),
  });

  const routeFor = (type) => (type === 'cbydp' ? 'cbydp' : type === 'accomplishment' ? 'accomplishment' : 'abyip');
  const open = (r) => nav(`${base}/reports/${routeFor(r.type)}?id=${r._id}`);

  return (
    <>
      <PageHeader title="Reports" description="Generate and manage the SK's official planning and accomplishment documents." />

      <div className="grid gap-4 sm:grid-cols-3">
        <button onClick={() => nav(`${base}/reports/abyip`)} className="w-full rounded-2xl border border-border bg-surface p-5 text-left transition hover:shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary"><FileSpreadsheet className="h-6 w-6" /></div>
          <h3 className="mt-3 font-bold text-fg">ABYIP</h3>
          <p className="text-sm text-muted">Annual investment program — the yearly plan from your PPAs &amp; funds.</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Generate</span>
        </button>

        <button onClick={() => nav(`${base}/reports/cbydp`)} className="w-full rounded-2xl border border-border bg-surface p-5 text-left transition hover:shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary"><FileText className="h-6 w-6" /></div>
          <h3 className="mt-3 font-bold text-fg">CBYDP</h3>
          <p className="text-sm text-muted">3-year development plan, grouped by Center of Participation.</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Generate</span>
        </button>

        <button onClick={() => nav(`${base}/reports/accomplishment`)} className="w-full rounded-2xl border border-border bg-surface p-5 text-left transition hover:shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary"><BarChart3 className="h-6 w-6" /></div>
          <h3 className="mt-3 font-bold text-fg">Accomplishment</h3>
          <p className="text-sm text-muted">Planned vs actual spending per PPA, from approved expenses.</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Generate</span>
        </button>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-subtle">Saved reports</h3>
        {isLoading ? <div className="flex justify-center py-12"><Spinner className="h-6 w-6 text-primary" /></div>
          : reports.length === 0 ? <EmptyState icon={ScrollText} title="No saved reports yet" description="Generate a report, then Save to keep a copy here." />
          : (
            <Card><CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">By</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {reports.map((r) => (
                    <tr key={r._id} className="hover:bg-surface2/50">
                      <td className="px-4 py-3 font-semibold text-fg">{r.title}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-muted">{TYPE_LABEL[r.type] || r.type}</td>
                      <td className="px-4 py-3"><Badge variant={STATUS_TONE[r.status] || 'default'}>{r.status}</Badge></td>
                      <td className="px-4 py-3 text-muted">{r.generatedBy ? `${r.generatedBy.firstName} ${r.generatedBy.lastName}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-subtle">{fmt(r.updatedAt || r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => open(r)}><Eye className="h-4 w-4" /> Open</Button>
                          <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => delM.mutate(r._id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
      </div>
    </>
  );
}