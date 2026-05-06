import { useTranslations } from 'next-intl';
import { SiteLogo } from './site-logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background mt-12 border-t border-[var(--color-border)]">
      <div className="container-wide grid grid-cols-1 gap-8 py-12 md:grid-cols-4">
        <div>
          <SiteLogo />
          <p className="text-foreground-muted mt-3 max-w-xs text-sm">{tCommon('tagline')}</p>
        </div>
        <FooterColumn title={t('company')} items={['About', 'Press', 'Careers']} />
        <FooterColumn title={t('support')} items={['Help center', 'Safety', 'Cancellations']} />
        <FooterColumn title={t('legal')} items={['Privacy', 'Terms', 'Cookies']} />
      </div>
      <div className="container-wide text-foreground-muted pb-8 text-xs">
        © {year} IRayon. {t('rights')}.
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="text-foreground-muted space-y-2 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
