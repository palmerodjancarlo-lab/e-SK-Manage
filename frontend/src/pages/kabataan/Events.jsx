import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { QrCode, Check, MapPin, Star, CalendarDays, CalendarCheck, MessageCircleHeart, HandHeart } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Button, Modal } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';
import SaloobinModal from '../../components/kabataan/SaloobinModal';

const fmtDT = (d) => new Date(d).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function DateBlock({ date, muted }) {
    const d = new Date(date);
    return (
        <div className={cn('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center',
            muted ? 'bg-surface2 text-muted' : 'bg-primary/12 text-primary')}>
            <span className="text-[10px] font-bold uppercase tracking-wide">{d.toLocaleDateString('en-PH', { month: 'short' })}</span>
            <span className="text-xl font-bold leading-none">{d.getDate()}</span>
        </div>
    );
}

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
    const [scan, setScan] = useState(false);
    const [filter, setFilter] = useState('upcoming');
    const [saloobin, setSaloobin] = useState(null);

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ['sk-meetings-all'],
        queryFn: async () => {
            const list = (await api.get('/meetings')).data.meetings || [];
            const now = Date.now();
            return list.map((m) => ({ ...m, _past: new Date(m.date).getTime() < now }))
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
            toast.success(r.data.message || `Checked in! +${r.data.pointsAwarded || ''} pts`);
            setScan(false);
            qc.invalidateQueries({ queryKey: ['sk-meetings-all'] });
            qc.invalidateQueries({ queryKey: ['my-points'] });
            qc.invalidateQueries({ queryKey: ['points-history'] });
        },
        onError: (e) => { toast.error(e.response?.data?.message || 'Check-in failed.'); setScan(false); },
    });

    const mine = (arr) => (arr || []).some((x) => (x.user?._id || x.user) === user?._id);
    const shown = meetings.filter((m) => (filter === 'past' ? m._past : !m._past));
    const upcomingCount = meetings.filter((m) => !m._past).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-fg">Events</h1>
                <p className="mt-1 text-sm text-muted">Join SK events, RSVP, volunteer, and check in to earn points.</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-xl border border-border bg-surface p-1">
                    {[{ k: 'upcoming', label: `Upcoming${upcomingCount ? ` · ${upcomingCount}` : ''}` }, { k: 'past', label: 'Past' }].map((t) => (
                        <button key={t.k} onClick={() => setFilter(t.k)}
                            className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                                filter === t.k ? 'bg-primary text-primary-fg shadow-card' : 'text-muted hover:text-fg')}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <Button onClick={() => setScan(true)}><QrCode className="h-4 w-4" /> Scan to check in</Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
            ) : shown.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center py-14 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <CalendarDays className="h-7 w-7" />
                        </div>
                        <p className="font-bold text-fg">No {filter} events</p>
                        <p className="mt-1 max-w-xs text-sm text-muted">
                            {filter === 'upcoming' ? 'New events from the SK will appear here. Check back soon.' : 'Events you attended will show up here.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {shown.map((m) => {
                        const going = mine(m.rsvp);
                        const checkedIn = mine(m.checkedIn);
                        const vols = m.volunteers || [];
                        const volunteering = mine(vols);
                        const slots = m.volunteerSlots || 0;
                        const full = slots > 0 && vols.length >= slots && !volunteering;
                        return (
                            <Card key={m._id} className={m._past ? 'opacity-75' : ''}>
                                <CardContent className="flex gap-4">
                                    <DateBlock date={m.date} muted={m._past} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="primary">{m.type}</Badge>
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star className="h-3 w-3" /> +{m.pointsReward ?? 10}</span>
                                        </div>
                                        <h3 className="mt-1.5 font-bold text-fg">{m.title}</h3>
                                        <p className="text-sm text-muted">{fmtDT(m.date)}</p>
                                        {m.location && <p className="flex items-center gap-1 text-sm text-subtle"><MapPin className="h-3.5 w-3.5" /> {m.location}</p>}
                                        {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>}

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {checkedIn ? <Badge variant="success"><Check className="h-3 w-3" /> Checked in</Badge>
                                                : m._past ? <Badge variant="default">Ended</Badge>
                                                    : <Button size="sm" variant={going ? 'ghost' : 'outline'} loading={rsvpM.isPending} onClick={() => rsvpM.mutate(m._id)}>
                                                        <CalendarCheck className="h-4 w-4" /> {going ? 'Going ✓' : 'RSVP'}
                                                    </Button>}
                                            {m._past && (
                                                <Button size="sm" variant="outline" onClick={() => setSaloobin(m)}>
                                                    <MessageCircleHeart className="h-4 w-4" /> Saloobin
                                                </Button>
                                            )}
                                        </div>

                                        {/* Volunteer sign-up — upcoming events only */}
                                        {!m._past && m.needsVolunteers && (
                                            <div className="mt-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1 text-xs font-bold text-accent">
                                                            <HandHeart className="h-3.5 w-3.5" /> Volunteers needed
                                                        </p>
                                                        {m.volunteerRole && <p className="truncate text-xs text-fg">{m.volunteerRole}</p>}
                                                        <p className="text-xs text-muted">
                                                            {vols.length}{slots > 0 ? ` / ${slots}` : ''} signed up
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant={volunteering ? 'ghost' : 'outline'}
                                                        loading={volunteerM.isPending}
                                                        disabled={full}
                                                        onClick={() => volunteerM.mutate(m._id)}
                                                    >
                                                        <HandHeart className="h-4 w-4" />
                                                        {volunteering ? 'Volunteering ✓' : full ? 'Slots full' : 'Volunteer'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
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