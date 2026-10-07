import Spinner from '../ui/Spinner';

export default function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
