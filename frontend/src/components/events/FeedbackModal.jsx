// Event feedback. Members post their thoughts once the event has started; SK officers
// read them (and can remove inappropriate ones) from both consoles.
// Stored as the meeting's `comments` on the backend.
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquareText, Send, Trash2, Clock } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-store';
import { Modal, Avatar, Button, Textarea, Spinner, EmptyState } from '../ui';

const MAX = 500;
const when = (d) => (d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const authorOf = (c) => {
  const u = c?.user || {};
  return { id: u._id || c?.user, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member', photo: u.photo || '', officer: u.role && u.role !== 'kabataan' };
};

/**
 * @param officer  true in the consoles: read + remove any feedback, no posting
 * @param startsAt the event's start — members can post from then on
 */
export default function FeedbackModal({ meetingId, meetingTitle, startsAt, officer = false, open, onClose }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [now] = useState(() => Date.now());
  const started = !startsAt || new Date(startsAt).getTime() <= now;

  const key = ['meeting-feedback', meetingId];
  const detailQ = useQuery({
    queryKey: key,
    enabled: !!meetingId && open,
    queryFn: async () => (await api.get(`/meetings/${meetingId}`)).data.meeting || {},
  });
  const feedback = useMemo(() => {
    const list = detailQ.data?.comments;
    return Array.isArray(list) ? [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  }, [detailQ.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['meeting', meetingId] }); qc.invalidateQueries({ queryKey: ['meetings'] }); };
  const postM = useMutation({
    mutationFn: (value) => api.post(`/meetings/${meetingId}/comments`, { text: value }),
    onSuccess: () => { setText(''); toast.success('Thanks for your feedback!'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not post. Try again.'),
  });
  const deleteM = useMutation({
    mutationFn: (commentId) => api.delete(`/meetings/${meetingId}/comments/${commentId}`),
    onSuccess: () => { toast.success('Feedback removed.'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not remove.'),
  });

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (v && !postM.isPending) postM.mutate(v);
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Feedback"
      description={meetingTitle ? (officer ? `What members said about “${meetingTitle}”` : `Share your thoughts on “${meetingTitle}”`) : undefined}>
      <div className="space-y-4">
        <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-1">
          {detailQ.isLoading ? (
            <div className="flex justify-center py-10" role="status"><Spinner className="h-6 w-6 text-primary" /><span className="sr-only">Loading…</span></div>
          ) : feedback.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="No feedback yet"
              description={officer ? 'Feedback from members appears here once the event starts.' : 'Be the first to share what you thought — what you learned, liked, or what the SK can do better.'} />
          ) : feedback.map((c) => {
            const a = authorOf(c);
            const mine = user && a.id && String(a.id) === String(user._id);
            return (
              <div key={c._id} className="flex gap-3">
                <Avatar name={a.name} src={a.photo} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-sm bg-surface2 px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-fg">{a.name}{a.officer && <span className="ml-1.5 text-xs font-medium text-primary">SK</span>}</span>
                      {(mine || officer) && (
                        <button type="button" onClick={() => { if (window.confirm('Remove this feedback?')) deleteM.mutate(c._id); }} disabled={deleteM.isPending}
                          className="shrink-0 rounded-md p-1 text-subtle transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                          aria-label={mine ? 'Delete my feedback' : `Remove feedback from ${a.name}`}>
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-fg">{c.text}</p>
                  </div>
                  <span className="ml-1 mt-1 block text-xs text-subtle">{when(c.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {!officer && (started ? (
          <form onSubmit={submit} className="border-t border-border pt-4">
            <Textarea label="Your feedback" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={MAX}
              placeholder="What did you learn or like? What can the SK do better next time?" />
            <div className="mt-2 flex items-center justify-between">
              <span className={cn('text-xs', text.length > MAX - 50 ? 'text-warning' : 'text-subtle')}>{text.length}/{MAX}</span>
              <Button type="submit" loading={postM.isPending} disabled={!text.trim()}><Send className="h-4 w-4" /> Post feedback</Button>
            </div>
          </form>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
            <Clock aria-hidden="true" className="h-4 w-4" /> Feedback opens when the event starts.
          </p>
        ))}
      </div>
    </Modal>
  );
}
