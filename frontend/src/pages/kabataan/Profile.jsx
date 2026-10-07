import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ShieldCheck, ShieldAlert, Camera, IdCard, KeyRound, Star, History, Upload, User as UserIcon, Minus, Plus,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Button, Input, Select, Modal } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';

const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const ageOf = (b) => (b ? Math.floor((Date.now() - new Date(b).getTime()) / 3.15576e10) : null);
const HERO = { background: 'linear-gradient(135deg,#2f68f0 0%,#1e63c9 45%,#0ea5a5 120%)' };

const SETTINGS = [
    { key: 'personal', label: 'Personal info', icon: UserIcon },
    { key: 'residency', label: 'Residency', icon: IdCard },
    { key: 'security', label: 'Security', icon: KeyRound },
    { key: 'activity', label: 'Activity', icon: History },
];

export default function KabProfile() {
    const { setUser } = useAuth();
    const qc = useQueryClient();
    const [tab, setTab] = useState('personal');

    const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
    const points = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
    const history = useQuery({ queryKey: ['points-history'], queryFn: async () => (await api.get('/points/history')).data.history });

    const p = profile.data;
    const refresh = () => qc.invalidateQueries({ queryKey: ['profile'] });

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingId, setUploadingId] = useState(false);
    const [camOpen, setCamOpen] = useState(false);
    const [editorFile, setEditorFile] = useState(null);

    const uploadTo = async (endpoint, file, field, setBusy) => {
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            const { data: res } = await api.put('/auth/profile', { [field]: data.url });
            setUser?.(res.user); refresh(); toast.success('Saved.');
        } catch (e) { toast.error(e.response?.data?.message || 'Upload failed.'); }
        finally { setBusy(false); }
    };

    if (profile.isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-primary" /></div>;
    const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-pop" style={HERO}>
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10" />
                <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                    <div className="relative">
                        <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-white/20 text-2xl font-extrabold">
                            {p.photo ? <img src={p.photo} alt="" className="h-full w-full object-cover" /> : initials}
                        </span>
                        <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-card">
                            {uploadingAvatar ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                            <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditorFile(f); e.target.value = ''; }} />
                        </label>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-extrabold">{p.firstName} {p.lastName}</h1>
                        <p className="text-sm opacity-85">{p.email}</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-3 py-1 text-[13px] font-bold"><Star className="h-4 w-4" /> {points.data?.balance ?? 0} pts</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-3 py-1 text-[13px] font-bold">
                                {p.idVerified ? <><ShieldCheck className="h-4 w-4" /> Verified</> : <><ShieldAlert className="h-4 w-4" /> {p.idPhoto ? 'Pending' : 'Unverified'}</>}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col">
                    {SETTINGS.map((s) => (
                        <button key={s.key} onClick={() => setTab(s.key)}
                            className={cn('flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition lg:justify-start lg:px-3.5',
                                tab === s.key ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-surface2 hover:text-fg')}>
                            <s.icon className="h-4 w-4" /> {s.label}
                        </button>
                    ))}
                </div>

                <div className="min-w-0">
                    {tab === 'personal' && <DetailsForm p={p} onSaved={(u) => { setUser?.(u); refresh(); }} />}

                    {tab === 'residency' && (
                        <Card><CardContent className="space-y-4">
                            <h2 className="font-bold text-fg">Residency verification</h2>
                            {p.idVerified ? (
                                <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success"><ShieldCheck className="h-4 w-4" /> Verified resident</div>
                            ) : p.idPhoto ? (
                                <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning"><ShieldAlert className="h-4 w-4" /> Pending review by the SK Chairperson</div>
                            ) : (
                                <p className="text-sm text-muted">Scan or upload a photo of your ID / residency proof so the SK can verify you live in Barangay Tawiran.</p>
                            )}
                            {p.idPhoto && <img src={p.idPhoto} alt="ID" className="w-full max-w-sm rounded-xl border border-border object-cover" />}
                            {!p.idVerified && (
                                <div className="grid max-w-sm grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setCamOpen(true)}
                                        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-primary transition hover:bg-surface2">
                                        {uploadingId ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />} Scan with camera
                                    </button>
                                    <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-primary transition hover:bg-surface2">
                                        {uploadingId ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Upload file
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadTo('/upload/id', e.target.files?.[0], 'idPhoto', setUploadingId)} />
                                    </label>
                                </div>
                            )}
                        </CardContent></Card>
                    )}

                    {tab === 'security' && <PasswordCard />}

                    {tab === 'activity' && (
                        <Card><CardContent className="space-y-2">
                            <h2 className="mb-2 font-bold text-fg">Points history</h2>
                            {history.isLoading ? <Spinner className="mx-auto h-6 w-6 text-primary" />
                                : (history.data || []).length === 0 ? <p className="text-sm text-muted">No points yet. Join an event to start earning!</p>
                                    : history.data.map((h) => (
                                        <div key={h._id} className="flex items-center justify-between rounded-xl bg-surface2/60 px-3 py-2.5">
                                            <div><p className="text-sm font-medium text-fg">{h.reason || h.meeting?.title || (h.type === 'earned' ? 'Event check-in' : h.type)}</p><p className="text-xs text-subtle">{fmt(h.checkedInAt || h.createdAt)}</p></div>
                                            <Badge variant={h.type === 'redeemed' ? 'danger' : 'success'}>{h.type === 'redeemed' ? '-' : '+'}{h.pointsEarned}</Badge>
                                        </div>
                                    ))}
                        </CardContent></Card>
                    )}
                </div>
            </div>

            {editorFile && (
                <ImageEditor file={editorFile} uploading={uploadingAvatar}
                    onCancel={() => setEditorFile(null)}
                    onConfirm={async (cropped) => { await uploadTo('/upload/photo', cropped, 'photo', setUploadingAvatar); setEditorFile(null); }} />
            )}
            {camOpen && <CameraModal onClose={() => setCamOpen(false)} onCapture={(file) => { setCamOpen(false); uploadTo('/upload/id', file, 'idPhoto', setUploadingId); }} />}
        </div>
    );
}

/* Crop + zoom editor (square, no external library) */
function ImageEditor({ file, uploading, onCancel, onConfirm }) {
    const V = 288, O = 512;
    const canvasRef = useRef(null);
    const img = useRef(null);
    const base = useRef(1);
    const off = useRef({ x: 0, y: 0 });
    const zoom = useRef(1);
    const drag = useRef(null);
    const [z, setZ] = useState(1);
    const [ready, setReady] = useState(false);

    const clampDraw = () => {
        const c = canvasRef.current; if (!c || !img.current) return;
        const s = base.current * zoom.current;
        const w = img.current.width * s, h = img.current.height * s;
        off.current.x = Math.min(0, Math.max(V - w, off.current.x));
        off.current.y = Math.min(0, Math.max(V - h, off.current.y));
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, V, V);
        ctx.drawImage(img.current, off.current.x, off.current.y, w, h);
    };

    useEffect(() => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
            img.current = im;
            base.current = Math.max(V / im.width, V / im.height);
            off.current = { x: (V - im.width * base.current) / 2, y: (V - im.height * base.current) / 2 };
            setReady(true);
            clampDraw();
        };
        im.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const pt = (e) => { const t = e.touches?.[0]; return { x: t ? t.clientX : e.clientX, y: t ? t.clientY : e.clientY }; };
    const down = (e) => { const p = pt(e); drag.current = { x: p.x, y: p.y }; };
    const move = (e) => { if (!drag.current) return; const p = pt(e); off.current.x += p.x - drag.current.x; off.current.y += p.y - drag.current.y; drag.current = { x: p.x, y: p.y }; clampDraw(); };
    const up = () => { drag.current = null; };
    const onZoom = (e) => { zoom.current = Number(e.target.value); setZ(zoom.current); clampDraw(); };

    const confirm = () => {
        const oc = document.createElement('canvas'); oc.width = O; oc.height = O;
        const r = O / V, s = base.current * zoom.current * r;
        oc.getContext('2d').drawImage(img.current, off.current.x * r, off.current.y * r, img.current.width * s, img.current.height * s);
        oc.toBlob((b) => { if (b) onConfirm(new File([b], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })); }, 'image/jpeg', 0.9);
    };

    return (
        <Modal open onClose={onCancel} title="Adjust your photo" size="sm"
            footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button loading={uploading} disabled={!ready} onClick={confirm}>Save photo</Button></>}>
            <div className="flex flex-col items-center gap-4">
                <div className="overflow-hidden rounded-full border border-border" style={{ width: V, height: V }}>
                    <canvas ref={canvasRef} width={V} height={V}
                        onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
                        onTouchStart={down} onTouchMove={move} onTouchEnd={up}
                        className="touch-none cursor-grab active:cursor-grabbing" />
                </div>
                <div className="flex w-full max-w-[288px] items-center gap-3">
                    <Minus className="h-4 w-4 text-subtle" />
                    <input type="range" min="1" max="3" step="0.01" value={z} onChange={onZoom} className="flex-1 accent-primary" />
                    <Plus className="h-4 w-4 text-subtle" />
                </div>
                <p className="text-xs text-subtle">Drag to reposition · slide to zoom</p>
            </div>
        </Modal>
    );
}

function DetailsForm({ p, onSaved }) {
    const [form, setForm] = useState({
        firstName: p.firstName || '', lastName: p.lastName || '',
        contactNumber: p.contactNumber || '', purok: p.purok || '', address: p.address || '',
        sex: p.sex || '', civilStatus: p.civilStatus || '',
    });
    const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    const m = useMutation({
        mutationFn: (payload) => api.put('/auth/profile', payload),
        onSuccess: (r) => { toast.success('Profile updated.'); onSaved(r.data.user); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
    });
    const submit = (e) => { e.preventDefault(); m.mutate(form); };
    return (
        <Card><CardContent>
            <h2 className="mb-4 font-bold text-fg">Personal information</h2>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="First name" name="firstName" value={form.firstName} onChange={on} />
                    <Input label="Last name" name="lastName" value={form.lastName} onChange={on} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select label="Sex" name="sex" value={form.sex} onChange={on}>
                        <option value="">Prefer not to say</option><option value="Male">Male</option><option value="Female">Female</option>
                    </Select>
                    <Select label="Civil status" name="civilStatus" value={form.civilStatus} onChange={on}>
                        <option value="">Prefer not to say</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option><option value="Separated">Separated</option>
                    </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Contact number" name="contactNumber" value={form.contactNumber} onChange={on} />
                    <Input label="Purok" name="purok" value={form.purok} onChange={on} />
                </div>
                <Input label="Complete address" name="address" value={form.address} onChange={on} />
                <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-subtle">
                    <span>Age: <b className="text-fg">{ageOf(p.birthDate) ?? '—'}</b></span>
                    <Button type="submit" loading={m.isPending}>Save changes</Button>
                </div>
            </form>
        </CardContent></Card>
    );
}

function PasswordCard() {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    const m = useMutation({
        mutationFn: (payload) => api.put('/auth/change-password', payload),
        onSuccess: () => { toast.success('Password changed.'); setForm({ currentPassword: '', newPassword: '', confirm: '' }); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
    });
    const submit = (e) => {
        e.preventDefault();
        if (form.newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
        if (form.newPassword !== form.confirm) return toast.error('Passwords do not match.');
        m.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    };
    return (
        <Card><CardContent>
            <h2 className="mb-4 font-bold text-fg">Change password</h2>
            <form onSubmit={submit} className="space-y-4">
                <Input label="Current password" name="currentPassword" type="password" value={form.currentPassword} onChange={on} autoComplete="current-password" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="New password" name="newPassword" type="password" value={form.newPassword} onChange={on} autoComplete="new-password" />
                    <Input label="Confirm new" name="confirm" type="password" value={form.confirm} onChange={on} autoComplete="new-password" />
                </div>
                <Button type="submit" loading={m.isPending}>Update password</Button>
            </form>
        </CardContent></Card>
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