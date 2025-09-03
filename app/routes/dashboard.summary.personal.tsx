import { useEffect, useState } from 'react';

import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useFetcher, useLoaderData, useLocation, useNavigate, useRouteError } from '@remix-run/react';

import toast from 'react-hot-toast';
import ErrorMessage from '~/components/ui/ErrorMessage';
import { SwitchToggle } from '~/components/ui/Switch';

import type { GenericAPI } from '~/lib/types';

import { callAPI, getUserAccessToken, invalidateUserHeaders } from '~/session.server';
import Spinner from '~/components/ui/Spinner';
import { useChartsAvailable } from '~/hooks/useChartsAvailable';
import { toastInfo } from '~/components/Toast';

type LoaderReturn = Awaited<ReturnType<typeof loader>>;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { userData } = await getUserAccessToken(request, true);
    if (!userData) {
      throw new Error('Cannot get user');
    }
    return {
      userData,
    };
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    } else {
      throw new Error('Something went wrong');
    }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
  const enabled = data.enabled === 'true';
  const homePage = enabled ? 'My Dashboard' : '';

  const payload = {
    homePage: homePage,
  };
  try {
    const res = await callAPI<GenericAPI>(request, `/api/account`, payload, 'PATCH');
    if (!res.success && res.response.errors) {
      return json({ errors: { message: res.response.errors } });
    }
    return json(
      { errors: null },
      {
        headers: await invalidateUserHeaders(request),
      }
    );
  } catch (error) {
    return json({ errors: { message: 'Something went wrong' } });
  }
}

export function ErrorBoundary() {
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return (
    <div className='flex flex-col justify-center'>
      <ErrorMessage message={error.data || error.message} />
    </div>
  );
}

export default function DashboardSummaryPersonal() {
  const loaderData = useLoaderData<LoaderReturn>();
  const fetcher = useFetcher<typeof action>();
  const location = useLocation();

  const navigate = useNavigate();

  const [homePageEnabled, setHomePageEnabled] = useState(loaderData.userData.HomePage === 'My Dashboard');

  useEffect(() => {
    setHomePageEnabled(loaderData.userData.HomePage === 'My Dashboard');
  }, [loaderData.userData.HomePage]);

  useEffect(() => {
    if (fetcher.state !== 'idle') {
      return;
    }
    const actionData = fetcher.data;
    if (actionData?.errors) {
      const msg = (actionData.errors as any).message;
      toast.error(msg, {
        duration: 3000,
      });
      setHomePageEnabled((p) => !p);
    }
  }, [fetcher.data, fetcher.state]);

  const chartsAvailable = useChartsAvailable();
  useEffect(() => {
    if (chartsAvailable.length) {
      const msg = chartsAvailable.join(', ');
      toastInfo({ title: 'New charts are available in the dashboard', message: msg }, { position: 'top-right' });
    }
  }, [chartsAvailable]);

  return (
    <div className='relative p-4 bg-gray-100 mt-4'>
      <div className='absolute -top-14 right-0 px-4 flex gap-5'>
        <fetcher.Form className='flex gap-2 items-center'>
          <p className='font-bold'>Set as Home Page</p>
          <SwitchToggle
            disabled={fetcher.state !== 'idle'}
            enabled={homePageEnabled}
            setEnabled={(v) => {
              setHomePageEnabled(v);
              fetcher.submit(
                {
                  enabled: v,
                },
                {
                  method: 'POST',
                }
              );
            }}
          />
        </fetcher.Form>
        <div className='flex gap-2 items-center'>
          <p className='font-bold'>Edit Mode</p>
          <SwitchToggle
            disabled={fetcher.state !== 'idle'}
            enabled={!!location.pathname.endsWith('/edit')}
            setEnabled={() => {
              navigate(`/dashboard/summary/personal/${location.pathname.endsWith('/edit') ? 'view' : 'edit'}`);
            }}
          />
        </div>
        <div className={location.pathname.endsWith('/edit') ? 'w-20' : 'w-0'}></div>
      </div>
      <Outlet />
      <Spinner active={fetcher.state !== 'idle'} />
    </div>
  );
}
