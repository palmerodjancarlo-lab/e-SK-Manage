// components/account/SettingsShell.jsx — the frame every settings screen shares
// Profile banner (with photo change) + section navigation + section content.
// The open section lives in the URL (?tab=security), so it survives refresh,
// can be linked to, and the browser back button works.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-store';
import { Avatar, BrandBanner } from '../ui';
import AvatarEditor from './AvatarEditor';

function AvatarButton({ me, plain }) {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const upload = async (cropped) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', cropped);
      const { data } = await api.post('/upload/photo', fd);
      const { data: res } = await api.put('/auth/profile', { photo: data.url });
      // cache-bust so every avatar on screen reloads, even if the URL is unchanged
      const photo = res.user?.photo ? `${res.user.photo}${res.user.photo.includes('?') ? '&' : '?'}t=${Date.now()}` : '';
      setUser?.({ ...res.user, photo });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile photo updated.');
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload the photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <span className={cn('block rounded-full ring-4', plain ? 'ring-primary/15' : 'ring-white/25')}>
        <Avatar src={me.photo} name={`${me.firstName || ''} ${me.lastName || ''}`} size="xl" className={cn('h-20 w-20 text-xl ring-0 sm:h-24 sm:w-24', plain ? '' : 'bg-white text-brand')} />
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile photo"
        title="Change profile photo"
        className={cn('absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full shadow-pop transition-transform hover:scale-105', plain ? 'bg-primary text-primary-fg' : 'bg-white text-brand')}
      >
        {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Camera aria-hidden="true" className="h-4 w-4" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f); }} />
      {file && <AvatarEditor file={file} uploading={busy} onCancel={() => setFile(null)} onConfirm={upload} />}
    </div>
  );
}

/**
 * @param me       the signed-in user's profile
 * @param eyebrow  small line above the name (e.g. "SK Console · Settings")
 * @param chips    extra status pills shown under the name
 * @param tabs     [{ key, label, icon, description, badge? }]
 * @param render   (tabKey) => section content
 */
// plain: a light header card instead of the navy banner (kabataan portal)
export default function SettingsShell({ me, eyebrow, chips, tabs, render, plain = false }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = tabs.some((t) => t.key === requested) ? requested : tabs[0].key;
  const open = (key) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', key); return n; });

  // On phones the section pills scroll sideways — keep the open one in view
  // (scroll only the strip itself — scrollIntoView would also shift the page)
  const stripRef = useRef(null);
  const activeRef = useRef(null);
  useEffect(() => {
    const strip = stripRef.current, item = activeRef.current;
    if (!strip || !item || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: item.offsetLeft - (strip.clientWidth - item.clientWidth) / 2, behavior: 'smooth' });
  }, [tab]);

  return (
    <div className="space-y-6">
      {(() => {
        const head = (
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <AvatarButton me={me} plain={plain} />
            <div className="min-w-0">
              <p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', plain ? 'text-subtle' : 'text-white/70')}>{eyebrow}</p>
              <h1 className={cn('mt-1 truncate text-2xl font-bold sm:text-3xl', plain && 'text-fg')}>{me.firstName} {me.lastName}</h1>
              <p className={cn('truncate text-sm', plain ? 'text-muted' : 'text-white/75')}>{me.email}</p>
              {chips && <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">{chips}</div>}
            </div>
          </div>
        );
        return plain
          ? <div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">{head}</div>
          : <BrandBanner>{head}</BrandBanner>;
      })()}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Section navigation: a list on desktop, scrollable pills on phones */}
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ul ref={stripRef} className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:gap-1 [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = t.key === tab;
              return (
                <li key={t.key} ref={active ? activeRef : undefined} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => open(t.key)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors lg:border-transparent',
                      active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-surface text-muted hover:bg-surface2 hover:text-fg lg:bg-transparent',
                    )}
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                      active ? 'bg-primary text-primary-fg' : 'bg-surface2 text-muted group-hover:text-fg')}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-sm font-semibold">{t.label}</span>
                      {t.description && <span className="hidden truncate text-xs font-normal text-subtle lg:block">{t.description}</span>}
                    </span>
                    {t.badge != null && <span className="ml-auto rounded-md bg-warning px-1.5 text-xs font-bold text-warning-fg">{t.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div key={tab} className="min-w-0 animate-page-in space-y-6">{render(tab)}</div>
      </div>
    </div>
  );
}
