// cspell:words Purok Sitio
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, User, Phone, MapPin, Check, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import { Button, Input, Select } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn, localDateInput } from '../../lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TODAY = localDateInput();

function ageFromBirth(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age -= 1;
  return age;
}

const EMPTY = {
  firstName: '', lastName: '', email: '', password: '', confirm: '',
  contactNumber: '', sex: '', birthDate: '', civilStatus: '', isPWD: false,
  purok: '', address: '', consent: false,
};

const STEPS = [
  { n: 1, label: 'Account' },
  { n: 2, label: 'Personal info' },
  { n: 3, label: 'Address' },
];

const optional = (text) => <>{text} <span className="font-normal text-subtle">(optional)</span></>;

function Stepper({ step, onJump }) {
  return (
    <ol className="mb-8 grid grid-cols-3 gap-3" aria-label="Registration progress">
      {STEPS.map((s) => {
        const done = step > s.n;
        const current = step === s.n;
        return (
          <li key={s.n} aria-current={current ? 'step' : undefined}>
            <button
              type="button"
              onClick={() => done && onJump(s.n)}
              disabled={!done}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className="block h-1 overflow-hidden rounded-full bg-border">
                <span className={cn('block h-full rounded-full bg-primary transition-[width] duration-500 ease-out', done || current ? 'w-full' : 'w-0')} />
              </span>
              <span className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-subtle">
                {done ? <Check className="h-3.5 w-3.5 text-primary" /> : `Step ${s.n}`}
              </span>
              <span className={cn('block text-sm font-semibold', current ? 'text-fg' : done ? 'text-muted group-hover:text-fg' : 'text-subtle')}>
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SexToggle({ value, onChange, error }) {
  return (
    <fieldset className="w-full">
      <legend className="label">Sex</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {['Male', 'Female'].map((opt) => (
          <label
            key={opt}
            className={cn(
              'flex h-[42px] cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
              value === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-fg hover:bg-surface2',
              error && value !== opt && 'border-danger',
            )}
          >
            <input type="radio" name="sex" value={opt} checked={value === opt} onChange={onChange} className="sr-only" />
            {opt}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

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
      if (!form.firstName.trim()) er.firstName = 'Enter your first name';
      if (!form.lastName.trim()) er.lastName = 'Enter your last name';
      if (!EMAIL_RE.test(form.email.trim())) er.email = 'Enter a valid email address';
      if (form.password.length < 6) er.password = 'Use at least 6 characters';
      if (!form.confirm) er.confirm = 'Re-enter your password';
      else if (form.confirm !== form.password) er.confirm = 'Passwords do not match';
    }
    if (s === 2) {
      if (!form.sex) er.sex = 'Select one';
      if (!form.birthDate) er.birthDate = 'Enter your birthdate';
      else {
        const age = ageFromBirth(form.birthDate);
        if (age === null || age < 15 || age > 30) er.birthDate = 'Membership is open to ages 15 to 30 only';
      }
    }
    if (s === 3) {
      if (!form.purok.trim()) er.purok = 'Enter your Purok';
      if (!form.address.trim()) er.address = 'Enter your address';
      if (!form.consent) er.consent = 'Please agree to continue';
    }
    return er;
  };

  const goTo = (s) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const next = () => {
    const er = stepErrors(step);
    setErrors(er);
    if (Object.keys(er).length) return;
    goTo(Math.min(3, step + 1));
  };
  const back = () => goTo(Math.max(1, step - 1));

  const doSubmit = async () => {
    for (const s of [1, 2, 3]) {
      const er = stepErrors(s);
      if (Object.keys(er).length) {
        setErrors(er);
        if (s !== step) goTo(s);
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
      wide
      title="Register as a member"
      subtitle="For residents of Barangay Tawiran aged 15 to 30. It only takes a few minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </>
      }
    >
      <Stepper step={step} onJump={goTo} />

      <form onSubmit={onFormSubmit} noValidate className="space-y-6">
        {/* key on the step so each step eases in */}
        <div key={step} className="animate-fade-up">
        {/* STEP 1 — Account */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input label="First name" name="firstName" value={form.firstName} onChange={onChange} error={errors.firstName} leftIcon={<User className="h-4 w-4" />} autoComplete="given-name" />
              <Input label="Last name" name="lastName" value={form.lastName} onChange={onChange} error={errors.lastName} autoComplete="family-name" />
            </div>
            <Input
              label="Email address" name="email" type="email" inputMode="email" placeholder="you@example.com"
              value={form.email} onChange={onChange} error={errors.email} leftIcon={<Mail className="h-4 w-4" />} autoComplete="email"
              hint="We'll send a verification code to this address."
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <PasswordField label="Password" name="password" value={form.password} onChange={onChange} error={errors.password} autoComplete="new-password" placeholder="At least 6 characters" showStrength />
              <PasswordField label="Confirm password" name="confirm" value={form.confirm} onChange={onChange} error={errors.confirm} autoComplete="new-password" placeholder="Re-enter password" />
            </div>
          </div>
        )}

        {/* STEP 2 — Personal info */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SexToggle value={form.sex} onChange={onChange} error={errors.sex} />
              <Input
                label="Birthdate" name="birthDate" type="date" max={TODAY}
                value={form.birthDate} onChange={onChange} error={errors.birthDate} autoComplete="bday"
                hint="You must be 15 to 30 years old."
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Select label={optional('Civil status')} name="civilStatus" value={form.civilStatus} onChange={onChange}>
                <option value="">Select…</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </Select>
              <Input
                label={optional('Mobile number')} name="contactNumber" type="tel" inputMode="tel" autoComplete="tel"
                value={form.contactNumber} onChange={onChange} placeholder="09XX XXX XXXX" leftIcon={<Phone className="h-4 w-4" />}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3.5 transition hover:bg-surface2/60">
              <input type="checkbox" name="isPWD" checked={form.isPWD} onChange={onChange} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[rgb(var(--primary))]" />
              <span className="text-sm">
                <span className="font-medium text-fg">I am a person with disability (PWD)</span>
                <span className="block text-muted">This helps the SK plan inclusive programs.</span>
              </span>
            </label>
          </div>
        )}

        {/* STEP 3 — Address */}
        {step === 3 && (
          <div className="space-y-5">
            <Input label="Purok" name="purok" value={form.purok} onChange={onChange} error={errors.purok} placeholder="e.g. Purok 1" leftIcon={<MapPin className="h-4 w-4" />} />
            <Input label="Complete address" name="address" value={form.address} onChange={onChange} error={errors.address} placeholder="House no., street, sitio" autoComplete="street-address" />

            <div className="flex gap-3 rounded-xl bg-surface2 px-4 py-3.5 text-sm text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>After confirming your email, you'll upload a valid ID or proof of residency. The SK Chairperson reviews it before your account is activated.</p>
            </div>

            <div>
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition hover:bg-surface2/60', errors.consent ? 'border-danger' : 'border-border')}>
                <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[rgb(var(--primary))]" />
                <span className="text-sm leading-relaxed text-muted">
                  I agree that the Sangguniang Kabataan of Barangay Tawiran may collect and process my personal
                  information for membership and youth program purposes, in accordance with the Data Privacy Act
                  of 2012 (RA 10173).
                </span>
              </label>
              {errors.consent && <p className="mt-1.5 text-xs font-medium text-danger">{errors.consent}</p>}
            </div>
          </div>
        )}

        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={back} className="flex-1 sm:flex-none sm:px-6">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button type="submit" className="flex-1">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" loading={submitting} className="flex-1">
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
