import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  return (
    <div className="container-wide py-20 text-center">
      <h2 className="text-3xl font-semibold">404</h2>
      <p className="text-foreground-muted mt-2">Page not found</p>
      <Button asChild className="mt-6">
        <Link href="/">Home</Link>
      </Button>
    </div>
  );
}
