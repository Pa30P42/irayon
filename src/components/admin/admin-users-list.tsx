'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  becameHostAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  _count: { listings: number; bookings: number };
};

const enc = encodeURIComponent;

export function AdminUsersList() {
  const t = useTranslations('admin.users');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isPending } = useQuery({
    queryKey: ['admin-users', debounced],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?q=${enc(debounced)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as { data: AdminUser[] };
      return json.data;
    },
  });

  const act = useMutation({
    mutationFn: async ({ id, path, method }: { id: string; path: string; method: string }) => {
      const res = await fetch(`/api/admin/users/${enc(id)}/${path}`, { method });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? `Failed (${res.status})`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => setError(err.message === 'cannot_suspend' ? t('cannotSuspend') : err.message),
  });

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('search')}
        aria-label={t('search')}
      />

      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <div className="bg-accent h-24 animate-pulse rounded-xl" aria-hidden />
      ) : users.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
                <p className="text-foreground-muted truncate text-xs">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={user.role === 'ADMIN' ? 'solid' : 'outline'}>
                    {user.role.toLowerCase()}
                  </Badge>
                  <Badge variant={user.suspendedAt ? 'default' : 'outline'}>
                    {user.suspendedAt ? t('suspended') : t('active')}
                  </Badge>
                  <span className="text-foreground-muted text-xs">
                    {t('listings')}: {user._count.listings} · {t('bookings')}:{' '}
                    {user._count.bookings}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={act.isPending}
                  onClick={() => {
                    setError(null);
                    if (window.confirm(t('confirmRevoke'))) {
                      act.mutate({ id: user.id, path: 'revoke', method: 'POST' });
                    }
                  }}
                >
                  {t('revoke')}
                </Button>
                {user.suspendedAt ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={act.isPending}
                    onClick={() => {
                      setError(null);
                      act.mutate({ id: user.id, path: 'suspend', method: 'DELETE' });
                    }}
                  >
                    {t('unsuspend')}
                  </Button>
                ) : (
                  <Button
                    variant="destructiveGhost"
                    size="sm"
                    disabled={act.isPending}
                    onClick={() => {
                      setError(null);
                      if (window.confirm(t('confirmSuspend'))) {
                        act.mutate({ id: user.id, path: 'suspend', method: 'POST' });
                      }
                    }}
                  >
                    {t('suspend')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
