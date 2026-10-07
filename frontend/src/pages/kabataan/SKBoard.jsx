import { useQuery } from '@tanstack/react-query';
import { Landmark, Crown, Mail, Phone } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Avatar, EmptyState } from '../../components/ui';
import { roleLabel, SK_ROLES, HEAD_ROLES } from '../../lib/roles';

const ORDER = ['sk_chairperson', 'admin', 'sk_secretary', 'sk_treasurer', 'sk_kagawad'];

export default function KabSKBoard() {
  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['members-roster'],
    queryFn: async () => (await api.get('/auth/members')).data.users,
  });

  const officials = roster
    .filter((u) => SK_ROLES.includes(u.role) && u.isActive !== false)
    .sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));

  const head = officials.find((o) => HEAD_ROLES.includes(o.role));
  const others = officials.filter((o) => !HEAD_ROLES.includes(o.role));

  return (
    <div className="space-y-10">
      {/* Intro */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Landmark className="h-3.5 w-3.5" /> Sangguniang Kabataan
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-fg">Our SK Council</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Meet the youth leaders serving Barangay Tawiran, Santa Cruz, Marinduque.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
      ) : officials.length === 0 ? (
        <EmptyState icon={Landmark} title="No officials listed yet" description="SK officials appear here once their accounts are set up." />
      ) : (
        <div className="space-y-10">
          {/* Chairperson — featured */}
          {head && (
            <div
              className="relative mx-auto max-w-md overflow-hidden rounded-3xl p-8 text-center text-white shadow-xl"
              style={{ background: 'linear-gradient(160deg,#4338ca 0%,#312e81 58%,#1e1b4b 100%)' }}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex flex-col items-center">
                <Avatar name={`${head.firstName} ${head.lastName}`} src={head.photo} size="xl" className="h-24 w-24 ring-4 ring-white/30" />
                <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
                  <Crown className="h-3.5 w-3.5" /> {roleLabel(head.role)}
                </span>
                <p className="mt-2 text-2xl font-extrabold">{head.firstName} {head.lastName}</p>
                {head.position && <p className="text-sm text-indigo-100">{head.position}</p>}
                {(head.email || head.contactNumber) && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    {head.email && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1"><Mail className="h-3 w-3" /> {head.email}</span>}
                    {head.contactNumber && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1"><Phone className="h-3 w-3" /> {head.contactNumber}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Officers */}
          {others.length > 0 && (
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-subtle">Council Officers</h2>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((o) => (
                  <Card key={o._id} className="group transition hover:-translate-y-0.5 hover:shadow-lg">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className="relative">
                        <span className="absolute inset-0 -z-10 scale-110 rounded-full bg-primary/15 opacity-0 blur-md transition group-hover:opacity-100" />
                        <Avatar name={`${o.firstName} ${o.lastName}`} src={o.photo} size="xl" className="h-20 w-20 ring-4 ring-surface2" />
                      </div>
                      <p className="mt-4 font-bold text-fg">{o.firstName} {o.lastName}</p>
                      <Badge variant="primary" className="mt-1.5">{roleLabel(o.role)}</Badge>
                      {o.position && <p className="mt-2 text-xs text-muted">{o.position}</p>}
                      {(o.email || o.contactNumber) && (
                        <div className="mt-4 w-full space-y-1.5 border-t border-border pt-4 text-xs text-subtle">
                          {o.email && <p className="flex items-center justify-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{o.email}</span></p>}
                          {o.contactNumber && <p className="flex items-center justify-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /> {o.contactNumber}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}