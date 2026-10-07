// src/pages/admin/BudgetBreakdown.jsx — PPA budget: Program → Project → Activity.
// Reads /budget/overview and /budget/program/:id. "Spent" is rolled up from real
// approved expenses on the backend, so the program shows overall budget used.
// cspell:words kabataan kagawad Tawiran
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, ChevronRight, ChevronLeft, FolderKanban, ClipboardList, Layers,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, EmptyState } from '../../components/ui';
import { cn } from '../../lib/utils';

const peso = (n) =>
  `\u20B1${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_TONE = {
  planned: 'bg-info/12 text-info',
  ongoing: 'bg-warning/15 text-warning',
  completed: 'bg-success/12 text-success',
  cancelled: 'bg-danger/12 text-danger',
};
function StatusPill({ status }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold capitalize', STATUS_TONE[status] || 'bg-surface2 text-muted')}>{status || 'planned'}</span>;
}

function BudgetBar({ allocated, spent }) {
  const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
  const over = spent > allocated && allocated > 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">Spent {peso(spent)}{allocated ? ` of ${peso(allocated)}` : ''}</span>
        <span className={cn('font-bold', over ? 'text-danger' : 'text-fg')}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? '#ef4444' : '#4f46e5' }} />
      </div>
    </div>
  );
}

function Overview({ onOpen }) {
  const q = useQuery({ queryKey: ['budget', 'overview'], queryFn: async () => (await api.get('/budget/overview')).data.programs });
  const programs = q.data || [];

  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>;
  if (programs.length === 0) return <EmptyState icon={FolderKanban} title="No programs yet" description="Create a program to start tracking its budget." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {programs.map((p) => (
        <button key={p._id} onClick={() => onOpen(p._id)}
          className="rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-fg">{p.title}</p>
              <p className="text-xs text-muted">{p.category}</p>
            </div>
            <StatusPill status={p.status} />
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div><p className="text-[11px] uppercase tracking-wide text-muted">Budget</p><p className="font-bold text-fg">{peso(p.totalBudget)}</p></div>
            <div><p className="text-[11px] uppercase tracking-wide text-muted">Spent</p><p className="font-bold text-rose-500">{peso(p.spent)}</p></div>
            <div><p className="text-[11px] uppercase tracking-wide text-muted">Remaining</p><p className="font-bold text-emerald-500">{peso(p.remaining)}</p></div>
          </div>
          <div className="mt-3"><BudgetBar allocated={p.totalBudget} spent={p.spent} /></div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">View breakdown <ChevronRight className="h-3.5 w-3.5" /></div>
        </button>
      ))}
    </div>
  );
}

function Detail({ id, onBack }) {
  const q = useQuery({ queryKey: ['budget', 'program', id], queryFn: async () => (await api.get(`/budget/program/${id}`)).data });
  const data = q.data;

  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>;
  if (!data) return <EmptyState icon={FolderKanban} title="Not found" description="This program could not be loaded." />;

  const { program, projects } = data;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" /> All programs
      </button>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Layers className="h-5 w-5" /></span>
              <div>
                <p className="text-lg font-extrabold text-fg">{program.title}</p>
                <p className="text-xs text-muted">{program.category}</p>
              </div>
            </div>
            <StatusPill status={program.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-surface2/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted">Total budget</p><p className="text-lg font-extrabold text-fg">{peso(program.totalBudget)}</p></div>
            <div className="rounded-xl bg-surface2/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted">Allocated</p><p className="text-lg font-extrabold text-fg">{peso(program.allocated)}</p></div>
            <div className="rounded-xl bg-surface2/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted">Spent</p><p className="text-lg font-extrabold text-rose-500">{peso(program.spent)}</p></div>
            <div className="rounded-xl bg-surface2/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted">Remaining</p><p className="text-lg font-extrabold text-emerald-500">{peso(program.remaining)}</p></div>
          </div>

          <div className="mt-4"><BudgetBar allocated={program.totalBudget} spent={program.spent} /></div>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-fg"><FolderKanban className="h-4 w-4 text-primary" /> Projects</p>
        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects" description="Add projects under this program to break the budget down." />
        ) : (
          <div className="space-y-4">
            {projects.map((pr) => (
              <Card key={pr._id}>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-fg">{pr.title}</p>
                    <StatusPill status={pr.status} />
                  </div>
                  <div className="mt-3"><BudgetBar allocated={pr.allocatedBudget} spent={pr.spent} /></div>

                  {pr.activities.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-border pt-3">
                      <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><ClipboardList className="h-3.5 w-3.5" /> Activities</p>
                      {pr.activities.map((a) => {
                        const alloc = a.estimatedCost || 0;
                        const pct = alloc > 0 ? Math.min(100, Math.round((a.spent / alloc) * 100)) : 0;
                        return (
                          <div key={a._id} className="flex items-center gap-3 rounded-xl bg-surface2/50 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-fg">{a.title}</p>
                              <p className="text-xs text-muted">Est. {peso(alloc)} · Spent {peso(a.spent)}</p>
                            </div>
                            <div className="w-24 shrink-0">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <StatusPill status={a.status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BudgetBreakdown() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-fg"><Wallet className="h-6 w-6 text-primary" /> Budget Breakdown</h2>
        <p className="text-sm text-muted">Program → Project → Activity. Spending rolls up from recorded expenses.</p>
      </div>
      {openId ? <Detail id={openId} onBack={() => setOpenId(null)} /> : <Overview onOpen={setOpenId} />}
    </div>
  );
}