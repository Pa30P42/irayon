import { Link } from '@/i18n/navigation';
import Image from 'next/image';

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-lg font-semibold text-[var(--color-primary)]"
      aria-label="iRayon home"
    >
      <Image src="/logo.svg" alt="" aria-hidden width={32} height={32} priority />
      iRayon
    </Link>
  );
}
