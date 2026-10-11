// src/pages/kabataan/Profile.jsx — kabataan profile & settings
// cspell:words kabataan Tawiran
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ShieldCheck, ShieldAlert, Camera, IdCard, Lock, Star, History, Upload, UserRound, Palette, BadgeCheck, TrendingUp, Gift, Hourglass,
} from 'lucide-react';
import api from '../../lib/api';
import { Spinner, Button, Input, Select, Modal, AnimatedNumber } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';
import { ID_TYPES, OTHER_ID, ID_FILE_ACCEPT, hasSubmittedId } from '../../lib/residency';
import IdDocumentViewer from '../../components/account/IdDocumentViewer';
import ChangeEmailCard from '../../components/account/ChangeEmailCard';
import SettingsShell from '../../components/account/SettingsShell';
import SettingsCard from '../../components/account/SettingsCard';
import ProfileForm from '../../components/account/ProfileForm';
import PasswordCard from '../../components/account/PasswordCard';
import AppearanceCard from '../../components/account/AppearanceCard';
import AccountCard from '../../components/account/AccountCard';

const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export default function KabProfile() {
    const { user, setUser } = useAuth();
    const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
    const points = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
    const p = profile.data || user || {};

    if (profile.isLoading) {
        return <div className="flex justify-center py-24" role="status"><Spinner className="h-8 w-8 text-primary" /><span className="sr-only">Loading your profile…</span></div>;
    }

    const submitted = hasSubmittedId(p);
    const TABS = [
        { key: 'profile', label: 'Profile', icon: UserRound, description: 'Name, contact and address' },
        { key: 'residency', label: 'Residency', icon: IdCard, description: p.idVerified ? 'Verified resident' : submitted ? 'Waiting for review' : 'Upload any valid ID', badge: !p.idVerified && !submitted ? '!' : undefined },
        { key: 'activity', label: 'Points & activity', icon: History, description: 'Your points history' },
        { key: 'security', label: 'Sign-in & security', icon: Lock, description: 'Email and password' },
        { key: 'appearance', label: 'Appearance', icon: Palette, description: 'Light or dark theme' },
        { key: 'account', label: 'Account', icon: BadgeCheck, description: 'Sign out or delete' },
    ];

    const chips = (
        <>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface2 px-2.5 py-1 text-xs font-semibold text-fg">
                <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current text-accent" /> <AnimatedNumber value={points.data?.balance ?? 0} /> points
            </span>
            <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold', p.idVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                {p.idVerified ? <><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" /> Verified resident</> : <><ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" /> {submitted ? 'Verification pending' : 'Not yet verified'}</>}
            </span>
        </>
    );

    return (
        <SettingsShell
            plain
            me={p}
            eyebrow="Kabataan ng Tawiran · My profile"
            chips={chips}
            tabs={TABS}
            render={(tab) => ({
                profile: <ProfileForm key={p._id} me={p} />,
                residency: <ResidencyCard p={p} onSaved={(u) => setUser?.(u)} />,
                activity: <PointsHistory balance={points.data?.balance ?? 0} />,
                security: <><ChangeEmailCard /><PasswordCard /></>,
                appearance: <AppearanceCard />,
                account: <AccountCard me={p} roleLabel="Kabataan member" allowDelete />,
            }[tab])}
        />
    );
}

/* Points earned and redeemed, newest first */
function PointsHistory({ balance }) {
    const history = useQuery({ queryKey: ['points-history'], queryFn: async () => (await api.get('/points/history')).data.history });
    const rows = history.data || [];
    const earned = rows.filter((h) => h.type === 'earned' || h.type === 'awarded').reduce((s, h) => s + (h.pointsEarned || 0), 0);
    const waiting = rows.filter((h) => h.type === 'held').reduce((s, h) => s + (h.pointsEarned || 0), 0);
    const redeemed = rows.filter((h) => h.type === 'redeemed').reduce((s, h) => s + (h.pointsEarned || 0), 0);

    return (
        <SettingsCard icon={History} title="Points & activity" description="Points from events you attended and rewards you redeemed.">
            <dl className="grid grid-cols-3 gap-3">
                {[['Balance', balance, Star, 'text-accent'], ['Earned', earned, TrendingUp, 'text-success'], ['Redeemed', redeemed, Gift, 'text-danger']].map(([label, value, icon, tone]) => {
                    const Icon = icon;
                    return (
                    <div key={label} className="rounded-lg bg-surface2/70 p-3">
                        <dt className="flex items-center gap-1.5 text-xs text-muted"><Icon aria-hidden="true" className={cn('h-3.5 w-3.5', tone)} />{label}</dt>
                        <dd className="mt-1 text-xl font-bold tabular-nums text-fg"><AnimatedNumber value={value} /></dd>
                    </div>
                    );
                })}
            </dl>
            {waiting > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-fg">
                    <Hourglass aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    {waiting} point{waiting === 1 ? ' is' : 's are'} waiting for your residency verification — they’ll be added automatically.
                </p>
            )}
            <div className="mt-5">
                {history.isLoading ? (
                    <div className="flex justify-center py-8" role="status"><Spinner className="h-6 w-6 text-primary" /></div>
                ) : rows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No points yet. Join an SK event and check in to start earning.</p>
                ) : (
                    <ol className="relative space-y-1 border-l-2 border-border pl-5">
                        {rows.map((h) => {
                            const out = h.type === 'redeemed';
                            const held = h.type === 'held';
                            return (
                                <li key={h._id} className="relative rounded-lg px-3 py-2.5 transition-colors hover:bg-surface2/60">
                                    <span aria-hidden="true" className={cn('absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-surface', out ? 'bg-danger' : held ? 'bg-warning' : 'bg-success')} />
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-fg">{h.reason || h.meeting?.title || (out ? 'Reward redeemed' : 'Event check-in')}</p>
                                            <p className="text-xs text-subtle">{fmt(h.checkedInAt || h.createdAt)}{held ? ' · waiting for verification' : ''}</p>
                                        </div>
                                        <span className={cn('shrink-0 text-sm font-bold tabular-nums', out ? 'text-danger' : held ? 'text-warning' : 'text-success')}>{out ? '−' : '+'}{h.pointsEarned}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </SettingsCard>
    );
}

/* Residency: any ID or proof of residency, stored privately and reviewed by the Chairperson */
function ResidencyCard({ p, onSaved }) {
    const submitted = hasSubmittedId(p);
    const knownType = ID_TYPES.includes(p.idType);
    const [choice, setChoice] = useState(p.idType ? (knownType ? p.idType : OTHER_ID) : '');
    const [otherType, setOtherType] = useState(p.idType && !knownType && p.idType !== 'Not specified' ? p.idType : '');
    const [typeError, setTypeError] = useState('');
    const [busy, setBusy] = useState(false);
    const [camOpen, setCamOpen] = useState(false);
    const [replacing, setReplacing] = useState(false);

    const idType = choice === OTHER_ID ? otherType.trim() : choice;
    const ensureType = () => {
        if (idType) return true;
        setTypeError(choice === OTHER_ID ? 'Type the name of your ID or document' : 'Choose the type of ID or document');
        return false;
    };

    const submit = async (file) => {
        if (!file || !ensureType()) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('idType', idType);
            fd.append('file', file);
            const { data } = await api.post('/upload/id', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(data.message);
            setReplacing(false);
            onSaved(data.user);
        } catch (e) { toast.error(e.response?.data?.message || 'Upload failed. Please try again.'); }
        finally { setBusy(false); }
    };

    const showUploader = !p.idVerified && (!submitted || replacing);

    return (
        <SettingsCard icon={IdCard} title="Residency verification" description="Any valid ID or proof that you live in Barangay Tawiran is accepted — a school ID, barangay certificate, birth certificate, or a government ID.">
          <div className="space-y-5">

            {p.idVerified ? (
                <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success"><ShieldCheck className="h-4 w-4" /> Verified resident</div>
            ) : submitted ? (
                <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning"><ShieldAlert className="h-4 w-4" /> Submitted — waiting for review by the SK Chairperson</div>
            ) : null}

            {submitted && (
                <div className="space-y-2">
                    <p className="text-sm text-muted">
                        {p.idType ? <>Submitted: <b className="text-fg">{p.idType}</b></> : 'Submitted document'}
                        {p.idSubmittedAt && <> · {fmt(p.idSubmittedAt)}</>}
                    </p>
                    <IdDocumentViewer key={p.idSubmittedAt || p.idPhoto} endpoint="/auth/id-document" className="max-w-md" />
                    <p className="text-xs text-subtle">Only you and the SK Chairperson can see this document.</p>
                    {!p.idVerified && !replacing && (
                        <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>Replace document</Button>
                    )}
                </div>
            )}

            {showUploader && (
                <div className="max-w-md space-y-4 border-t border-border pt-5">
                    <Select label="Type of ID or document" value={choice} error={choice !== OTHER_ID ? typeError : undefined}
                        onChange={(e) => { setChoice(e.target.value); setTypeError(''); }}>
                        <option value="" disabled>Select…</option>
                        {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        <option value={OTHER_ID}>Other (type it in)</option>
                    </Select>
                    {choice === OTHER_ID && (
                        <Input label="Name of your ID or document" value={otherType} maxLength={80}
                            error={typeError} placeholder="e.g. Company ID, Certificate of Residency"
                            onChange={(e) => { setOtherType(e.target.value); setTypeError(''); }} />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={busy} onClick={() => ensureType() && setCamOpen(true)}
                            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-primary transition hover:bg-surface2 disabled:opacity-50">
                            {busy ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />} Take a photo
                        </button>
                        <label className={cn('flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-primary transition hover:bg-surface2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40', busy && 'pointer-events-none opacity-50')}>
                            {busy ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Upload photo or PDF
                            <input type="file" accept={ID_FILE_ACCEPT} className="sr-only" disabled={busy}
                                onClick={(e) => { if (!ensureType()) e.preventDefault(); }}
                                onChange={(e) => { submit(e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                    </div>
                    <p className="text-xs text-subtle">Photos (JPG, PNG, HEIC) or PDF, up to 10 MB. Make sure your name and address are readable.</p>
                    {replacing && <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>Keep current document</Button>}
                </div>
            )}

            {camOpen && <CameraModal onClose={() => setCamOpen(false)} onCapture={(file) => { setCamOpen(false); submit(file); }} />}
          </div>
        </SettingsCard>
    );
}

function CameraModal({ onClose, onCapture }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState('');
    useEffect(() => {
        let cancelled = false;
        const attach = (stream) => {
            if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setReady(true);
        };
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(attach)
            .catch(() => navigator.mediaDevices.getUserMedia({ video: true }).then(attach)
                .catch((e) => setErr(e?.name === 'NotAllowedError'
                    ? 'Camera permission is blocked. Allow it in your browser, or use “Upload file”.'
                    : 'No camera found or it is in use. Use “Upload file” instead.')));
        return () => { cancelled = true; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
    }, []);
    const snap = () => {
        const video = videoRef.current; if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob((blob) => { if (blob) onCapture(new File([blob], `id-${Date.now()}.jpg`, { type: 'image/jpeg' })); }, 'image/jpeg', 0.9);
    };
    return (
        <Modal open onClose={onClose} title="Scan your ID" size="md"
            footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!ready} onClick={snap}><Camera className="h-4 w-4" /> Capture</Button></>}>
            {err ? <p className="text-sm font-medium text-danger">{err}</p>
                : <div className="overflow-hidden rounded-xl bg-black"><video ref={videoRef} autoPlay playsInline muted className="w-full" /></div>}
            <p className="mt-2 text-center text-xs text-muted">Hold your ID steady inside the frame, then tap Capture.</p>
        </Modal>
    );
}