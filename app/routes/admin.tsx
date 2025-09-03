import { type LoaderFunctionArgs, json, redirect, type MetaFunction } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData, useLocation } from '@remix-run/react';
import { BiUser } from 'react-icons/bi';
import { FiUsers } from 'react-icons/fi';
import Button from '~/components/ui/Button';
import Popover from '~/components/ui/Popover';
import { cn } from '~/lib/utils';
import { getUserData } from '~/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Easy Dairy Admin' }, { name: 'description', content: 'Easy Dairy Admin' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserData(request);
  if (!user || !user.data) {
    throw redirect('/');
  }
  if (user.data['Role'] !== 'admin') {
    throw redirect('/dashboard');
  }
  return json({ userData: user.data, isDev: process.env.BASE_URL?.includes('dev.') }, user.headers);
}

type SidebarLinkProps = Parameters<typeof Link>[0] & { exact?: boolean; exclude?: string[] };
function SidebarLink({ children, className, to, ...props }: SidebarLinkProps) {
  const location = useLocation();
  const isActive =
    (to !== '/admin' &&
      !props.exact &&
      location.pathname.startsWith(to as string) &&
      (!props.exclude || !props.exclude.some((e) => location.pathname.includes(e)))) ||
    location.pathname === to;
  return (
    <Link
      {...props}
      to={to}
      className={cn(
        'font-medium py-2 px-5 font-opensans rounded text-lg lg:text-xl transition',
        isActive && 'text-primary-500 bg-white shadow-b-lg',
        !isActive && 'text-grey-600 hover:text-primary-500 hover:bg-white hover:shadow-b-lg',
        className
      )}
    >
      {children}
    </Link>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return <p className='px-5 uppercase mb-2 text-grey-500 text-sm lg:text-base'>{children}</p>;
}

export default function AdminLayout() {
  const data = useLoaderData<typeof loader>();
  return (
    <main className='flex flex-col justify-between min-h-screen bg-grey-50'>
      <nav aria-label='Top Bar' className='px-4 py-2 w-full flex flex-row border-b border-grey-200'>
        <Link to='/admin' className='flex flex-row gap-2 items-center'>
          <FiUsers className='w-6 h-6' /> <p className='text-xl font-extrabold text-grey-800'>Admin</p>
        </Link>
        <Popover>
          <Popover.Trigger asChild>
            <Button className='rounded-full w-10 h-10 p-1 grid place-items-center ml-auto bg-transparent border border-primary-500 hover:bg-primary-400/10 text-grey-800'>
              <BiUser className='w-7 h-7 text-primary-400' />
            </Button>
          </Popover.Trigger>
          <Popover.Content align='end' alignOffset={1} sideOffset={3} className='max-w-[500px] px-1 py-2 text-grey-700'>
            <div className='px-3'>
              <p className='text-xl font-bold text-black'>{data.userData['UserName']}</p>
              <p>{data.userData['BusinessName']}</p>
            </div>

            {!!data.userData['EasyDairyID'] && (
              <>
                <hr className='my-2' />
                <div className='px-3'>
                  <p className='font-bold mb-2'>Easy Dairy ID</p>
                  <ul className='space-y-1'>
                    {data.userData['EasyDairyID']?.map((id: string, i: number) => (
                      <li key={i}>{id}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            <hr className='my-2' />
            <Form method='post' action='/logout'>
              <button
                type='submit'
                id='submit'
                className='w-full text-grey-700 text-left transition hover:bg-grey-100 hover:text-error-500 px-3 py-2'
              >
                Logout
              </button>
            </Form>
          </Popover.Content>
        </Popover>
      </nav>
      <section className='flex flex-row flex-1'>
        <aside
          aria-label='Sidebar'
          className='flex flex-col pt-4 px-2 [&>div]:py-4 w-[250px] lg:w-[350px] border-r border-grey-200'
        >
          <SidebarLink to='/admin'>Home</SidebarLink>
          <div>
            <SidebarLabel>Admin</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/logs'>Admin Logs</SidebarLink>
              <SidebarLink to='/admin/backups'>Backup Control</SidebarLink>
              <SidebarLink to='/admin/disease'>Disease List</SidebarLink>
              <SidebarLink to='/admin/drugs'>Drug List</SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>EasyDairy</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/easydairy/purge'>Purge EasyDairy ID</SidebarLink>
              <SidebarLink to='/admin/easydairy/name'>Names</SidebarLink>
              <SidebarLink to='/admin/easydairy/s3'>Process from S3</SidebarLink>
              <SidebarLink to='/admin/easydairy/PurgeHerd'>Purge Herd</SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>Business</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/business' exclude={['/add', '/migrate']}>
                Businesses
              </SidebarLink>
              <SidebarLink to='/admin/business/add' exact={true}>
                Register Business
              </SidebarLink>
              <SidebarLink to='/admin/business/migrate/backup'>Migrate Business</SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>User</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/user' exclude={['/add']}>
                Users
              </SidebarLink>
              <SidebarLink to='/admin/user/add' exact={true}>
                Register Admin
              </SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>Animal</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/nasis'>NASIS</SidebarLink>
              <SidebarLink to='/admin/animals'>Merge Animals</SidebarLink>
              <SidebarLink to='/admin/reproduction'>Reproduction Animals</SidebarLink>
              <SidebarLink to='/admin/duplicates'>Duplicate Animals</SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>Report</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/report'>Backup Processing Report</SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>API-Keys</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/apikeys'>Api Keys</SidebarLink>
            </div>
          </div>
          <div>
            <SidebarLabel>Diagnostics</SidebarLabel>
            <div className='flex flex-col gap-2'>
              <SidebarLink to='/admin/diagnostic/db'>Database Statistics</SidebarLink>
            </div>
          </div>
          {data.isDev && (
            <div className='bg-red-500/10'>
              <SidebarLabel>Danger Zone</SidebarLabel>
              <div className='flex flex-col gap-2'>
                <SidebarLink to='/admin/reset'>Reset DB</SidebarLink>
              </div>
            </div>
          )}
        </aside>
        <div className='py-5 px-7 w-full overflow-auto'>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
