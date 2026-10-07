import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, FolderKanban, MapPin, Star, CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import { peso, cn } from '../../lib/utils';
import { Card, CardContent, Spinner, Badge, EmptyState } from '../../components/ui';

const STATUS_TONE = { planned: 'info', ongoing: 'warning', completed: 'success', cancelled: 'danger' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

function Photos({ photos }) {
  if (!photos?.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {photos.slice(0, 6).map((p, i) => (
        <img key={i} src={p.url} alt={p.caption || ''} className="h-20 w-28 shrink-0 rounded-lg object-cover" />
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
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Programs &amp; Projects</h1>
        <p className="mt-1 text-sm text-muted">See what your SK is doing for Barangay Tawiran — and where funds are being used.</p>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : programs.length === 0 ? <EmptyState icon={FolderKanban} title="No programs yet" description="SK programs and projects will appear here." />
        : (
          <div className="space-y-4">
            {programs.map((g) => (
              <Card key={g._id}>
                <CardContent>
                  <button onClick={() => toggle(g._id)} className="flex w-full items-start gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><FolderKanban className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{g.category}</Badge>
                        <Badge variant={STATUS_TONE[g.status] || 'default'}>{g.status}</Badge>
                      </div>
                      <h3 className="mt-1 font-bold text-fg">{g.title}</h3>
                      {g.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{g.description}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                        {g.organizer && <span>Led by {g.organizer}</span>}
                        {(g.startDate || g.endDate) && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmt(g.startDate)}{g.endDate ? ` – ${fmt(g.endDate)}` : ''}</span>}
                        <span className="font-semibold text-fg">{peso(g.spent)} used</span>
                      </div>
                    </div>
                    <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-muted transition', open[g._id] && 'rotate-180')} />
                  </button>

                  <Photos photos={g.photos} />

                  {open[g._id] && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      {(!g.projects || g.projects.length === 0) ? (
                        <p className="text-sm text-muted">No projects under this program yet.</p>
                      ) : g.projects.map((p) => (
                        <div key={p._id} className="rounded-xl border border-border bg-surface2/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-fg">{p.title}</p>
                            <Badge variant={STATUS_TONE[p.status] || 'default'}>{p.status}</Badge>
                          </div>
                          {p.description && <p className="mt-0.5 text-sm text-muted">{p.description}</p>}
                          <p className="mt-1 text-xs font-semibold text-fg">{peso(p.spent)} used</p>
                          <Photos photos={p.photos} />

                          {p.activities?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {p.activities.map((a) => (
                                <div key={a._id} className="rounded-lg bg-surface p-2.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-fg">{a.title}</span>
                                    {a.type && <Badge variant="default">{a.type}</Badge>}
                                    {a.points > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star className="h-3 w-3" /> earn {a.points} pts</span>}
                                  </div>
                                  {a.venue && <p className="mt-0.5 flex items-center gap-1 text-xs text-subtle"><MapPin className="h-3 w-3" /> {a.venue}</p>}
                                  {a.description && <p className="mt-0.5 text-xs text-muted">{a.description}</p>}
                                  <p className="mt-1 text-xs font-semibold text-fg">{peso(a.spent)} used</p>
                                  <Photos photos={a.photos} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}