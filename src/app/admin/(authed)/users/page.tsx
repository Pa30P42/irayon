import { AdminUsersList } from '@/components/admin/admin-users-list';
import { Heading } from '@/components/ui/typography';
import { getTranslations } from 'next-intl/server';

export default async function AdminUsersPage() {
  const t = await getTranslations('admin.users');
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Heading as="h1" level="page">
        {t('title')}
      </Heading>
      <AdminUsersList />
    </div>
  );
}
