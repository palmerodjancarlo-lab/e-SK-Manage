import { useQuery } from '@tanstack/react-query';
import { Wallet, PieChart, Info } from 'lucide-react';
import api from '../../lib/api';
import { peso } from '../../lib/utils';
import { Card, CardContent, Spinner, StatCard } from '../../components/ui';

const label = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function KabBudget() {
  const { data, isLoading } = useQuery({ queryKey: ['fin-summary'], queryFn: async () => (await api.get('/finance/summary')).data });
  const s = data || {};
  // Backend sends kabataan a utilized-only view: { totalUtilized, expensesByCategory }
  const utilized = s.totalUtilized ?? s.totalExpenses ?? 0;
  const exps = s.expensesByCategory || [];
  const maxExp = Math.max(1, ...exps.map((e) => e.total || 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Budget Transparency</h1>
        <p className="mt-1 text-sm text-muted">See how the SK is using its funds for the youth of Barangay Tawiran.</p>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total Funds Utilized" value={peso(utilized)} icon={Wallet} tone="primary" />
            <StatCard label="Spending Categories" value={exps.length} icon={PieChart} tone="accent" />
          </div>

          <Card><CardContent>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-fg"><PieChart className="h-4 w-4 text-accent" /> Where the funds are used</h2>
            {exps.length === 0 ? <p className="text-sm text-muted">No approved expenses yet.</p> : (
              <div className="space-y-3">
                {exps.map((e) => (
                  <div key={e._id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize text-fg">{label(e._id)}</span>
                      <span className="font-bold text-fg">{peso(e.total)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(((e.total || 0) / maxExp) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>

          <div className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info/10 px-5 py-3.5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm text-fg">This shows how the SK's funds are being used on programs and activities for the youth. For the full financial records, coordinate with the SK Treasurer or Chairperson.</p>
          </div>
        </>
      )}
    </div>
  );
}