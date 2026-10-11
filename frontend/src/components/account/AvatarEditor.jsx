// components/account/AvatarEditor.jsx — crop a new profile photo before uploading
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Modal, Button } from '../ui';

/** Square crop + zoom for profile photos (no external library). Drag to move, slider to zoom. */
export default function AvatarEditor({ file, uploading, onCancel, onConfirm }) {
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
