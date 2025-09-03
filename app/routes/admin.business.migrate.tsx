import { Link, Outlet, useLocation } from '@remix-run/react';
import { ReactNode } from 'react';
import { cn } from '~/lib/utils';

export default function BackupBusinessPage() {
  return (
    <>
      <div className='flex pb-3'>
        <TabLink to='/admin/business/migrate/backup'>Backup</TabLink>
        <TabLink to='/admin/business/migrate/restore'>Restore</TabLink>
      </div>
      <Outlet />
    </>
  );
}
function TabLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  return (
    <Link
      to={to}
      className={cn('pb-1 px-5 text-lg', location.pathname === to && 'border-b border-b-primary-500 text-primary-500')}
    >
      {children}
    </Link>
  );
}
