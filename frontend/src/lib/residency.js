// lib/residency.js — residency (ID) verification helpers shared by member and admin screens

// Any of these — or anything else via "Other" — is accepted. Not every young
// person has a government ID, so school and barangay documents count too.
export const ID_TYPES = [
  'PhilSys National ID / ePhilID',
  'School ID',
  'Barangay ID',
  'Barangay Certificate / Clearance',
  'PSA Birth Certificate',
  "Voter's ID / Voter's Certification",
  'Postal ID',
  "Driver's License",
  'Passport',
  'UMID / SSS / GSIS ID',
  'PhilHealth ID',
  'TIN ID',
  'PWD ID',
  'School Enrollment / Registration Form',
];

export const OTHER_ID = 'Other';

// File picker filter: phone photos (incl. iPhone HEIC) and PDF scans
export const ID_FILE_ACCEPT = 'image/*,.heic,.heif,application/pdf';

// A member has submitted something if they have a private document or a legacy photo
export const hasSubmittedId = (u) => Boolean(u?.idSubmittedAt || u?.idPhoto);
