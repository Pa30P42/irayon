import { Link } from '@/i18n/navigation';

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-lg font-semibold text-[var(--color-primary)]"
      aria-label="IRayon home"
    >
      <span
        aria-hidden
        className="inline-block h-7 w-7 rounded-md bg-[var(--color-primary)] text-center text-xs leading-7 font-bold text-white"
      >
        IR
      </span>
      IRayon
    </Link>
  );
}
