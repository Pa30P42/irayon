import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { SiteLogo } from './site-logo';
import { SiteNav } from './site-nav';

export function SiteHeader() {
  return (
    <header className="bg-background/90 sticky top-0 z-40 border-b border-[var(--color-border)] backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between">
        <SiteLogo />
        <SiteNav />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
