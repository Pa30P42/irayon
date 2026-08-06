import { Heading } from '@/components/ui/typography';
import { useTranslations } from 'next-intl';
import { SiteLogo } from './site-logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background border-border mt-12 border-t">
      <div className="container-wide grid grid-cols-1 gap-8 py-12 md:grid-cols-4">
        <div>
          <SiteLogo />
          <p className="text-foreground-muted mt-3 max-w-xs text-sm">{tCommon('tagline')}</p>
        </div>
        <FooterColumn
          title={t('company')}
          items={[t('links.about'), t('links.press'), t('links.careers')]}
        />
        <FooterColumn
          title={t('support')}
          items={[t('links.helpCenter'), t('links.safety'), t('links.cancellations')]}
        />
        <FooterColumn
          title={t('legal')}
          items={[t('links.privacy'), t('links.terms'), t('links.cookies')]}
        />
      </div>
      <div className="container-wide text-foreground-muted pb-8 text-xs">
        © {year} iRayon. {t('rights')}.
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <Heading as="h3" level="column" className="mb-3">
        {title}
      </Heading>
      <ul className="text-foreground-muted space-y-2 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
