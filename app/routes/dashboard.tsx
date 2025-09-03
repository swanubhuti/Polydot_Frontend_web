import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from '@remix-run/node';
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useMatches,
  useNavigate,
  useRouteError,
  useSearchParams,
} from '@remix-run/react';
import BottomBanner from '~/components/BottomBanner';
import companyLogo from '../images/easydairy-logo.jpg';
import easydraftLogo from '../images/easydraft-logo.png';
import { callAPI, getUserAccessToken } from '~/session.server';
import Navbar from '~/components/ui/Navbar';
import SelectDropdown from '~/components/ui/Dropdown';
import type { DropdownOpts, GenericAPI, GraphQLReturn } from '~/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { cn, getLocalStore, getVisibleHerdsFilter, storeLocal } from '~/lib/utils';
import ErrorMessage from '~/components/ui/ErrorMessage';
import Popover from '~/components/ui/Popover';
import { BiChevronDown } from 'react-icons/bi';
import ChangePasswordModal from '~/components/ChangePasswordModal';

export const meta: MetaFunction = ({ matches }) => {
  const lastMatch = matches[matches.length - 1];
  return [
    { title: `Easy Dairy Dashboard${lastMatch.params.herduuid ? ` - Herd ${lastMatch.params.herduuid}` : ''}` },
    { name: 'description', content: 'Easy Dairy Dashboard' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, headers, isApp } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  if (!res.success) {
    return redirect('/logout')
  }
  const userData = res.response;
  let route = '/dashboard';
  if (userData.Role === 'admin') {
    route = '/admin';
  } else if (isApp) {
    route = '/dashboard/mobile'
  } else if (userData.EasyDraft) {
      route = '/dashboard/drafts'
      return json(
        {
          dialogData: { isOpen: false },
          userData: userData,
          isApp,
          currentHerd: '',
          edData: userData.EasyDairyID[0],
          herdList: [],
          route,
        },
        headers
      );
  } else if (userData.HomePage === 'My Dashboard') {
    route = '/dashboard/summary/personal/view';
  }
  try {

    let visibleFilter = getVisibleHerdsFilter(userData as any);
    let filter = visibleFilter ? `(${visibleFilter})` : '';
    const herdCall = await callAPI<GraphQLReturn>(
      request,
      '/api/graphql',
      {
        query: `{
          herds ${filter}
          {
            nodes {
              herdUuid
              herdCode
              easyDairyId
            }
          }
        }`,
      },
      undefined,
      accessToken
    );
    if (!herdCall.success || 'errors' in herdCall.response) {
      console.error(`FATAL ERROR: Failed to retrieve herd data`, `source: ${request.url}`, herdCall.response, userData)
      throw new Response('Failed to retrieve herd data', { status: 400 });
    }

    const herds = herdCall.response.data?.herds?.nodes;

    let currentHerdInfo: Record<string, any> | undefined = herds?.[0];
    let currentEasyDairyId = {id: '', name: ''}
    if (params.herduuid) {
      currentHerdInfo = herds?.find((hd) => hd.herduuid === params.herduuid);
    }
    if (currentHerdInfo?.easyDairyId) {
      const {success, response} = await callAPI<GenericAPI>(request, `/api/admin/easydairy/settings?ids=${currentHerdInfo.easyDairyId}&ids`, undefined, 'GET');
      if (success && response.data) {
        currentEasyDairyId = {id: response.data[0].EasyDairyID, name: response.data[0].Name}
      }
    }

    if (
      !currentHerdInfo &&
      (userData.Role === 'user' || userData.Role === 'business-admin') &&
      userData.Herds &&
      userData.Herds.length == 0
    ) {
      return json(
        {
          dialogData: { isOpen: false },
          userData: userData,
          isApp,
          currentHerd: params.herduuid,
          edData: currentEasyDairyId,
          herdList: [],
          route,
        },
        headers
      );
    }
    // if (!currentHerdInfo && herds.length > 0) {
      // return redirect('/dashboard', headers);
    // }

    const herdList: DropdownOpts = herdCall.response.data?.herds?.nodes
      ?.map((hd) => ({
        label: hd.herdCode,
        value: hd.herdUuid,
      }))
      .sort((a, b) => {
        return a.label.localeCompare(b.label);
      });

    return json(
      {
        dialogData: { isOpen: false },
        userData: userData,
        isApp,
        currentHerd: params.herduuid || currentHerdInfo?.herdUuid,
        edData: currentEasyDairyId,
        herdList,
        route,
      },
      headers
    );
  } catch (e) {
    console.log(e);
  }

  return json(
    {
      dialogData: { isOpen: false },
      userData: userData,
      isApp,
      currentHerd: params.herduuid,
      edData: {id: '', name: ''},
      herdList: [],
      route,
    },
    headers
  );
}

export async function action({ request }: ActionFunctionArgs) {}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const match = useMatches();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currRoute = match[match.length - 1].id.match(/\.([A-Za-z]+)/);
  const currentHerd = match[match.length - 1].params.herduuid ?? '';
  const [addParams, setAddParams] = useState<Record<string, string>>({})
  const showHerdDropdown = !!currentHerd && !pathname.startsWith('/dashboard/bulls');
  const [herdList, setHerdList] = useState<DropdownOpts>((data.herdList as DropdownOpts) || []);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const menuLinks = useMemo(() => {
    const user = data.userData;
    let result: { label: string; href?: string; onClick?: () => void }[] = [];
    if (user.Role === 'business-admin') {
      result.push({ label: 'Admin', href: '/dashboard/admin' });
    }
    if (!user.EasyDraftUser) {
      result.push({ label: 'Alerts', href: '/dashboard/alerts/report' });
    }
    // Add Change Password for all users
    result.push({ label: 'Change Password', onClick: () => setIsChangePasswordOpen(true) });
    if (user.Role === 'business-admin') {
      // result.push({ label: 'Promotion', href: '/dashboard/promotion' });
    }
    return result;
  }, [data.userData]);

  const hideNavi = useMemo(() => {
    return !(data.isApp && (match[match.length - 1].params.id || (!match[match.length-1].id.includes('.events.') && searchParams.get('animalId'))))
  }, [])

  useEffect(() => {
    if (!currentHerd && data.currentHerd) {
      storeLocal('herdUuid', data.currentHerd);
    }
    if (data.edData.id) {
      storeLocal('edid', data.edData)
    }
  }, [data.currentHerd, currentHerd, data.edData.id]);

  useEffect(() => {
    if (data.herdList.length) {
      storeLocal('herdList', data.herdList);
    } else if (data.userData?.Role === 'user' && data.userData?.Herds) {
      storeLocal('herdList', []);
    } else {
      setHerdList(getLocalStore<DropdownOpts>('herdList') ?? []);
    }
  }, [data.herdList, data.userData]);

  return (
    <main className='flex flex-col justify-between min-h-screen gap-5 md:pt-36 pb-36 md:pb-0'>
      {hideNavi ? (
        <div className='bg-grey-100 p-4 md:fixed top-0 left-0 right-0 z-40'>
          <div className='flex justify-between items-center gap-3'>
            <Link to={data.route} className=''>
              <img src={data.userData.EasyDraft ? easydraftLogo : companyLogo} alt={`Easy ${data.userData.EasyDraft ? 'Draft' : 'Dairy'} Logo`} className='w-36 h-16' />
            </Link>
            <Popover>
              <Popover.Trigger asChild>
                <button
                  type='button'
                  className='group py-2 border border-grey-dark bg-white rounded text-grey-700 flex flex-row items-center justify-between w-44'
                >
                  <span className='truncate max-w-full text-ellipsis px-4'>{data.userData?.FirstName}</span>
                  <BiChevronDown className="w-6 h-6 ml-2 mr-1" />
                </button>
              </Popover.Trigger>
              <Popover.Content
                side='bottom'
                sideOffset={4}
                align='start'
                className='flex flex-col w-44 px-0 py-1 text-grey-700'
              >
                <div className='px-4 py-2 font-semibold'>{data.userData?.FirstName}</div>
                {menuLinks.length > 0 && (
                  <>
                    <hr className='my-1' />
                    {menuLinks.map((link, index) => (
                      link.href ? (
                        <MenuLink key={link.href} href={link.href}>
                          {link.label}
                        </MenuLink>
                      ) : (
                        <Popover.Close key={`${link.label}-${index}`} asChild>
                          <button
                            onClick={link.onClick}
                            className="block transition hover:bg-grey-light hover:text-primary-500 px-4 py-2 text-left w-full"
                          >
                            {link.label}
                          </button>
                        </Popover.Close>
                      )
                    ))}
                  </>
                )}
                <hr className='my-1' />
                <MenuLink href='/logout' className='hover:text-error-600 text-error-500'>
                  Logout
                </MenuLink>
              </Popover.Content>
            </Popover>
            <div className='ml-auto hidden md:block'>
              <Navbar
                enterprise={data.userData.Enterprise}
                selected={currRoute ? currRoute[1] : ''}
                hide={['cows', 'production']}
                addParams={addParams}
                isDraft={!!data.userData.EasyDraft}
              />
            </div>
          </div>
          <Form method='post' action='/logout' className='hidden'>
            <button type='submit' id='submit' tabIndex={-1}></button>
          </Form>
        </div>
      ) : <div className="h-4"></div>}

      <div className='w-full flex-1'>
        {showHerdDropdown && (
          <div className='flex justify-end flex-col md:flex-row gap-2 md:gap-5 items-stretch md:items-center px-5 pb-2'>
            <label className='font-bold'>Current Herd:</label>
            <SelectDropdown
              type='single'
              disabled={pathname.startsWith('/dashboard/bulls/')}
              className='block w-full'
              value={currentHerd}
              options={herdList}
              onSelectChange={(opts) => navigate(match[match.length - 1].pathname.replace(currentHerd, opts.value))}
            />
          </div>
        )}
        <Outlet key={pathname} context={{addParams: setAddParams}} />
      </div>
      {!data.userData.EasyDraft && <BottomBanner
        hideExtra={true}
        includeNavi={hideNavi}
        addParams={addParams}
        type={currRoute ? currRoute[1] : 'groups'}
      />}

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </main>
  );
}

function MenuLink({
  children,
  href,
  className,
}: {
  href: React.ComponentProps<typeof Link>['to'];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Popover.Close asChild>
      <Link
        to={href}
        className={cn('block transition hover:bg-grey-light hover:text-primary-500 px-4 py-2', className)}
      >
        {children}
      </Link>
    </Popover.Close>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
