import { AdminLoginForm } from '@/components/admin/admin-login-form';

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="border-border bg-background w-full max-w-sm space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8">
        <header className="space-y-1 text-center">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            IRayon · Admin
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl">Sign in</h1>
          <p className="text-foreground-muted text-sm">
            Use your administrator credentials to continue.
          </p>
        </header>
        <AdminLoginForm next={next} />
      </div>
    </div>
  );
}
