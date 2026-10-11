// components/account/ProfileForm.jsx — personal details (all roles)
// cspell:words Purok sitio
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserRound, Phone, MapPin, RotateCcw } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/auth-store';
import { Button, Input, Select } from '../ui';
import { isKabataan } from '../../lib/roles';
import SettingsCard from './SettingsCard';

const FIELDS = ['firstName', 'lastName', 'sex', 'civilStatus', 'contactNumber', 'purok', 'address'];
const PH_MOBILE = /^(\+?63|0)9\d{9}$/;

// showContact (officials only): publish email + mobile in the kabataan officials directory
const pick = (me) => ({ ...Object.fromEntries(FIELDS.map((k) => [k, me?.[k] ?? ''])), showContact: me?.showContact !== false });
const ageOf = (b) => (b ? Math.floor((Date.now() - new Date(b).getTime()) / 3.15576e10) : null);

export default function ProfileForm({ me }) {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(() => pick(me));
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const official = me && !isKabataan(me.role);
  const dirty = form.showContact !== saved.showContact || FIELDS.some((k) => String(form[k] ?? '').trim() !== String(saved[k] ?? '').trim());
  const on = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const save = async (e) => {
    e?.preventDefault();
    const er = {};
    if (!form.firstName.trim()) er.firstName = 'Enter your first name';
    if (!form.lastName.trim()) er.lastName = 'Enter your last name';
    const phone = form.contactNumber.replace(/[\s-]/g, '');
    if (phone && !PH_MOBILE.test(phone)) er.contactNumber = 'Use a mobile number like 0917 123 4567';
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((k) => [k, String(form[k] ?? '').trim()]));
      payload.contactNumber = phone;
      if (official) payload.showContact = form.showContact;
      const { data } = await api.put('/auth/profile', payload);
      setUser?.(data.user);
      qc.invalidateQueries({ queryKey: ['profile'] });
      const next = pick(data.user);
      setSaved(next); setForm(next);
      toast.success('Your profile was saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const age = ageOf(me?.birthDate);

  return (
    <form onSubmit={save} noValidate>
      <SettingsCard
        icon={UserRound}
        title="Personal information"
        description="How you appear to the SK and on official records."
        footer={
          <>
            {dirty && <span className="mr-auto text-sm font-medium text-warning" role="status">You have unsaved changes</span>}
            <Button type="button" variant="ghost" disabled={!dirty || busy} onClick={() => { setForm(saved); setErrors({}); }}>
              <RotateCcw className="h-4 w-4" /> Discard
            </Button>
            <Button type="submit" loading={busy} disabled={!dirty}>Save changes</Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="First name" name="firstName" value={form.firstName} onChange={on} error={errors.firstName} autoComplete="given-name" />
          <Input label="Last name" name="lastName" value={form.lastName} onChange={on} error={errors.lastName} autoComplete="family-name" />
          <Select label="Sex" name="sex" value={form.sex} onChange={on}>
            <option value="">Prefer not to say</option><option value="Male">Male</option><option value="Female">Female</option>
          </Select>
          <Select label="Civil status" name="civilStatus" value={form.civilStatus} onChange={on}>
            <option value="">Prefer not to say</option><option value="Single">Single</option><option value="Married">Married</option>
            <option value="Widowed">Widowed</option><option value="Separated">Separated</option>
          </Select>
          <Input label="Mobile number" name="contactNumber" type="tel" inputMode="tel" autoComplete="tel" value={form.contactNumber} onChange={on}
            error={errors.contactNumber} placeholder="0917 123 4567" leftIcon={<Phone className="h-4 w-4" />} />
          <Input label="Purok" name="purok" value={form.purok} onChange={on} placeholder="e.g. Purok 1" leftIcon={<MapPin className="h-4 w-4" />} />
          <div className="sm:col-span-2">
            <Input label="Complete address" name="address" value={form.address} onChange={on} placeholder="House no., street, sitio — Barangay Tawiran" autoComplete="street-address" />
          </div>
        </div>
        {official && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface2/50 p-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" checked={form.showContact}
              onChange={(e) => setForm((f) => ({ ...f, showContact: e.target.checked }))} />
            <span className="text-sm">
              <span className="font-semibold text-fg">Show my email and mobile number to kabataan</span>
              <span className="block text-xs text-muted">They appear on the SK Officials page of the member portal. Your name, position and photo are always shown.</span>
            </span>
          </label>
        )}
        {(age != null || me?.birthDate) && (
          <p className="mt-4 text-sm text-muted">
            Birthdate: <span className="font-medium text-fg">{new Date(me.birthDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {age != null && <> · Age <span className="font-medium text-fg">{age}</span></>}
            <span className="block text-xs text-subtle">To correct your birthdate, contact the SK Chairperson.</span>
          </p>
        )}
      </SettingsCard>
    </form>
  );
}
