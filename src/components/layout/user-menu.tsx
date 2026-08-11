'use client';
// Client component: Radix dropdown, the session fetch, and the sign-out call.

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSessionUser } from '@/hooks/use-session-user';
import { useUnreadCount } from '@/hooks/use-unread-count';
import { Link } from '@/i18n/navigation';
import { CircleUserRound } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useTransition } from 'react';

export function UserMenu() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { data: user, isPending: isLoading } = useSessionUser();
  // Only poll for a signed-in user — an anonymous visitor has nothing to count.
  const { data: unread = 0 } = useUnreadCount(!!user);
  const [isSigningOut, startTransition] = useTransition();

  // Reserve the slot while the session resolves so the header doesn't reflow.
  if (isLoading) {
    return <div className="h-8 w-20" aria-hidden />;
  }

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/signin">{t('signIn')}</Link>
      </Button>
    );
  }

  const label = user.name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-2" aria-label={label}>
          <CircleUserRound className="h-4 w-4" />
          <span className="hidden max-w-40 truncate sm:inline">{label}</span>
          {unread > 0 ? (
            <span
              className="bg-primary absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white"
              aria-label={`${unread}`}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem asChild>
          <Link href="/account/bookings">{t('myBookings')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings">{t('accountSettings')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          {/* Hosts land in the cabinet; everyone else on the "become a host"
              entry point, which is where the signup gate is enforced. */}
          <Link href={user.isHost ? '/host' : '/host/start'}>
            {user.isHost ? t('hostDashboard') : t('becomeHost')}
          </Link>
        </DropdownMenuItem>
        {user.role === 'admin' ? (
          <DropdownMenuItem asChild>
            {/* `next/link`, not the localized one: the admin panel lives
                outside the [locale] segment and must not be prefixed. */}
            <NextLink href="/admin/listings">{t('adminPanel')}</NextLink>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signOut({ callbackUrl: `/${locale}` });
            });
          }}
        >
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
