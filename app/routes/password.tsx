import { type LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import React from 'react';
import BottomBanner from '~/components/BottomBanner';
import { getUserAccessToken } from '~/session.server';
export async function loader({ request }: LoaderFunctionArgs) {
  const { accessToken, userData, headers } = await getUserAccessToken(request);
  if (accessToken) {
    if (request.url.split(/\/?\?/)[0] === request.headers.get('referer')?.split(/\/?\?/)[0]) {
      return json({ loaderDialogData: { isOpen: false } }, headers);
    } else {
      return redirect(userData && userData.Role === 'admin' ? '/admin' : '/dashboard', headers);
    }
  }
  const url = new URL(request.url)
  if (url.pathname === '/password') {
    return redirect('/', headers);
  }
  return json({ status: 'success' }, headers);
}

export default function PasswordPageLayout() {
  return (
    <div className='min-h-[100dvh] flex flex-col'>
      <div className='max-w-xl mx-auto flex flex-col flex-1'>
        <Outlet />
      </div>
      <BottomBanner />
    </div>
  );
}
