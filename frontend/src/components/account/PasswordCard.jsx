// components/account/PasswordCard.jsx — change password (all roles)
import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '../ui';
import PasswordField from '../auth/PasswordField';
import SettingsCard from './SettingsCard';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function PasswordCard() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const on = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.currentPassword) er.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 6) er.newPassword = 'Use at least 6 characters';
    else if (form.newPassword === form.currentPassword) er.newPassword = 'Choose a password different from the current one';
    if (form.confirm !== form.newPassword) er.confirm = 'Passwords do not match';
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed.');
      setForm(EMPTY);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not change the password.';
      if (/current password/i.test(msg)) setErrors({ currentPassword: msg });
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <SettingsCard
        icon={KeyRound}
        title="Password"
        description="Use a password you don’t use on other sites."
        footer={<Button type="submit" loading={busy}>Update password</Button>}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-5">
            <PasswordField label="Current password" name="currentPassword" value={form.currentPassword} onChange={on} error={errors.currentPassword} autoComplete="current-password" placeholder="Current password" />
            <PasswordField label="New password" name="newPassword" value={form.newPassword} onChange={on} error={errors.newPassword} autoComplete="new-password" placeholder="At least 6 characters" showStrength />
            <PasswordField label="Confirm new password" name="confirm" value={form.confirm} onChange={on} error={errors.confirm} autoComplete="new-password" placeholder="Type it again" />
          </div>
          <div className="rounded-lg bg-surface2/60 p-4 text-sm text-muted">
            <p className="flex items-center gap-2 font-semibold text-fg"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-success" /> Strong passwords</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              <li>10 or more characters</li>
              <li>Upper- and lower-case letters</li>
              <li>A number and a symbol</li>
              <li>Not your name or birthday</li>
            </ul>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}
