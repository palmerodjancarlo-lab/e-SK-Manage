// Minutes of a meeting. The SK Secretary (or Chairperson) writes them; other officers read.
// Print gives a plain, signed-off page for the SK's records.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Printer, Save, FileText } from 'lucide-react';
import api from '../../lib/api';
import { Modal, Button, Textarea } from '../ui';
import { escHtml, printHtml, letterhead } from '../../lib/reports';

const longDate = (d) => new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export default function MinutesModal({ meeting: m, canEdit, onClose, onSaved }) {
  const saved = m.minutes || {};
  const [text, setText] = useState(saved.text || '');
  const [attendees, setAttendees] = useState(saved.attendees || '');
  const dirty = text !== (saved.text || '') || attendees !== (saved.attendees || '');
  const when = `${longDate(m.date)}${m.time ? ` · ${m.time}` : ''}`;

  const saveM = useMutation({
    mutationFn: () => api.put(`/meetings/${m._id}/minutes`, { text, attendees }),
    onSuccess: (r) => { toast.success(r.data.message || 'Minutes saved.'); onSaved?.(); onClose(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save the minutes.'),
  });

  const print = () => {
    const by = saved.recordedBy ? `${saved.recordedBy.firstName} ${saved.recordedBy.lastName}` : '';
    const html = `<div style="font-family:Arial,sans-serif;font-size:12px;color:#111;">
      ${letterhead('MINUTES OF THE MEETING')}
      <p><b>${escHtml(m.title)}</b> (${escHtml(m.type || 'Meeting')})<br/>${escHtml(when)}${m.venue ? `<br/>${escHtml(m.venue)}` : ''}</p>
      ${attendees ? `<p><b>Present:</b> ${escHtml(attendees)}</p>` : ''}
      <div style="white-space:pre-wrap;line-height:1.6;margin-top:12px;">${escHtml(text)}</div>
      <table style="width:100%;margin-top:48px;"><tr>
        <td style="width:50%;">Prepared by:<br/><br/><b>${escHtml(by || '____________________')}</b><br/>SK Secretary</td>
        <td>Attested by:<br/><br/><b>____________________</b><br/>SK Chairperson</td>
      </tr></table>
    </div>`;
    if (!printHtml(`Minutes – ${m.title}`, html)) toast.error('Allow pop-ups to print.');
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`Minutes · ${m.title}`} description={`${when}${m.venue ? ` · ${m.venue}` : ''}`}
      footer={<>
        {text.trim() && <Button variant="outline" className="mr-auto" onClick={print}><Printer className="h-4 w-4" /> Print</Button>}
        <Button variant="outline" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
        {canEdit && <Button loading={saveM.isPending} disabled={!dirty} onClick={() => saveM.mutate()}><Save className="h-4 w-4" /> Save minutes</Button>}
      </>}>
      {canEdit ? (
        <div className="space-y-4">
          <Textarea label="Present" rows={2} value={attendees} onChange={(e) => setAttendees(e.target.value)}
            placeholder="e.g. Hon. Maria Santos (SK Chairperson), Juan Dela Cruz (SK Secretary), …" />
          <Textarea label="Minutes" rows={12} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Call to order\nReading and approval of the previous minutes\nMatters discussed and agreements\nAdjournment'} />
          {saved.recordedAt && <p className="text-xs text-subtle">Last saved {new Date(saved.recordedAt).toLocaleString('en-PH')}{saved.recordedBy?.firstName ? ` by ${saved.recordedBy.firstName} ${saved.recordedBy.lastName}` : ''}.</p>}
        </div>
      ) : saved.text ? (
        <div className="space-y-3">
          {saved.attendees && <p className="text-sm"><span className="font-semibold text-fg">Present: </span><span className="text-muted">{saved.attendees}</span></p>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{saved.text}</p>
          <p className="text-xs text-subtle">Recorded {new Date(saved.recordedAt).toLocaleString('en-PH')}{saved.recordedBy?.firstName ? ` by ${saved.recordedBy.firstName} ${saved.recordedBy.lastName}` : ''}.</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted"><FileText aria-hidden="true" className="h-4 w-4" /> The SK Secretary hasn’t recorded the minutes yet.</p>
      )}
    </Modal>
  );
}
