// pages/shared/AttendanceSummary.jsx — who attended which events and activities in a period.
// Head Console (/admin/attendance) and SK Console (/sk/attendance). Downloads are audit-logged.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Printer, CalendarDays, Users, TrendingUp, ClipboardCheck, Search } from 'lucide-react';
import api from '../../lib/api';
import { cn, localDateInput } from '../../lib/utils';
import { PageHeader, Card, CardContent, Button, Input, Spinner, EmptyState, StatCard, Badge, Table, THead, TBody, TR, TH, TD } from '../../components/ui';
import { downloadSummaryXlsx, printSummary } from '../../lib/attendance';

const short = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const today = new Date();
const PRESETS = [
  { k: 'month', label: 'This month', range: () => [new Date(today.getFullYear(), today.getMonth(), 1), today] },
  { k: 'last', label: 'Last month', range: () => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)] },
  { k: 'quarter', label: 'Last 3 months', range: () => [new Date(today.getFullYear(), today.getMonth() - 2, 1), today] },
  { k: 'year', label: 'This year', range: () => [new Date(today.getFullYear(), 0, 1), today] },
];

export default function AttendanceSummary() {
  const [[from, to], setRange] = useState(() => PRESETS[0].range().map((d) => localDateInput(d)));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance-summary', from, to],
    queryFn: async () => (await api.get('/meetings/attendance-summary', { params: { from, to } })).data,
    enabled: !!from && !!to && from <= to,
  });
  const events = useMemo(() => data?.events || [], [data]);
  const members = useMemo(() => data?.members || [], [data]);
  const totalPresent = events.reduce((n, e) => n + e.count, 0);
  const term = q.trim().toLowerCase();
  const shown = term ? members.filter((m) => `${m.name} ${m.purok}`.toLowerCase().includes(term)) : members;
  const byId = Object.fromEntries(events.map((e) => [e._id, e]));

  const download = async (kind) => {
    setBusy(kind);
    try {
      const { data: d } = await api.get('/meetings/attendance-summary', { params: { from, to, export: 1 } });
      if (kind === 'xlsx') downloadSummaryXlsx(d);
      else if (!printSummary(d)) toast.error('Allow pop-ups to print.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not prepare the summary.');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHeader title="Attendance summary"
        description="Who attended the SK’s events and activities in a period — for records, reports and checking participation."
        actions={<>
          <Button variant="outline" loading={busy === 'xlsx'} disabled={!events.length} onClick={() => download('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" loading={busy === 'print'} disabled={!events.length} onClick={() => download('print')}><Printer className="h-4 w-4" /> Print / PDF</Button>
        </>} />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Quick period">
            {PRESETS.map((p) => {
              const [a, b] = p.range().map((d) => localDateInput(d));
              const active = a === from && b === to;
              return (
                <button key={p.k} type="button" aria-pressed={active} onClick={() => setRange([a, b])}
                  className={cn('min-h-[36px] rounded-lg px-3 text-sm font-semibold transition-colors', active ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <Input label="From" type="date" value={from} max={to} onChange={(e) => setRange([e.target.value, to])} />
            <Input label="To" type="date" value={to} min={from} onChange={(e) => setRange([from, e.target.value])} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>
        : isError ? <EmptyState icon={ClipboardCheck} title="Couldn’t load the summary" description="Check the dates and try again." />
        : events.length === 0 ? <EmptyState icon={CalendarDays} title="No events in this period" description="Pick another period — events and activities with recorded attendance appear here." />
        : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Events & activities" value={events.length} icon={CalendarDays} tone="primary" />
              <StatCard label="Members who attended" value={members.length} icon={Users} tone="success" />
              <StatCard label="Total attendance" value={totalPresent} icon={ClipboardCheck} tone="info" />
              <StatCard label="Average per event" value={Math.round(totalPresent / events.length)} icon={TrendingUp} tone="accent" />
            </div>

            <div className="grid gap-6 xl:grid-cols-5 [&>*]:min-w-0">
              <section className="xl:col-span-2" aria-labelledby="att-events">
                <h2 id="att-events" className="mb-3 flex min-h-[44px] items-center text-xs font-bold uppercase tracking-[0.12em] text-subtle">Events and activities</h2>
                <Table label="Events and activities" stack>
                  <THead><TR><TH>Date</TH><TH>Event</TH><TH className="text-right">Present</TH></TR></THead>
                  <TBody>
                    {events.map((e) => (
                      <TR key={e._id}>
                        <TD label="Date" className="whitespace-nowrap text-muted">{short(e.date)}</TD>
                        <TD label="Event">
                          <span className="font-semibold text-fg">{e.title}</span>
                          <span className="block text-xs text-subtle">{e.kind === 'activity' ? `Activity · ${e.type || ''}` : e.type || 'Event'}</span>
                        </TD>
                        <TD label="Present" className="text-right font-bold tabular-nums text-fg">{e.count}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </section>

              <section className="xl:col-span-3" aria-labelledby="att-members">
                <div className="mb-3 flex min-h-[44px] flex-wrap items-center justify-between gap-3">
                  <h2 id="att-members" className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Members ({members.length})</h2>
                  <div className="w-full sm:w-64">
                    <Input aria-label="Search members" placeholder="Search name or purok…" value={q} onChange={(e) => setQ(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
                  </div>
                </div>
                <Table label="Members who attended" stack>
                  <THead><TR><TH>Member</TH><TH>Attended</TH><TH className="text-right">Total</TH></TR></THead>
                  <TBody>
                    {shown.map((m) => (
                      <TR key={m._id}>
                        <TD label="Member">
                          <span className="font-semibold text-fg">{m.name}</span>
                          <span className="mt-0.5 flex flex-wrap items-center justify-end gap-1.5 text-xs text-subtle sm:justify-start">
                            {[m.purok, m.age != null ? `${m.age} yrs` : ''].filter(Boolean).join(' · ')}
                            {!m.verified && <Badge variant="warning">Not yet verified</Badge>}
                          </span>
                        </TD>
                        <TD label="Attended" className="text-sm text-muted">{m.attended.map((id) => byId[id]?.title).filter(Boolean).join(', ')}</TD>
                        <TD label="Total" className="text-right font-bold tabular-nums text-fg">{m.attended.length}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                {shown.length === 0 && <p className="py-6 text-center text-sm text-muted">No member matches that search.</p>}
              </section>
            </div>
          </>
        )}
    </>
  );
}
