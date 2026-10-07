import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeProvider';
import { cn } from '../../lib/utils';

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-fg',
        className
      )}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
