// lib/finance.js — shared finance vocabulary (forms, scanner, lists)

export const EXPENSE_CATEGORIES = ['supplies', 'food', 'transportation', 'equipment', 'venue', 'printing', 'honorarium', 'other'];

export const FUND_SOURCES = [
  { value: 'barangay_allocation', label: 'Barangay Allocation' },
  { value: 'donation', label: 'Donation' },
  { value: 'grant', label: 'Grant' },
  { value: 'other', label: 'Other' },
];

export const humanize = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const isPdfUrl = (u) => /\.pdf($|\?)/i.test(u || '');

// An expense not linked to any Program / Project / Activity
export const EMPTY_PPA = { program: '', project: '', activity: '' };
