import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  return (
    <div className="container-wide py-20 text-center">
      <Heading level="notFoundTitle">404</Heading>
      <p className="text-foreground-muted mt-2">Page not found</p>
      <Button asChild className="mt-6">
        <Link href="/">Home</Link>
      </Button>
    </div>
  );
}
