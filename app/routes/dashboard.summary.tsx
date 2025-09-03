import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { Link, Outlet, useLoaderData, useMatches, useRouteError } from '@remix-run/react';
import { Toast } from '~/components/Toast';

import ErrorMessage from '~/components/ui/ErrorMessage';
import { getUserAccessToken } from '~/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { userData } = await getUserAccessToken(request, true);
  return json({enterprise: !!userData.Enterprise})
}

const tabs = [
  { name: 'personal', link: 'personal/view', label: 'My Dashboard'},
  { name: 'herd', label: 'Herd Composition', enterprise: true },
  { name: 'performance', label: 'Performance Summary', enterprise: true },
];

export default function DashboardSummary() {
  const matches = useMatches().pop()
  const userData = useLoaderData<typeof loader>()

  return (
    <div>
      <Toast />
      <nav className='bg-gray-100 px-4 py-2 -mt-3'>
        <ul className='flex gap-2'>
          {tabs.filter(t => !t.enterprise || userData.enterprise).map((t, idx) => (
            <li key={`tab-${idx}`}>
              <Link
                to={`/dashboard/summary/${t.link ?? t.name}`}
                className={`${
                  ((t.name && matches?.id.includes(`.${t.name}`)) || (!t.name && matches?.id.endsWith('dashboard.summary'))) ? 'bg-primary-500 text-white ' : 'hover:bg-primary-300 hover:text-white '
                } px-6 py-2 text-lg rounded font-signika block`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}

