import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { Outlet, Link, useMatches, useLoaderData } from '@remix-run/react';
import { getUserAccessToken } from '~/session.server';

const tabs = [
    { name: 'report', label: 'Alert Report'},
    { name: 'list', label: 'Alert List', adminOnly: true}
];

export async function loader({ request }: LoaderFunctionArgs) {
    const { userData } = await getUserAccessToken(request, true);
    return json({admin: userData.Role === 'business-admin'})
}

export default function DashboardAlerts() {
    const matches = useMatches().pop()
    const data = useLoaderData<typeof loader>()
    return (
        <div className=''>
            <nav className='bg-gray-100 px-4 py-2 -mt-3 mb-3'>
                <ul className='flex gap-2'>
                {tabs.filter(t => !t.adminOnly || data.admin).map((t, idx) => (
                    <li key={`tab-${idx}`}>
                    <Link
                        to={`/dashboard/alerts/${t.name}`}
                        className={`${
                        (t.name && matches?.id.includes(`.${t.name}`)) ? 'bg-primary-500 text-white ' : 'hover:bg-primary-300 hover:text-white '
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
