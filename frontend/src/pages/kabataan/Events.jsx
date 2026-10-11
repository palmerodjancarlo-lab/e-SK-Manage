import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { QrCode, Check, MapPin, Star, CalendarDays, CalendarCheck, MessageCircleHeart, HandHeart, Clock, Users } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Button, Modal, PageHeader, EmptyState } from '../../components/ui';
import DateTile from '../../components/events/DateTile';
import EventCalendar from '../../components/events/EventCalendar';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';
import { eventTime, isPastEvent } from '../../lib/events';
import SaloobinModal from '../../components/kabataan/SaloobinModal';

function QRScanner({ onDecode }) {
    const cbRef = useRef(onDecode);
    useEffect(() => { cbRef.current = onDecode; }, [onDecode]);

    useEffect(() => {
        let cancelled = false;
        let scanner;
        try {
            scanner = new Html5Qrcode('kab-qr-reader');
        } catch {
            toast.error('Scanner failed to load.');
            return undefined;
        }

        const stop = () => {
            try {
                if (scanner.getState && scanner.getState() === 2) { // 2 = SCANNING
                    return scanner.stop().then(() => { try { scanner.clear(); } catch { /* ignore */ } }).catch(() => { });
                }
                try { scanner.clear(); } catch { /* ignore */ }
            } catch { /* ignore */ }
            return Promise.resolve();
        };

        scanner
            .start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 },
                (text) => { if (!cancelled) { cancelled = true; cbRef.current(text); } }, () => { })
            .then(() => { if (cancelled) stop(); })      // cleaned up mid-start → kill the stale camera
            .catch(() => { if (!cancelled) toast.error('Cannot open the camera. Allow access, or try on your phone.'); });

        return () => { cancelled = true; stop(); };
    }, []);

    return <div id="kab-qr-reader" className="mx-auto w-full max-w-xs overflow-hidden rounded-xl" />;
}

export default function KabEvents() {
    const { user } = useAuth();
    const qc = useQueryClient();
    // ?scan=1 (from the Home "Scan to check in" tile) opens the camera right away
    const [params] = useSearchParams();
    const [scan, setScan] = useState(() => params.get('scan') === '1');
    const [filter, setFilter] = useState('upcoming');
    const [saloobin, setSaloobin] = useState(null);

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ['sk-meetings-all'],
        queryFn: async () => {
            const list = (await api.get('/meetings')).data.meetings || [];
            const now = Date.now();
            return list.map((m) => ({ ...m, _past: isPastEvent(m, now) }))
                .sort((a, b) => new Date(a.date) - new Date(b.date));
        },
    });

    const rsvpM = useMutation({
        mutationFn: (id) => api.put(`/meetings/${id}/rsvp`),
        onSuccess: (r) => { toast.success(r.data.message || 'Updated.'); qc.invalidateQueries({ queryKey: ['sk-meetings-all'] }); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
    });
    const volunteerM = useMutation({
        mutationFn: (id) => api.put(`/meetings/${id}/volunteer`),
        onSuccess: (r) => { toast.success(r.data.message || 'Updated.'); qc.invalidateQueries({ queryKey: ['sk-meetings-all'] }); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
    });
    const checkinM = useMutation({
        mutationFn: (qrToken) => api.post('/meetings/checkin', { qrToken }),
        onSuccess: (r) => {
            toast.success(r.data.message || `Checked in! +${r.data.pointsAwarded || ''} pts`, { duration: r.data.pointsHeld ? 8000 : 4000 });
            setScan(false);
            qc.invalidateQueries({ queryKey: ['sk-meetings-all'] });
            qc.invalidateQueries({ queryKey: ['my-points'] });
            qc.invalidateQueries({ queryKey: ['points-history'] });
        },
        onError: (e) => { toast.error(e.response?.data?.message || 'Check-in failed.'); setScan(false); },
    });

    const mine = (arr) => (arr || []).some((x) => (x.user?._id || x.user) === user?._id);
    const upcoming = meetings.filter((m) => !m._past);
    const past = meetings.filter((m) => m._past).reverse();
    const shown = filter === 'past' ? past : upcoming;

    // One event card — used by the list and by the calendar's selected day
    const renderCard = (m) => {
        const going = mine(m.rsvp);
        const checkedIn = mine(m.checkedIn);
        const vols = m.volunteers || [];
        const volunteering = mine(vols);
        const slots = m.volunteerSlots || 0;
        const full = slots > 0 && vols.length >= slots && !volunteering;
        const venue = m.venue || m.location;
        return (
            <Card key={m._id} className="transition-shadow hover:shadow-pop">
                <CardContent className="flex gap-4">
                    <DateTile date={m.date} past={m._past} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-semibold text-muted">{m.type}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" /> +{m.pointsReward ?? 10} pts</span>
                            {checkedIn && <Badge variant="success"><Check className="h-3 w-3" /> Checked in</Badge>}
                            {!checkedIn && going && !m._past && <Badge variant="primary"><CalendarCheck className="h-3 w-3" /> Going</Badge>}
                        </div>
                        <h3 className="mt-1.5 font-bold text-fg">{m.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                            <span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="h-4 w-4 text-subtle" />{eventTime(m)}</span>
                            {venue && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" /><span className="truncate">{venue}</span></span>}
                        </div>
                        {m.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{m.description}</p>}

                        {!m._past && m.needsVolunteers && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface2/50 p-3">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1 text-xs font-bold text-primary">
                                        <HandHeart aria-hidden="true" className="h-3.5 w-3.5" /> Volunteers needed
                                    </p>
                                    {m.volunteerRole && <p className="truncate text-xs text-fg">{m.volunteerRole}</p>}
                                    <p className="flex items-center gap-1 text-xs text-muted"><Users aria-hidden="true" className="h-3 w-3" />{vols.length}{slots > 0 ? ` of ${slots}` : ''} signed up</p>
                                </div>
                                <Button size="sm" variant={volunteering ? 'ghost' : 'outline'} loading={volunteerM.isPending} disabled={full}
                                    onClick={() => volunteerM.mutate(m._id)}>
                                    {volunteering ? <><Check className="h-4 w-4" /> Volunteering</> : full ? 'Slots full' : <><HandHeart className="h-4 w-4" /> Volunteer</>}
                                </Button>
                            </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                            {m._past ? (
                                <>
                                    {!checkedIn && <span className="text-xs font-medium text-subtle">This event has ended</span>}
                                    <Button size="sm" variant="outline" onClick={() => setSaloobin(m)}>
                                        <MessageCircleHeart className="h-4 w-4" /> Share your saloobin
                                    </Button>
                                </>
                            ) : !checkedIn && (
                                <Button size="sm" variant={going ? 'ghost' : 'primary'} loading={rsvpM.isPending} onClick={() => rsvpM.mutate(m._id)}
                                    aria-pressed={going}>
                                    {going ? <><Check className="h-4 w-4" /> You're going · Cancel</> : <><CalendarCheck className="h-4 w-4" /> I'm going</>}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader className="mb-0" title="Events" description="RSVP, volunteer, and scan the QR at the venue to earn points."
                actions={<Button onClick={() => setScan(true)}><QrCode className="h-4 w-4" /> Scan to check in</Button>} />

            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Show">
                {[{ k: 'upcoming', label: 'Upcoming', n: upcoming.length }, { k: 'past', label: 'Past', n: past.length }, { k: 'calendar', label: 'Calendar' }].map((t) => (
                    <button key={t.k} type="button" aria-pressed={filter === t.k} onClick={() => setFilter(t.k)}
                        className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                            filter === t.k ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
                        {t.k === 'calendar' && <CalendarDays aria-hidden="true" className="h-4 w-4" />}{t.label}{t.n != null && <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{t.n}</span>}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>
            ) : filter === 'calendar' ? (
                <EventCalendar events={meetings} renderEvents={(day) => <div className="grid gap-4 xl:grid-cols-2">{day.map(renderCard)}</div>} />
            ) : shown.length === 0 ? (
                <EmptyState icon={CalendarDays} title={filter === 'past' ? 'No past events yet' : 'Nothing scheduled yet'}
                    description={filter === 'upcoming' ? 'New events from the SK will appear here. Check back soon.' : 'Events you attended will show up here.'} />
            ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {shown.map(renderCard)}
                </div>
            )}

            <Modal open={scan} onClose={() => setScan(false)} title="Scan check-in QR" size="md"
                footer={<Button variant="ghost" onClick={() => setScan(false)}>Cancel</Button>}>
                <div className="space-y-3">
                    <p className="text-center text-sm text-muted">Point your camera at the QR shown by your SK Officer.</p>
                    {scan && <QRScanner onDecode={(token) => checkinM.mutate(token)} />}
                    {checkinM.isPending && <div className="flex justify-center"><Spinner className="h-6 w-6 text-primary" /></div>}
                </div>
            </Modal>

            <SaloobinModal
                meetingId={saloobin?._id}
                meetingTitle={saloobin?.title}
                open={!!saloobin}
                onClose={() => setSaloobin(null)}
            />
        </div>
    );
}