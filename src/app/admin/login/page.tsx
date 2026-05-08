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
        <header className="flex flex-col items-center space-y-2 text-center">
          <img src="/logo.svg" alt="iRayon" className="h-14 w-14" />
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            iRayon · Admin
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
