// cspell:words kabataan saloobin Tawiran
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageCircleHeart, Send, Trash2, X } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-store';
import {
  Modal, Avatar, Button, Textarea, Spinner, EmptyState,
} from '../ui';

/* ---------- helpers (module scope) ---------- */

function commentText(c) {
  return c?.text ?? c?.comment ?? c?.message ?? '';
}

function commentAuthor(c) {
  const u = c?.user || c?.author || {};
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return {
    id: u._id || c?.user,
    name: name || u.name || c?.userName || 'Kabataan',
    photo: u.photo || '',
  };
}

function fmtWhen(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/* ---------- one saloobin ---------- */

function SaloobinItem({ comment, canDelete, onDelete, deleting }) {
  const author = commentAuthor(comment);
  return (
    <div className="flex gap-3">
      <Avatar name={author.name} src={author.photo} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm bg-surface2 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-fg">{author.name}</span>
            {canDelete && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="shrink-0 rounded-md p-1 text-subtle transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-fg">{commentText(comment)}</p>
        </div>
        <span className="ml-1 mt-1 block text-xs text-subtle">{fmtWhen(comment.createdAt)}</span>
      </div>
    </div>
  );
}

/* ---------- modal ---------- */

export default function SaloobinModal({ meetingId, meetingTitle, open, onClose }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [text, setText] = useState('');

  const detailQ = useQuery({
    queryKey: ['meeting-saloobin', meetingId],
    enabled: !!meetingId && open,
    queryFn: async () => {
      const { data } = await api.get(`/meetings/${meetingId}`);
      return data.meeting || data;
    },
  });

  const comments = useMemo(() => {
    const m = detailQ.data || {};
    const list = m.comments || m.saloobin || [];
    return Array.isArray(list) ? list : [];
  }, [detailQ.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['meeting-saloobin', meetingId] });

  const postM = useMutation({
    // send both keys so it works whether the backend reads `text` or `comment`
    mutationFn: (value) => api.post(`/meetings/${meetingId}/comments`, { text: value, comment: value }),
    onSuccess: () => { setText(''); toast.success('Saloobin posted. Salamat!'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not post. Try again.'),
  });

  const deleteM = useMutation({
    mutationFn: (commentId) => api.delete(`/meetings/${meetingId}/comments/${commentId}`),
    onSuccess: () => { toast.success('Saloobin removed.'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not delete.'),
  });

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    postM.mutate(v);
  };

  return (
    <Modal open={open} onClose={onClose} title={null} size="lg">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute right-0 top-0 rounded-lg p-1.5 text-subtle hover:bg-surface2 hover:text-fg"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* header */}
        <div className="flex items-start gap-3 border-b border-border pb-4">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <MessageCircleHeart className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-fg">Saloobin</h3>
            <p className="truncate text-sm text-muted">
              {meetingTitle ? `Share your reflection on “${meetingTitle}”` : 'Share your reflection on this activity'}
            </p>
          </div>
        </div>

        {/* list */}
        <div className="max-h-[48vh] space-y-4 overflow-y-auto py-4">
          {detailQ.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : comments.length === 0 ? (
            <EmptyState
              icon={<MessageCircleHeart className="h-6 w-6" />}
              title="No saloobin yet"
              description="Be the first to share what you thought about this activity."
            />
          ) : (
            comments.map((c) => {
              const author = commentAuthor(c);
              const mine = user && author.id && String(author.id) === String(user._id);
              return (
                <SaloobinItem
                  key={c._id}
                  comment={c}
                  canDelete={mine}
                  deleting={deleteM.isPending}
                  onDelete={() => deleteM.mutate(c._id)}
                />
              );
            })
          )}
        </div>

        {/* composer */}
        <form onSubmit={submit} className="border-t border-border pt-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Isulat ang iyong saloobin… (your thoughts, learnings, or suggestions)"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={cn('text-xs', text.length > 450 ? 'text-warning' : 'text-subtle')}>
              {text.length}/500
            </span>
            <Button type="submit" loading={postM.isPending} disabled={!text.trim()}>
              <Send className="h-4 w-4" /> Post saloobin
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}