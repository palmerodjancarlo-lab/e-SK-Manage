// src/pages/kabataan/Budget.jsx — budget transparency for kabataan
// The API sends kabataan { totalUtilized, expensesByCategory, published }: the recorded
// total funds and balance are never sent (Chairperson's directive). `published` is the
// budget figure the Chairperson chose to show, or null; spending always comes from records.
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, Info, Package, UtensilsCrossed, Bus, Wrench, Building2, Printer, HandCoins, Shapes, Trophy, Layers,
} from 'lucide-react';
import api from '../../lib/api';
import { peso } from '../../lib/utils';
import { humanize } from '../../lib/finance';
import { Card, CardContent, Spinner, EmptyState, PageHeader, AnimatedNumber } from '../../components/ui';

const CAT_ICON = {
  supplies: Package, food: UtensilsCrossed, transportation: Bus, equipment: Wrench,
  venue: Building2, printing: Printer, honorarium: HandCoins,
};

export default function KabBudget() {
  const { data, isLoading } = useQuery({ queryKey: ['fin-summary'], queryFn: async () => (await api.get('/finance/summary')).data });
  const s = data || {};
  const utilized = s.totalUtilized ?? s.totalExpenses ?? 0;
  const exps = [...(s.expensesByCategory || [])].sort((a, b) => (b.total || 0) - (a.total || 0));
  const sum = exps.reduce((n, e) => n + (e.total || 0), 0) || 1;
  const items = exps.reduce((n, e) => n + (e.count || 0), 0);
  const top = exps[0];
  const pub = s.published;
  const usedPct = pub?.amount > 0 ? Math.min(100, Math.round((utilized / pub.amount) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title="Budget Transparency" description="How the SK spends its funds on programs and activities for the youth of Barangay Tawiran." />

      {isLoading ? <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div> : (
        <>
          {pub && (
            <Card><CardContent>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{pub.label || 'SK budget'}</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-fg">{peso(pub.amount)}</p>
                </div>
                <dl className="flex gap-6 text-sm">
                  <div><dt className="text-muted">Spent</dt><dd className="font-bold tabular-nums text-fg">{peso(utilized)}</dd></div>
                  <div><dt className="text-muted">Remaining</dt><dd className="font-bold tabular-nums text-success">{peso(pub.remaining)}</dd></div>
                </dl>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
                <div className="h-full origin-left animate-grow-x rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-subtle">{usedPct}% used{pub.updatedAt ? ` · published by the SK Chairperson on ${new Date(pub.updatedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}</p>
            </CardContent></Card>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Wallet aria-hidden="true" className="h-4 w-4 text-primary" /> Funds used so far</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-fg">₱<AnimatedNumber value={Math.round(utilized)} /></p>
            </CardContent></Card>
            <Card><CardContent>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Layers aria-hidden="true" className="h-4 w-4 text-primary" /> Spending areas</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-fg">{exps.length}<span className="ml-2 text-sm font-medium text-muted">{items ? `${items} approved items` : ''}</span></p>
            </CardContent></Card>
            <Card><CardContent>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Trophy aria-hidden="true" className="h-4 w-4 text-primary" /> Biggest area</p>
              <p className="mt-1 truncate text-3xl font-extrabold text-fg">{top ? humanize(top._id) : '—'}<span className="ml-2 text-sm font-medium text-muted">{top ? `${Math.round((top.total / sum) * 100)}%` : ''}</span></p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent>
              <h2 className="mb-1 font-bold text-fg">Where the funds go</h2>
              <p className="mb-5 text-sm text-muted">Approved spending by category, largest first.</p>
              {exps.length === 0 ? (
                <EmptyState icon={Wallet} title="No approved spending yet" description="Spending appears here once the SK Chairperson approves it." />
              ) : (
                <ol className="space-y-4">
                  {exps.map((e, i) => {
                    const Icon = CAT_ICON[e._id] || Shapes;
                    const share = Math.round(((e.total || 0) / sum) * 100);
                    return (
                      <li key={e._id} className="flex items-center gap-3 sm:gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-semibold text-fg">{humanize(e._id)}{e.count ? <span className="ml-1.5 text-xs font-normal text-subtle">{e.count} item{e.count === 1 ? '' : 's'}</span> : null}</span>
                            <span className="shrink-0 font-bold tabular-nums text-fg">{peso(e.total)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`${share}% of spending`}>
                              <div className="h-full origin-left animate-grow-x rounded-full bg-primary" style={{ width: `${share}%`, animationDelay: `${i * 80}ms` }} />
                            </div>
                            <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">{share}%</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info/10 px-5 py-3.5">
            <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm text-fg">Spending only counts expenses the SK Chairperson has approved. For the full financial records, you can coordinate with the SK Treasurer or Chairperson.</p>
          </div>
        </>
      )}
    </div>
  );
}
