import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { homePath } from '../../lib/roles';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Enter your email and password.');
      return;
    }
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
      toast.error(res?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your e-SK Manage account."
      footer={
        <>
          New kabataan?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@email.com"
          value={form.email}
          onChange={onChange}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />
        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={onChange}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}