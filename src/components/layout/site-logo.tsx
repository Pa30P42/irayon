import { Link } from '@/i18n/navigation';

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-lg font-semibold text-[var(--color-primary)]"
      aria-label="IRayon home"
    >
      <img src="/logo.svg" alt="" aria-hidden className="h-8 w-8" />
      IRayon
    </Link>
  );
}
