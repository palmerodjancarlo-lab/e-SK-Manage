// Progress/proof photos of a program — kabataan see them on their Programs page.
// Any SK officer can add photos (same rule as the API); removing is for the Chairperson.
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Trash2, ImageOff } from 'lucide-react';
import api from '../../lib/api';
import { Button, Input } from '../ui';

const MAX = 10 * 1024 * 1024;

export default function PhotosPanel({ program, canManage, onChanged }) {
  const fileRef = useRef(null);
  const [caption, setCaption] = useState('');
  const photos = program.photos || [];

  const addM = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/ppa-photo', fd, { timeout: 90000 });
      return api.post(`/programs/program/${program._id}/photos`, { url: data.url, caption: caption.trim() });
    },
    onSuccess: () => { toast.success('Photo added — kabataan can see it now.'); setCaption(''); onChanged(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not upload the photo.'),
  });
  const delM = useMutation({
    mutationFn: (id) => api.delete(`/programs/program/${program._id}/photos/${id}`),
    onSuccess: () => { toast.success('Photo removed.'); onChanged(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not remove the photo.'),
  });

  const choose = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX) return toast.error('That photo is over 10 MB.');
    addM.mutate(f);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Opening day at the covered court" />
        <Button onClick={() => fileRef.current?.click()} loading={addM.isPending}><ImagePlus className="h-4 w-4" /> Add photo</Button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={choose} />
      </div>

      {photos.length === 0 ? (
        <p className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          <ImageOff aria-hidden="true" className="h-8 w-8 text-subtle" /> No photos yet. Photos show kabataan the program is really happening.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p._id || p.url} className="group relative overflow-hidden rounded-xl border border-border bg-surface2">
              <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.caption || program.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /></a>
              {p.caption && <p className="truncate px-2 py-1.5 text-xs text-muted">{p.caption}</p>}
              {canManage && p._id && (
                <button type="button" onClick={() => { if (window.confirm('Remove this photo?')) delM.mutate(p._id); }}
                  aria-label={`Remove photo${p.caption ? ` ${p.caption}` : ''}`}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-surface/90 text-danger shadow-card transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
