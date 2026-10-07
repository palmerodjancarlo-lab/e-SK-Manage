import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import OtpInput from '../../components/auth/OtpInput';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { homePath } from '../../lib/roles';

export default function VerifyEmail() {
  const { verifyEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = location.state?.email || '';

  const [email, setEmail] = useState(stateEmail);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    timer.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter the email you registered with.');
    if (code.trim().length !== 6) return toast.error('Enter the 6-digit code.');
    setSubmitting(true);
    try {
      const data = await verifyEmail(email.trim().toLowerCase(), code.trim());
      toast.success('Email verified! Welcome to e-SK Manage.');
      navigate(homePath(data.user.role), { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email) return toast.error('Enter your email first.');
    try {
      await resendCode(email.trim().toLowerCase());
      toast.success('A new code is on the way.');
      setCooldown(45);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend the code.');
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Enter it below to activate your account."
      footer={<Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          <MailCheck className="h-5 w-5 shrink-0" />
          Check your email (including spam) for the code. It expires in 10 minutes.
        </div>

        {!stateEmail && (
          <Input label="Email" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}

        <div>
          <label className="mb-2 block text-center text-sm font-medium text-fg">Verification code</label>
          <OtpInput value={code} onChange={setCode} />
        </div>

        <Button type="submit" loading={submitting} className="w-full">Verify &amp; continue</Button>

        <div className="text-center text-sm text-muted">
          Didn't get it?{' '}
          <button type="button" onClick={resend} disabled={cooldown > 0}
            className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline">
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}