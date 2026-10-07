// config/pointsPolicy.js
// Priority Points Policy — extra points for priority/marginalized youth,
// in line with the SK/KK mandate to encourage inclusive participation.
// Base points (from QR check-in, activity attendance, or an officer award)
// receive a bonus multiplier when a member meets one or more conditions.
//
// finalPoints = round( basePoints * (1 + sum of applicable bonuses) )

// Age from birthDate (null-safe)
function ageFrom(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// Priority rules. bonus is a fraction (0.50 = +50%).
// Edit the percentages or add/remove rules here — no logic changes needed.
const RULES = [
  { key: 'pwd',       label: 'PWD',       bonus: 0.50, applies: (u) => !!u.isPWD },
  { key: 'age_15_17', label: 'Age 15–17', bonus: 0.30, applies: (u, age) => age != null && age >= 15 && age <= 17 },
  { key: 'age_25_30', label: 'Age 25–30', bonus: 0.20, applies: (u, age) => age != null && age >= 25 && age <= 30 },
];

// Compute priority-adjusted points for a user.
// Returns { finalPoints, bonusPoints, totalBonus, applied:[{key,label,bonus}], reason }
function computePriorityPoints(basePoints, user) {
  const base = Math.max(0, Math.round(Number(basePoints) || 0));
  if (!user || base === 0) {
    return { finalPoints: base, bonusPoints: 0, totalBonus: 0, applied: [], reason: `Base ${base}` };
  }

  const age = ageFrom(user.birthDate);
  const applied = RULES.filter((r) => {
    try { return r.applies(user, age); } catch { return false; }
  });

  const totalBonus = applied.reduce((s, r) => s + r.bonus, 0);
  const finalPoints = Math.round(base * (1 + totalBonus));
  const bonusPoints = finalPoints - base;

  const reason = applied.length
    ? [`Base ${base}`, ...applied.map((r) => `${r.label} +${Math.round(r.bonus * 100)}%`)].join(' + ') + ` = ${finalPoints}`
    : `Base ${base}`;

  return { finalPoints, bonusPoints, totalBonus, applied, reason };
}

module.exports = { computePriorityPoints, ageFrom, RULES };