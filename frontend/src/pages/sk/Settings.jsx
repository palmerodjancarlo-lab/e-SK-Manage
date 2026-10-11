// src/pages/sk/Settings.jsx — SK officer account settings
// cspell:words kagawad Tawiran
import { useQuery } from '@tanstack/react-query';
import { UserRound, Lock, Palette, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { roleLabel } from '../../lib/roles';
import { useAuth } from '../../context/auth-store';
import { Spinner } from '../../components/ui';
import SettingsShell from '../../components/account/SettingsShell';
import ProfileForm from '../../components/account/ProfileForm';
import PasswordCard from '../../components/account/PasswordCard';
import ChangeEmailCard from '../../components/account/ChangeEmailCard';
import AppearanceCard from '../../components/account/AppearanceCard';
import AccountCard from '../../components/account/AccountCard';

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserRound, description: 'Name, contact and address' },
  { key: 'security', label: 'Sign-in & security', icon: Lock, description: 'Email and password' },
  { key: 'appearance', label: 'Appearance', icon: Palette, description: 'Light or dark theme' },
  { key: 'account', label: 'Account', icon: ShieldCheck, description: 'Role and sign out' },
];

export default function SKSettings() {
  const { user } = useAuth();
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
  const me = profileQ.data || user || {};

  if (profileQ.isLoading) {
    return <div className="flex justify-center py-24" role="status"><Spinner className="h-8 w-8 text-primary" /><span className="sr-only">Loading settings…</span></div>;
  }

  return (
    <SettingsShell
      me={me}
      eyebrow="SK Console · Settings"
      chips={<span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold">{roleLabel(me.role)}</span>}
      tabs={TABS}
      render={(tab) => ({
        profile: <ProfileForm key={me._id} me={me} />,
        security: <><ChangeEmailCard /><PasswordCard /></>,
        appearance: <AppearanceCard />,
        account: <AccountCard me={me} roleLabel={roleLabel(me.role)} note="SK officer accounts are created and managed by the SK Chairperson." />,
      }[tab])}
    />
  );
}
