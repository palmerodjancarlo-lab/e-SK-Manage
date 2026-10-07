import { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, User, Phone, MapPin, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import { Button, Input, Select } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ageFromBirth(birthDate) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

const EMPTY = {
  firstName: '', lastName: '', email: '', password: '', confirm: '',
  contactNumber: '', sex: '', birthDate: '', civilStatus: '', isPWD: false,
  purok: '', address: '',
};

const STEPS = [
  { n: 1, label: 'Account' },
  { n: 2, label: 'Personal' },
  { n: 3, label: 'Residency' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const stepErrors = (s) => {
    const er = {};
    if (s === 1) {
      if (!form.firstName.trim()) er.firstName = 'Required';
      if (!form.lastName.trim()) er.lastName = 'Required';
      if (!EMAIL_RE.test(form.email)) er.email = 'Enter a valid email address';
      if (form.password.length < 6) er.password = 'At least 6 characters';
      if (form.confirm !== form.password) er.confirm = 'Passwords do not match';
    }
    if (s === 2) {
      if (!form.sex) er.sex = 'Required';
      if (!form.birthDate) er.birthDate = 'Required';
      else {
        const age = ageFromBirth(form.birthDate);
        if (age === null || age < 15 || age > 30) er.birthDate = 'SK membership is for ages 15–30';
      }
    }
    if (s === 3) {
      if (!form.purok.trim()) er.purok = 'Required';
      if (!form.address.trim()) er.address = 'Required';
    }
    return er;
  };

  const next = () => {
    const er = stepErrors(step);
    setErrors(er);
    if (Object.keys(er).length) { toast.error('Please fix the highlighted fields.'); return; }
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const doSubmit = async () => {
    for (const s of [1, 2, 3]) {
      const er = stepErrors(s);
      if (Object.keys(er).length) {
        setStep(s); setErrors(er);
        toast.error('Please fix the highlighted fields.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        contactNumber: form.contactNumber.trim(),
        sex: form.sex,
        birthDate: form.birthDate,
        civilStatus: form.civilStatus,
        isPWD: form.isPWD,
        purok: form.purok.trim(),
        address: form.address.trim(),
      };
      const data = await register(payload);
      toast.success('Verification code sent! Check your email.');
      navigate('/verify', { state: { email: data.email || payload.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onFormSubmit = (e) => { e.preventDefault(); if (step < 3) next(); else doSubmit(); };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="For the youth (ages 15–30) of Barangay Tawiran."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </>
      }
    >
      {/* Stepper */}
      <div className="mb-7 flex items-center">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition',
                step > s.n ? 'bg-primary text-primary-fg'
                  : step === s.n ? 'bg-primary text-primary-fg ring-4 ring-primary/20'
                    : 'bg-surface2 text-muted',
              )}>
                {step > s.n ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className={cn('mt-1.5 text-[11px] font-semibold', step >= s.n ? 'text-fg' : 'text-subtle')}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-2 mb-5 h-0.5 flex-1 rounded transition', step > s.n ? 'bg-primary' : 'bg-border')} />
            )}
          </Fragment>
        ))}
      </div>

      <form onSubmit={onFormSubmit} className="space-y-5">
        {/* STEP 1 — Account */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First name" name="firstName" value={form.firstName} onChange={onChange} error={errors.firstName} leftIcon={<User className="h-4 w-4" />} />
              <Input label="Last name" name="lastName" value={form.lastName} onChange={onChange} error={errors.lastName} />
            </div>
            <Input label="Email" name="email" type="email" placeholder="you@email.com" value={form.email} onChange={onChange} error={errors.email} leftIcon={<Mail className="h-4 w-4" />} autoComplete="email" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PasswordField label="Password" name="password" value={form.password} onChange={onChange} error={errors.password} autoComplete="new-password" showStrength />
              <PasswordField label="Confirm password" name="confirm" value={form.confirm} onChange={onChange} error={errors.confirm} autoComplete="new-password" />
            </div>
          </section>
        )}

        {/* STEP 2 — Personal details */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Sex" name="sex" value={form.sex} onChange={onChange} error={errors.sex}>
                <option value="" disabled>Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input label="Birthdate" name="birthDate" type="date" value={form.birthDate} onChange={onChange} error={errors.birthDate} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Civil status" name="civilStatus" value={form.civilStatus} onChange={onChange}>
                <option value="">Prefer not to say</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </Select>
              <Input label="Contact number" name="contactNumber" value={form.contactNumber} onChange={onChange} placeholder="09XX XXX XXXX" leftIcon={<Phone className="h-4 w-4" />} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/50 px-4 py-3">
              <input type="checkbox" name="isPWD" checked={form.isPWD} onChange={onChange} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
              <span className="text-sm text-fg">I am a Person With Disability (PWD)</span>
            </label>
          </section>
        )}

        {/* STEP 3 — Residency */}
        {step === 3 && (
          <section className="space-y-4">
            <Input label="Purok" name="purok" value={form.purok} onChange={onChange} error={errors.purok} placeholder="e.g. Purok 1" leftIcon={<MapPin className="h-4 w-4" />} />
            <Input label="Complete address" name="address" value={form.address} onChange={onChange} error={errors.address} placeholder="House no., street, sitio" />
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-xs text-muted">
                After confirming your email, you'll upload a residency/ID photo for verification. Your SK Chairperson reviews it before your account is activated.
              </p>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={back} className="flex-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" onClick={next} className="flex-1">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" loading={submitting} className="flex-1">Create account</Button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}