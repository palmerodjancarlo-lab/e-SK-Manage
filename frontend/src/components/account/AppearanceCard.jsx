// components/account/AppearanceCard.jsx — light / dark theme with live previews
import { Check, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeProvider';
import { cn } from '../../lib/utils';
import SettingsCard from './SettingsCard';

// A tiny picture of the app in each theme
function Preview({ dark }) {
  const c = dark
    ? { bg: '#0f172a', side: '#1e293b', card: '#1e293b', line: '#334155', text: '#cbd5e1', accent: '#60a5fa' }
    : { bg: '#f8fafc', side: '#ffffff', card: '#ffffff', line: '#e2e8f0', text: '#475569', accent: '#1d4ed8' };
  return (
    <div aria-hidden="true" className="flex h-28 overflow-hidden rounded-md border" style={{ background: c.bg, borderColor: c.line }}>
      <div className="w-1/4 space-y-1.5 border-r p-2" style={{ background: c.side, borderColor: c.line }}>
        <div className="h-2 w-3/4 rounded" style={{ background: c.accent }} />
        {[0, 1, 2].map((i) => <div key={i} className="h-1.5 rounded" style={{ background: c.line }} />)}
      </div>
      <div className="flex-1 space-y-2 p-2.5">
        <div className="h-5 rounded" style={{ background: '#0F2740' }} />
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1 rounded border p-1.5" style={{ background: c.card, borderColor: c.line }}>
              <div className="h-1.5 w-1/2 rounded" style={{ background: c.text, opacity: 0.5 }} />
              <div className="h-2.5 w-3/4 rounded" style={{ background: c.text }} />
            </div>
          ))}
        </div>
        <div className="h-1.5 w-1/3 rounded" style={{ background: c.accent }} />
      </div>
    </div>
  );
}

const OPTIONS = [
  { value: 'light', label: 'Light', note: 'Bright and clear in daylight' },
  { value: 'dark', label: 'Dark', note: 'Easier on the eyes at night' },
];

export default function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  return (
    <SettingsCard icon={Palette} title="Appearance" description="Choose how e-SK Manage looks on this device.">
      <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(o.value)}
              className={cn('group rounded-xl border-2 p-3 text-left transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}
            >
              <Preview dark={o.value === 'dark'} />
              <span className="mt-3 flex items-center justify-between gap-2">
                <span>
                  <span className="block text-sm font-semibold text-fg">{o.label}</span>
                  <span className="block text-xs text-muted">{o.note}</span>
                </span>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  active ? 'border-primary bg-primary text-primary-fg' : 'border-border')}>
                  {active && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-subtle">Saved on this device. Animations follow your device’s “Reduce motion” setting.</p>
    </SettingsCard>
  );
}
