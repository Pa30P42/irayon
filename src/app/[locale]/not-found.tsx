import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <div className="container-wide py-20 text-center">
      <Heading level="notFoundTitle">404</Heading>
      <p className="text-foreground-muted mt-2">{t('title')}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t('home')}</Link>
      </Button>
    </div>
  );
}
