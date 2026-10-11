import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Mail, MailCheck } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/auth-store';
import { Button, Input } from '../ui';
import SettingsCard from './SettingsCard';
import PasswordField from '../auth/PasswordField';
import OtpInput from '../auth/OtpInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errMsg = (e, fallback) => e.response?.data?.message || fallback;

/**
 * Change the sign-in email in two steps: request (new address + current password)
 * → confirm (6-digit code sent to the new address). The account keeps the old
 * email until the code is confirmed.
 */
export default function ChangeEmailCard() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();

  // 'view' | 'form' | 'code'
  const [step, setStep] = useState(user?.pendingEmail ? 'code' : 'view');
  const [pending, setPending] = useState(user?.pendingEmail || '');
  const [form, setForm] = useState({ newEmail: user?.pendingEmail || '', password: '' });
  const [errors, setErrors] = useState({});
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const on = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const request = async (e) => {
    e.preventDefault();
    const newEmail = form.newEmail.trim().toLowerCase();
    const er = {};
    if (!EMAIL_RE.test(newEmail)) er.newEmail = 'Enter a valid email address';
    else if (newEmail === user?.email) er.newEmail = 'This is already your email';
    if (!form.password) er.password = 'Enter your current password';
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-email', { newEmail, password: form.password });
      setPending(data.pendingEmail);
      setCode('');
      setStep('code');
      toast.success(data.message);
    } catch (err) {
      toast.error(errMsg(err, 'Could not send the code.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error('Enter the 6-digit code.');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-email/confirm', { code });
      setUser?.(data.user);
      qc.invalidateQueries({ queryKey: ['profile'] });
      setForm({ newEmail: '', password: '' });
      setPending('');
      setStep('view');
      toast.success(data.message);
    } catch (err) {
      toast.error(errMsg(err, 'Could not confirm the code.'));
      if (err.response?.data?.codeExpired) setStep('form');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await api.delete('/auth/change-email');
      setUser?.({ ...user, pendingEmail: '' });
    } catch {
      /* nothing pending server-side is fine */
    } finally {
      setPending('');
      setForm({ newEmail: '', password: '' });
      setStep('view');
      setBusy(false);
    }
  };

  return (
    <SettingsCard icon={Mail} title="Email address" description="Used to sign in and to receive codes from the SK.">
      <div className="space-y-4">

        {step === 'view' && (
          <div className="flex flex-col gap-3 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex min-w-0 items-center gap-2.5 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-subtle" />
              <span className="truncate font-medium text-fg">{user?.email}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setStep('form')}>Change email</Button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={request} noValidate className="space-y-4">
            <Input
              label="New email address" name="newEmail" type="email" inputMode="email" autoComplete="email"
              value={form.newEmail} onChange={on} error={errors.newEmail} placeholder="you@example.com"
              hint="We'll send a 6-digit code to this address to confirm it's yours."
            />
            <PasswordField
              label="Current password" name="password" value={form.password} onChange={on}
              error={errors.password} autoComplete="current-password"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={busy}>Send code</Button>
              <Button type="button" variant="ghost" onClick={cancel} disabled={busy}>Cancel</Button>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={confirm} className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Enter the code we sent to <b className="break-all text-fg">{pending}</b>. Your email stays
                {' '}<b className="break-all text-fg">{user?.email}</b> until you confirm.
              </p>
            </div>
            <OtpInput value={code} onChange={setCode} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" loading={busy} disabled={code.length !== 6}>Confirm new email</Button>
              <Button type="button" variant="ghost" onClick={() => setStep('form')} disabled={busy}>Resend or use another address</Button>
              <Button type="button" variant="subtle" onClick={cancel} disabled={busy}>Cancel change</Button>
            </div>
          </form>
        )}
      </div>
    </SettingsCard>
  );
}
