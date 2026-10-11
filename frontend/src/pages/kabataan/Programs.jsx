// src/pages/kabataan/Programs.jsx — what the SK is doing, and what each program has used so far
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, FolderKanban, MapPin, Star, CalendarDays, Layers, ListChecks, UserRound, Users, Megaphone } from 'lucide-react';
import api from '../../lib/api';
import { peso, cn } from '../../lib/utils';
import { Card, CardContent, Spinner, EmptyState, PageHeader } from '../../components/ui';
import { programIcon, STATUS_DOT, statusLabel, latestProgress } from '../../lib/programs';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const FILTERS = ['all', 'ongoing', 'planned', 'completed'];

function StatusPill({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-fg">
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[status] || 'bg-subtle')} />{statusLabel(status)}
    </span>
  );
}

function Photos({ photos }) {
  if (!photos?.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {photos.slice(0, 6).map((p, i) => (
        <img key={i} src={p.url} alt={p.caption || ''} loading="lazy" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
      ))}
    </div>
  );
}

export default function KabPrograms() {
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['public-programs'],
    queryFn: async () => (await api.get('/programs/public')).data.programs || [],
  });
  const [open, setOpen] = useState({});
  const [filter, setFilter] = useState('all');
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const count = (f) => (f === 'all' ? programs.length : programs.filter((g) => g.status === f).length);
  const list = filter === 'all' ? programs : programs.filter((g) => g.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title="Programs & Projects" description="What your SK is doing for Barangay Tawiran — and how much each program has used so far." />

      {isLoading ? <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>
        : programs.length === 0 ? <EmptyState icon={FolderKanban} title="No programs yet" description="SK programs and projects will appear here." />
        : (
          <>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                  className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                    filter === f ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
                  {f !== 'all' && <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[f])} />}
                  {f === 'all' ? 'All' : statusLabel(f)}
                  <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{count(f)}</span>
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <EmptyState icon={FolderKanban} title={`No ${filter} programs`} description="Try another filter." />
            ) : (
              <div className="grid items-start gap-4 lg:grid-cols-2">
                {list.map((g, i) => {
                  const Icon = programIcon(g.category);
                  const projects = g.projects || [];
                  const activities = projects.reduce((n, p) => n + (p.activities?.length || 0), 0);
                  const isOpen = !!open[g._id];
                  const pct = latestProgress(g);
                  const latest = g.updates?.[0];
                  return (
                    <Card key={g._id} className="animate-fade-up transition-shadow hover:shadow-pop" style={{ animationDelay: `${i * 50}ms` }}>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-6 w-6" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{g.category}</p>
                              <StatusPill status={g.status} />
                            </div>
                            <h3 className="mt-0.5 font-bold leading-snug text-fg">{g.title}</h3>
                            {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
                          </div>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface2/60 p-3 text-xs sm:grid-cols-3">
                          <div>
                            <dt className="text-subtle">Used so far</dt>
                            <dd className="mt-0.5 text-sm font-bold tabular-nums text-fg">{peso(g.spent)}</dd>
                          </div>
                          <div>
                            <dt className="flex items-center gap-1 text-subtle"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />Timeline</dt>
                            <dd className="mt-0.5 font-semibold text-fg">{g.startDate ? `${fmt(g.startDate)}${g.endDate ? ` – ${fmt(g.endDate)}` : ''}` : 'To be announced'}</dd>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <dt className="flex items-center gap-1 text-subtle"><Layers aria-hidden="true" className="h-3.5 w-3.5" />Inside</dt>
                            <dd className="mt-0.5 font-semibold text-fg">{projects.length} project{projects.length === 1 ? '' : 's'} · {activities} activit{activities === 1 ? 'y' : 'ies'}</dd>
                          </div>
                        </dl>
                        {(g.targetBeneficiaries || g.beneficiaryCount != null) && (
                          <p className="mt-3 flex items-start gap-1.5 text-sm text-muted"><Users aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span><span className="font-semibold text-fg">For: </span>{[g.beneficiaryCount != null ? `${g.beneficiaryCount.toLocaleString()} youth` : '', g.targetBeneficiaries].filter(Boolean).join(' · ')}</span>
                          </p>
                        )}
                        {pct != null && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs"><span className="text-subtle">Progress</span><span className="font-semibold tabular-nums text-fg">{pct}%</span></div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title} progress`}>
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        {latest && (
                          <div className="mt-3 rounded-xl border border-border p-3">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-subtle"><Megaphone aria-hidden="true" className="h-3.5 w-3.5 text-primary" /> Latest update · {fmt(latest.postedAt)}</p>
                            <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-fg">{latest.note}</p>
                            {g.updates.length > 1 && (
                              <details className="mt-2 text-sm">
                                <summary className="cursor-pointer font-semibold text-primary">Earlier updates ({g.updates.length - 1})</summary>
                                <ul className="mt-2 space-y-2">
                                  {g.updates.slice(1).map((u) => <li key={u._id}><span className="text-xs text-subtle">{fmt(u.postedAt)}</span><p className="whitespace-pre-line text-muted">{u.note}</p></li>)}
                                </ul>
                              </details>
                            )}
                          </div>
                        )}
                        {g.organizer && <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle"><UserRound aria-hidden="true" className="h-3.5 w-3.5" /> Led by {g.organizer}</p>}

                        <Photos photos={g.photos} />

                        {projects.length > 0 && (
                          <button type="button" onClick={() => toggle(g._id)} aria-expanded={isOpen} aria-controls={`prog-${g._id}`}
                            className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-primary hover:underline">
                            <ListChecks aria-hidden="true" className="h-4 w-4" /> {isOpen ? 'Hide projects' : 'See projects & activities'}
                            <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                          </button>
                        )}

                        {isOpen && (
                          <div id={`prog-${g._id}`} className="mt-3 space-y-3 border-t border-border pt-4">
                            {projects.map((p) => (
                              <div key={p._id} className="rounded-xl border border-border p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-bold text-fg">{p.title}</p>
                                  <StatusPill status={p.status} />
                                </div>
                                {p.description && <p className="mt-0.5 text-sm text-muted">{p.description}</p>}
                                <p className="mt-1 text-xs font-semibold tabular-nums text-fg">{peso(p.spent)} used</p>
                                <Photos photos={p.photos} />

                                {p.activities?.length > 0 && (
                                  <ul className="mt-3 space-y-2">
                                    {p.activities.map((a) => (
                                      <li key={a._id} className="rounded-lg bg-surface2/60 p-2.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-semibold text-fg">{a.title}</span>
                                          {a.type && <span className="rounded bg-surface px-1.5 py-px text-[11px] font-semibold text-muted">{a.type}</span>}
                                          {a.points > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star aria-hidden="true" className="h-3 w-3" /> earn {a.points} pts</span>}
                                        </div>
                                        {a.venue && <p className="mt-0.5 flex items-center gap-1 text-xs text-subtle"><MapPin aria-hidden="true" className="h-3 w-3" /> {a.venue}</p>}
                                        {a.description && <p className="mt-0.5 text-xs text-muted">{a.description}</p>}
                                        <p className="mt-1 text-xs font-semibold tabular-nums text-fg">{peso(a.spent)} used</p>
                                        <Photos photos={a.photos} />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
    </div>
  );
}
