// Points a member earned before their residency was verified. They are kept and
// added to the balance automatically once the SK Chairperson verifies them.
import { Link } from 'react-router-dom';
import { Hourglass, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function HeldPointsNote({ held, className }) {
  if (!held) return null;
  return (
    <Link to="/kabataan/profile?tab=residency"
      className={cn('flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm transition-colors hover:bg-warning/15', className)}>
      <Hourglass aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-fg">{held} point{held === 1 ? '' : 's'} waiting for you</span>
        <span className="block text-muted">From events you checked in to. They’re added to your account once the SK Chairperson verifies your residency.</span>
      </span>
      <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
