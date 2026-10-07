// src/lib/permissions.js — who can do what, in one place.
// Roles map to a list of "abilities". Check with can(user, 'finance:record').
// Head (admin / chairperson) can do everything. Keep this the single source of
// truth so pages only ask "can this user do X?" instead of checking roles inline.
// cspell:words kabataan kagawad

export const ABILITIES = {
  // Head Console — chairperson & legacy admin
  admin: ['*'],
  sk_chairperson: ['*'],

  // SK Treasurer — money & points
  sk_treasurer: [
    'finance:view', 'finance:record', 'finance:scan',
    'rewards:view', 'rewards:manage',
    'meetings:view', 'members:view', 'programs:view',
  ],

  // SK Secretary — records & documentation
  sk_secretary: [
    'announcements:view', 'announcements:create',
    'meetings:view', 'meetings:create', 'meetings:minutes',
    'members:view', 'members:manage',
    'programs:view', 'finance:view',
  ],

  // SK Kagawad — programs & committees
  sk_kagawad: [
    'programs:view', 'programs:create', 'programs:manage',
    'meetings:view', 'rewards:view', 'finance:view', 'announcements:view',
  ],

  // Kabataan — transparency / participation (mostly read-only)
  kabataan: [
    'announcements:view', 'finance:view', 'rewards:view',
    'programs:view', 'meetings:view',
  ],
};

// can(user, 'finance:record') -> true/false
export function can(user, ability) {
  const list = ABILITIES[user?.role] || [];
  return list.includes('*') || list.includes(ability);
}

// Optional helper for gating several at once: canAny(user, ['a','b'])
export function canAny(user, abilities = []) {
  return abilities.some((a) => can(user, a));
}