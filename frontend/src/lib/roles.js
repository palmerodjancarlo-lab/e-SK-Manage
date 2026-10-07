// Central role model — mirrors the backend User ROLES enum.
// 'admin' is legacy and treated identically to sk_chairperson (the head).

export const ROLES = {
  ADMIN: 'admin',
  CHAIR: 'sk_chairperson',
  SECRETARY: 'sk_secretary',
  TREASURER: 'sk_treasurer',
  KAGAWAD: 'sk_kagawad',
  KABATAAN: 'kabataan',
};

export const HEAD_ROLES = [ROLES.ADMIN, ROLES.CHAIR];
export const OFFICER_ROLES = [ROLES.SECRETARY, ROLES.TREASURER, ROLES.KAGAWAD];
export const SK_ROLES = [...HEAD_ROLES, ...OFFICER_ROLES];

export const isHead = (role) => HEAD_ROLES.includes(role);
export const isOfficer = (role) => OFFICER_ROLES.includes(role);
export const isKabataan = (role) => role === ROLES.KABATAAN;

const LABELS = {
  admin: 'SK Chairperson',
  sk_chairperson: 'SK Chairperson',
  sk_secretary: 'SK Secretary',
  sk_treasurer: 'SK Treasurer',
  sk_kagawad: 'SK Kagawad',
  kabataan: 'Kabataan',
};

export const roleLabel = (role) => LABELS[role] || 'Member';

// Where each role lands after signing in.
export const homePath = (role) => {
  if (HEAD_ROLES.includes(role)) return '/admin';
  if (OFFICER_ROLES.includes(role)) return '/sk';
  return '/kabataan';
};
