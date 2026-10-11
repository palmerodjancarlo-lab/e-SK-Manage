// components/account/AccountCard.jsx — account facts, sign out, and (kabataan) delete account
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Mail, MapPin, CalendarClock, LogOut, Trash2, Info } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/auth-store';
import { Button, Input, Modal } from '../ui';
import PasswordField from '../auth/PasswordField';
import SettingsCard from './SettingsCard';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

function Row({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted"><Icon aria-hidden="true" className="h-4 w-4" /></span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="truncate text-sm font-semibold text-fg">{value || '—'}</dd>
      </div>
    </div>
  );
}

function DeleteAccount() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = password && confirm.trim().toUpperCase() === 'DELETE';

  const close = () => { setOpen(false); setPassword(''); setConfirm(''); setError(''); };
  const remove = async () => {
    setBusy(true); setError('');
    try {
      await api.delete('/auth/account', { data: { password } });
      toast.success('Your account was deleted.');
      logout?.();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the account.');
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsCard icon={Trash2} tone="danger" title="Delete account" description="Permanently remove your kabataan account and personal information.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Your points and event history will be lost. This cannot be undone.</p>
          <Button variant="danger" onClick={() => setOpen(true)} className="shrink-0"><Trash2 className="h-4 w-4" /> Delete my account</Button>
        </div>
      </SettingsCard>
      <Modal open={open} onClose={close} title="Delete your account?"
        description="This permanently deletes your account. You will need to register again to rejoin."
        footer={<><Button variant="outline" onClick={close}>Keep my account</Button>
          <Button variant="danger" loading={busy} disabled={!ready} onClick={remove}>Delete permanently</Button></>}>
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          <PasswordField label="Your password" name="deletePassword" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Input label={<>Type <b>DELETE</b> to confirm</>} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </div>
      </Modal>
    </>
  );
}

/**
 * @param me          the signed-in user's profile
 * @param roleLabel   e.g. "SK Treasurer"
 * @param note        a sentence about who manages this account
 * @param allowDelete show the delete-account danger zone (kabataan only — the API refuses others)
 */
export default function AccountCard({ me, roleLabel, note, allowDelete = false }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <SettingsCard icon={ShieldCheck} title="Account" description="Your e-SK Manage account details."
        footer={<Button variant="outline" onClick={() => { logout?.(); navigate('/login'); }} className="text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" /> Sign out of this device</Button>}>
        <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          <Row icon={ShieldCheck} label="Role" value={roleLabel} />
          <Row icon={Mail} label="Sign-in email" value={me.email} />
          <Row icon={MapPin} label="Barangay" value={`${me.barangay || 'Tawiran'}, ${me.municipality || 'Santa Cruz'}`} />
          <Row icon={CalendarClock} label="Member since" value={fmtDate(me.createdAt)} />
        </dl>
        {note && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2.5 text-sm text-fg">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-info" /> {note}
          </p>
        )}
      </SettingsCard>
      {allowDelete && <DeleteAccount />}
    </>
  );
}
