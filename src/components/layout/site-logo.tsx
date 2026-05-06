import { Link } from '@/i18n/navigation';

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-semibold text-lg text-[var(--color-primary)]"
      aria-label="IRayon home"
    >
      <span
        aria-hidden
        className="inline-block h-7 w-7 rounded-md bg-[var(--color-primary)] text-white text-center leading-7 text-xs font-bold"
      >
        IR
      </span>
      IRayon
    </Link>
  );
}
