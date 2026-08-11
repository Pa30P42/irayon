import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { SiteLogo } from './site-logo';
import { SiteNav } from './site-nav';
import { UserMenu } from './user-menu';

/**
 * Stays a fully static server component.
 *
 * Reading the session here (`auth()` → `cookies()`) would mark the entire
 * `[locale]` layout dynamic, and with it every listing and region page that is
 * currently prerendered and served from the CDN. The session is therefore
 * fetched CLIENT-side by `UserMenu` from `/api/account/me`, which costs one
 * small no-store request per session and keeps the public site on ISR.
 */
export function SiteHeader() {
  return (
    <header className="bg-background/90 border-border sticky top-0 z-40 border-b backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between">
        <SiteLogo />
        <SiteNav />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
