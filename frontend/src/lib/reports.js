// Shared helpers for the SK's official documents (ABYIP, CBYDP, Accomplishment).
import api from './api';

export const REPORT_STATUS_LABEL = { draft: 'Draft', finalized: 'Finalized', submitted: 'Submitted' };
export const REPORT_STATUS_TONE = { draft: 'default', finalized: 'info', submitted: 'success' };
export const REPORT_TYPE_LABEL = { abyip: 'ABYIP', cbydp: 'CBYDP', accomplishment: 'Accomplishment report' };

// Saving the same document again updates it — it never creates a second copy.
// Returns the report id (new or existing).
export async function persistReport(id, payload) {
  if (id) {
    await api.put(`/finance/reports/${id}`, payload);
    return id;
  }
  const { data } = await api.post('/finance/reports', payload);
  return data.report?._id || null;
}

export const reportNumber = (v) => Number(v) || 0;
export const reportMoney = (v) => reportNumber(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Letterhead + signatories shared by the printed/Excel versions
export const letterhead = (heading) => `
  <div style="text-align:center;line-height:1.35;">
    <div>Republic of the Philippines</div><div>Province of Marinduque</div>
    <div>Municipality of Santa Cruz</div><div><b>BARANGAY TAWIRAN</b></div>
    <div>Office of the Sangguniang Kabataan</div>
  </div>
  <h2 style="text-align:center;margin:10px 0;font-size:14px;">${heading}</h2>`;

export const signatoryBlock = (s = {}, defaults = {}) => `
  <table style="width:100%;margin-top:34px;border-collapse:collapse;">
    <tr>
      <td style="width:33%;vertical-align:top;">Prepared by:<br><br><br><b>${escHtml(s.preparedBy)}</b><br>${escHtml(s.preparedByTitle || defaults.preparedByTitle || 'SK Secretary')}</td>
      <td style="width:33%;vertical-align:top;">Recommending Approval:<br><br><br><b>${escHtml(s.recommendingApproval)}</b><br>${escHtml(s.recommendingApprovalTitle || 'SK Chairperson')}</td>
      <td style="width:33%;vertical-align:top;">Noted and Approved:<br><br><br><b>${escHtml(s.notedApproved)}</b><br>${escHtml(s.notedApprovedTitle || 'Punong Barangay')}</td>
    </tr>
  </table>`;

// Opens a print window (Print → Save as PDF). Plans print landscape; sheets can ask for portrait.
export function printHtml(title, bodyHtml, { portrait = false } = {}) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>@page{size:${portrait ? 'portrait' : 'landscape'};margin:12mm;}body{margin:0;}</style></head><body>${bodyHtml}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

export function downloadExcel(filename, bodyHtml) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${bodyHtml}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
