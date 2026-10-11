// Attendance softcopies — Excel (.xlsx) and printable sheets (Print → Save as PDF).
// Used by event attendance, activity attendance, the blank sign-in sheet and the
// attendance summary. The data comes from audit-logged endpoints (personal data).
import * as XLSX from 'xlsx';
import { escHtml, letterhead, printHtml } from './reports';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '');
const fmtShort = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '');
const safe = (s) => String(s || 'attendance').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').slice(0, 60);
const sexShort = (s) => (s === 'Male' ? 'M' : s === 'Female' ? 'F' : '');
const LETTERHEAD_LINES = ['Republic of the Philippines', 'Province of Marinduque', 'Municipality of Santa Cruz', 'BARANGAY TAWIRAN', 'Office of the Sangguniang Kabataan'];

// Build and download a workbook. `blocks` = rows above the table, `head` = header row.
function writeSheet(filename, { title, info = [], head, rows, foot = [], widths }) {
  const aoa = [...LETTERHEAD_LINES.map((l) => [l]), [], [title], ...info.map((l) => [l]), [], head, ...rows, [], ...foot];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  const span = head.length - 1;
  const merge = (r) => ({ s: { r, c: 0 }, e: { r, c: span } });
  ws['!merges'] = [...LETTERHEAD_LINES.map((_, i) => merge(i)), merge(LETTERHEAD_LINES.length + 1), ...info.map((_, i) => merge(LETTERHEAD_LINES.length + 2 + i))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, filename);
}

const signatures = (preparedTitle = 'SK Secretary') => `
  <table style="width:100%;margin-top:40px;border-collapse:collapse;font-size:12px;">
    <tr>
      <td style="width:50%;vertical-align:top;">Prepared by:<br><br><br>______________________________<br>${escHtml(preparedTitle)}</td>
      <td style="width:50%;vertical-align:top;">Noted by:<br><br><br>______________________________<br>SK Chairperson</td>
    </tr>
  </table>`;

const table = (head, rows, widths = []) => `
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;">
    <thead><tr>${head.map((h, i) => `<th style="border:1px solid #333;padding:5px 6px;background:#eef2f7;text-align:left;${widths[i] ? `width:${widths[i]};` : ''}">${escHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #333;padding:6px;height:18px;">${escHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;

const sheetHtml = (heading, infoLines, body) => `
  <div style="font-family:Arial,sans-serif;color:#111;font-size:12px;">
    ${letterhead(heading)}
    <p style="margin:6px 0 0;line-height:1.5;">${infoLines.map((l, i) => (i === 0 ? `<b>${escHtml(l)}</b>` : escHtml(l))).join('<br>')}</p>
    ${body}
  </div>`;

/* ───────── Event attendance (who checked in) ───────── */
const eventInfo = (m) => [
  `${m.title}${m.type ? ` (${m.type})` : ''}`,
  `${fmtDate(m.date)}${m.time ? ` · ${m.time}` : ''}`,
  [m.venue, m.municipality].filter(Boolean).join(', '),
].filter(Boolean);
const pointsNote = (a) => (a.verified ? 'Credited' : 'Held — not yet verified');

export function downloadEventAttendanceXlsx({ meeting, attendees }) {
  writeSheet(`Attendance_${safe(meeting.title)}_${fmtShort(meeting.date).replace(/[ ,]+/g, '-')}.xlsx`, {
    title: 'ATTENDANCE SHEET',
    info: [...eventInfo(meeting), `Total present: ${attendees.length}`],
    head: ['No.', 'Name', 'Purok', 'Sex', 'Age', 'Time in', 'Recorded by', 'Points'],
    rows: attendees.map((a, i) => [i + 1, a.name, a.purok, sexShort(a.sex), a.age ?? '', fmtTime(a.checkedInAt), a.method === 'manual' ? 'Marked by officer' : 'QR scan', pointsNote(a)]),
    foot: [['Prepared by: ______________________  (SK Secretary)'], ['Noted by: ______________________  (SK Chairperson)']],
    widths: [5, 30, 12, 6, 6, 10, 18, 22],
  });
}

export function printEventAttendance({ meeting, attendees }) {
  const rows = attendees.map((a, i) => [i + 1, a.name, a.purok, sexShort(a.sex), a.age ?? '', fmtTime(a.checkedInAt), '']);
  return printHtml(`Attendance – ${meeting.title}`, sheetHtml('ATTENDANCE SHEET', [...eventInfo(meeting), `Total present: ${attendees.length}`],
    table(['No.', 'Name', 'Purok', 'Sex', 'Age', 'Time in', 'Signature'], rows, ['5%', '33%', '13%', '6%', '6%', '11%', '26%']) + signatures()), { portrait: true });
}

/* ───────── Blank sign-in sheet (before the event) ───────── */
export function printSignInSheet({ meeting, rsvps }) {
  const blanks = Math.max(10, 25 - rsvps.length);
  const rows = [
    ...rsvps.map((r, i) => [i + 1, r.name, r.purok, r.age ?? '', '']),
    ...Array.from({ length: blanks }, (_, i) => [rsvps.length + i + 1, '', '', '', '']),
  ];
  return printHtml(`Sign-in sheet – ${meeting.title}`, sheetHtml('ATTENDANCE / SIGN-IN SHEET', eventInfo(meeting),
    `<p style="margin:8px 0 0;font-size:11px;color:#444;">Members who said they're going are listed first. Walk-ins: write your name, purok and age, then sign.</p>`
    + table(['No.', 'Name', 'Purok', 'Age', 'Signature'], rows, ['6%', '40%', '16%', '8%', '30%']) + signatures()), { portrait: true });
}

/* ───────── Activity attendance (days attended) ───────── */
const activityInfo = (a, totalDays) => [
  `${a.title}${a.type ? ` (${a.type})` : ''}`,
  [a.program, a.project].filter(Boolean).join(' › '),
  `${fmtShort(a.startDate)}${a.endDate && fmtShort(a.endDate) !== fmtShort(a.startDate) ? ` – ${fmtShort(a.endDate)}` : ''} · ${totalDays} day${totalDays === 1 ? '' : 's'}`,
  a.venue,
].filter(Boolean);
const activityRows = (attendance, when) => attendance
  .filter((r) => r.user)
  .map((r) => {
    const u = r.user;
    const b = u.birthDate ? new Date(u.birthDate) : null;
    const d = new Date(when || Date.now());
    let age = b ? d.getFullYear() - b.getFullYear() : '';
    if (b && (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate()))) age -= 1;
    return { name: `${u.lastName}, ${u.firstName}`, purok: u.purok || '', sex: u.sex || '', age, verified: !!u.idVerified, days: r.daysAttended, points: r.pointsEarned };
  })
  .sort((x, y) => x.name.localeCompare(y.name));

export function downloadActivityAttendanceXlsx({ activity, attendance, totalDays }) {
  const rows = activityRows(attendance, activity.startDate);
  writeSheet(`Attendance_${safe(activity.title)}.xlsx`, {
    title: 'ACTIVITY ATTENDANCE',
    info: [...activityInfo(activity, totalDays), `Total attendees: ${rows.length}`],
    head: ['No.', 'Name', 'Purok', 'Sex', 'Age', 'Days attended', 'Points', 'Points status'],
    rows: rows.map((r, i) => [i + 1, r.name, r.purok, sexShort(r.sex), r.age, `${r.days}/${totalDays}`, r.points, pointsNote(r)]),
    foot: [['Prepared by: ______________________  (SK Secretary)'], ['Noted by: ______________________  (SK Chairperson)']],
    widths: [5, 30, 12, 6, 6, 14, 8, 22],
  });
}

export function printActivityAttendance({ activity, attendance, totalDays }) {
  const rows = activityRows(attendance, activity.startDate).map((r, i) => [i + 1, r.name, r.purok, sexShort(r.sex), r.age, `${r.days}/${totalDays}`, '']);
  return printHtml(`Attendance – ${activity.title}`, sheetHtml('ACTIVITY ATTENDANCE', [...activityInfo(activity, totalDays), `Total attendees: ${rows.length}`],
    table(['No.', 'Name', 'Purok', 'Sex', 'Age', 'Days', 'Signature'], rows, ['5%', '33%', '13%', '6%', '6%', '9%', '28%']) + signatures()), { portrait: true });
}

/* ───────── Attendance summary (period) ───────── */
const countLine = (events, members) => `${events.length} event${events.length === 1 ? '' : 's'} and activit${events.length === 1 ? 'y' : 'ies'} · ${members.length} member${members.length === 1 ? '' : 's'} attended`;
const periodLine = (from, to) => `Period: ${fmtShort(from)} – ${fmtShort(to)}`;
const eventLabel = (e) => `${fmtShort(e.date)} · ${e.title}`;

export function downloadSummaryXlsx({ from, to, events, members }) {
  const head = ['No.', 'Name', 'Purok', 'Sex', 'Age', 'Verified', ...events.map(eventLabel), 'Total'];
  const rows = members.map((m, i) => [
    i + 1, m.name, m.purok, sexShort(m.sex), m.age ?? '', m.verified ? 'Yes' : 'No',
    ...events.map((e) => (m.attended.includes(e._id) ? '✓' : '')), m.attended.length,
  ]);
  const totals = ['', 'Total present', '', '', '', '', ...events.map((e) => e.count), ''];
  writeSheet(`Attendance_summary_${fmtShort(from).replace(/[ ,]+/g, '-')}_to_${fmtShort(to).replace(/[ ,]+/g, '-')}.xlsx`, {
    title: 'ATTENDANCE SUMMARY',
    info: [periodLine(from, to), countLine(events, members)],
    head, rows: [...rows, totals],
    foot: [['Prepared by: ______________________  (SK Secretary)'], ['Noted by: ______________________  (SK Chairperson)']],
    widths: [5, 28, 10, 5, 5, 8, ...events.map(() => 14), 7],
  });
}

export function printSummary({ from, to, events, members }) {
  const eventsTable = table(['Date', 'Event / activity', 'Kind', 'Present'],
    events.map((e) => [fmtShort(e.date), e.title, e.kind === 'activity' ? 'Activity' : (e.type || 'Event'), e.count]), ['16%', '54%', '18%', '12%']);
  const byId = Object.fromEntries(events.map((e) => [e._id, e]));
  const membersTable = table(['No.', 'Name', 'Purok', 'Attended', 'Events attended'],
    members.map((m, i) => [i + 1, m.name, m.purok, m.attended.length, m.attended.map((id) => byId[id]?.title).filter(Boolean).join('; ')]),
    ['5%', '27%', '11%', '9%', '48%']);
  return printHtml('Attendance summary', sheetHtml('ATTENDANCE SUMMARY', [periodLine(from, to), countLine(events, members)],
    `<h3 style="font-size:12px;margin:16px 0 0;">Events and activities</h3>${eventsTable}<h3 style="font-size:12px;margin:16px 0 0;">Members</h3>${membersTable}${signatures()}`), { portrait: true });
}
