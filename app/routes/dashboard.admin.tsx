import { type LoaderFunctionArgs, type MetaFunction, json, redirect } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useMatches} from "@remix-run/react";
import { getUserAccessToken } from "~/session.server";

export async function loader({request, params}: LoaderFunctionArgs) {
  const {userData, headers} = await getUserAccessToken(request, true);
  if (!userData || (userData && userData.Role !== 'business-admin')) {
    return redirect('/dashboard', headers)
  }
  return json({ userData: userData});
}
const tabs = [
  {label: 'Business', name: '', link: ''},
  {label: 'Mating Start Date', name: 'msd', link: '/msd'},
  {label: 'Easy Dairy Names', name: 'easydairy', link: '/easydairy'}
  // {label: 'Herd Options', name: 'options', link: '/options'}
]

export default function BusinessAdminHeader() {
  const matches = useMatches().pop();
  const data = useLoaderData<typeof loader>();
  const userData = data.userData;

  const filteredTabs = userData?.EasyDraftUser
    ? tabs.filter((t) => t.name !== "msd" && t.name !== "easydairy")
    : tabs;

  return (
    <div>
      <nav className='bg-gray-100 px-4 py-2 -mt-3'>
        <ul className='flex gap-2'>
          {filteredTabs.map((t, idx) => (
            <li key={`tab-${idx}`}>
              <Link
                to={`/dashboard/admin${t.link}`}
                className={`${
                  ((t.name && matches?.id.includes(`.${t.name}`)) || (!t.name && matches?.id.endsWith('dashboard.admin._index'))) ? 'bg-primary-500 text-white ' : 'hover:bg-primary-300 hover:text-white '
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
  )
}

