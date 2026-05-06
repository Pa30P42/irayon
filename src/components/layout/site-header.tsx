import { SiteLogo } from './site-logo';
import { SiteNav } from './site-nav';
import { LanguageSwitcher } from '@/components/shared/language-switcher';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-[var(--color-border)]">
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
