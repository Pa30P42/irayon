import { useTranslations } from 'next-intl';
import { SiteLogo } from './site-logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-background mt-12">
      <div className="container-wide py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <SiteLogo />
          <p className="mt-3 text-sm text-foreground-muted max-w-xs">{tCommon('tagline')}</p>
        </div>
        <FooterColumn title={t('company')} items={['About', 'Press', 'Careers']} />
        <FooterColumn title={t('support')} items={['Help center', 'Safety', 'Cancellations']} />
        <FooterColumn title={t('legal')} items={['Privacy', 'Terms', 'Cookies']} />
      </div>
      <div className="container-wide pb-8 text-xs text-foreground-muted">
        © {year} IRayon. {t('rights')}.
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-foreground-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
