// Shared look for SK programs (PPAs) across the consoles and the kabataan portal.
import { Users, HeartPulse, Briefcase, GraduationCap, Leaf, Trophy, ShieldHalf, Shapes } from 'lucide-react';

export const PROGRAM_STATUSES = ['planned', 'ongoing', 'completed', 'cancelled'];

const CAT_ICON = {
  'Youth Development': Users, Health: HeartPulse, Livelihood: Briefcase, Education: GraduationCap,
  Environment: Leaf, Sports: Trophy, 'Peace and Order': ShieldHalf,
};
export const programIcon = (category) => CAT_ICON[category] || Shapes;

// Status = a coloured dot + the word (never colour alone)
export const STATUS_DOT = { planned: 'bg-info', ongoing: 'bg-warning', completed: 'bg-success', cancelled: 'bg-danger' };
export const statusLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Planned');

// Latest % complete from the progress log (updates are oldest first), or null
export const latestProgress = (p) => {
  const withPct = (p?.progressUpdates || p?.updates || []).filter((u) => u.progress != null);
  if (!withPct.length) return null;
  return p.updates ? withPct[0].progress : withPct[withPct.length - 1].progress; // public feed is newest first
};
