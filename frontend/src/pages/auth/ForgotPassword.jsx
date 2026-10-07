import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import OtpInput from '../../components/auth/OtpInput';
import PasswordField from '../../components/auth/PasswordField';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../context/auth-store';

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = request code, 2 = reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email.');
    setSubmitting(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      toast.success('If that email is registered, a reset code is on the way.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const doReset = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) return toast.error('Enter the 6-digit code.');
    if (password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (password !== confirm) return toast.error('Passwords do not match.');
    setSubmitting(true);
    try {
      await resetPassword(email.trim().toLowerCase(), code.trim(), password);
      toast.success('Password reset! You can now sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Forgot password' : 'Reset password'}
      subtitle={
        step === 1
          ? "Enter your email and we'll send a 6-digit reset code."
          : `Enter the code sent to ${email} and choose a new password.`
      }
      footer={<Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>}
    >
      {step === 1 ? (
        <form onSubmit={requestCode} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="h-4 w-4" />} />
          <Button type="submit" loading={submitting} className="w-full">Send reset code</Button>
        </form>
      ) : (
        <form onSubmit={doReset} className="space-y-5">
          <div>
            <label className="mb-2 block text-center text-sm font-medium text-fg">Reset code</label>
            <OtpInput value={code} onChange={setCode} />
          </div>
          <PasswordField label="New password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" showStrength />
          <PasswordField label="Confirm new password" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          <Button type="submit" loading={submitting} className="w-full">Reset password</Button>
          <div className="text-center text-sm text-muted">
            <button type="button" onClick={() => setStep(1)} className="font-semibold text-primary hover:underline">Use a different email</button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}