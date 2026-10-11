import { useEffect, useState } from 'react';
import { ExternalLink, FileWarning } from 'lucide-react';
import api from '../../lib/api';
import { Spinner } from '../ui';

// Error bodies arrive as a Blob when responseType is 'blob'
const readError = async (err) => {
  try {
    const text = await err.response?.data?.text?.();
    return JSON.parse(text).message;
  } catch {
    return null;
  }
};

/**
 * Loads a private residency document through the authenticated API and shows it.
 * The file only ever exists as an in-memory object URL in this tab — no shareable link.
 * Give it `key={endpoint}` (or a version) when the document can change while mounted.
 */
export default function IdDocumentViewer({ endpoint, className = '' }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    api.get(endpoint, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setState({ status: 'ready', url: objectUrl, isPdf: data.type === 'application/pdf', isImage: data.type.startsWith('image/') });
      })
      .catch(async (err) => {
        if (!cancelled) setState({ status: 'error', message: (await readError(err)) || 'Could not load the document.' });
      });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [endpoint]);

  if (state.status === 'loading') {
    return (
      <div className={`flex h-48 items-center justify-center rounded-xl border border-border bg-surface2/50 ${className}`} role="status">
        <Spinner className="h-6 w-6 text-primary" /><span className="sr-only">Loading document…</span>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-border bg-surface2/50 p-4 text-sm text-muted ${className}`} role="alert">
        <FileWarning className="h-5 w-5 shrink-0 text-warning" /> {state.message}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {state.isImage ? (
        <img src={state.url} alt="Submitted ID or residency document" className="max-h-[60vh] w-full rounded-xl border border-border object-contain" />
      ) : state.isPdf ? (
        <iframe src={state.url} title="Submitted ID or residency document" className="h-[60vh] w-full rounded-xl border border-border" />
      ) : (
        <p className="text-sm text-muted">This file type can't be previewed here.</p>
      )}
      <a href={state.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        Open full size <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
