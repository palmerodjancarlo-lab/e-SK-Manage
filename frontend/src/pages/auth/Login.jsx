import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { homePath } from '../../lib/roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setFormError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.email.trim()) er.email = 'Enter your email address';
    else if (!EMAIL_RE.test(form.email.trim())) er.email = 'Enter a valid email address';
    if (!form.password) er.password = 'Enter your password';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    try {
      const data = await login(form.email.trim().toLowerCase(), form.password);
      toast.success('Welcome back!');
      navigate(homePath(data.user.role), { replace: true });
    } catch (err) {
      const res = err.response?.data;
      if (res?.needsVerification) {
        toast('Please verify your email first.', { icon: '✉️' });
        navigate('/verify', { state: { email: res.email || form.email } });
        return;
      }
      setFormError(res?.message || (err.response ? 'Sign in failed. Please try again.' : 'Unable to reach the server. Check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to continue to your account."
      footer={
        <>
          Not a member yet?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">Register as Kabataan</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />
        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={onChange}
          error={errors.password}
          autoComplete="current-password"
          labelAction={
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
          }
        />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-xs leading-relaxed text-subtle">
          SK officials: sign in with the account issued by your SK Chairperson.
        </p>
      </form>
    </AuthLayout>
  );
}
