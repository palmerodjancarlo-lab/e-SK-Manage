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
  // A code was just emailed when we arrive from Register / Sign in, so start with a short wait
  const [cooldown, setCooldown] = useState(stateEmail ? 30 : 0);
  const [resending, setResending] = useState(false);
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
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      const data = await resendCode(email.trim().toLowerCase());
      toast.success(data?.message || 'Your code is on the way.', { duration: 6000 });
      setCooldown(data?.retryAfter || 30);
    } catch (err) {
      const retry = err.response?.data?.retryAfter;
      if (retry) setCooldown(retry);
      toast.error(err.response?.data?.message || 'Could not resend the code. Check your connection and try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Enter it below to activate your account."
      footer={<Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-fg">
          <MailCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            {stateEmail ? <>We sent a code to <b className="break-all">{stateEmail}</b>.</> : 'Enter the email you registered with and the code we sent to it.'}
            <span className="mt-1 block text-muted">It can take a few minutes to arrive, so check Spam or Promotions too. The code works for 15 minutes, and resending sends the <b className="text-fg">same code</b>, so any of the emails will work.</span>
          </div>
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
          <button type="button" onClick={resend} disabled={cooldown > 0 || resending}
            className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline">
            {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
          {stateEmail && <span className="mt-1 block text-xs">Wrong email? <Link to="/register" className="font-semibold text-primary hover:underline">Register again</Link> with the right one.</span>}
        </div>
      </form>
    </AuthLayout>
  );
}