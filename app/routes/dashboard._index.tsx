import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { useRouteError } from '@remix-run/react';
import ErrorMessage from '~/components/ui/ErrorMessage';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { getVisibleHerdsFilter } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { isApp } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET');
  if (!res.success) {
    throw new Error("Fail to get user data");
  }
  const userData = res.response;
  if (userData.EasyDraft) {
    return redirect(`/dashboard/drafts`);
  }
  const { response, headers, success } = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query: `{
      herds (first: 1 ${getVisibleHerdsFilter(userData as any)})
      {
        nodes {
          herdUuid
          herdCode
        }
      }
    }`,
  });

  if (!success || 'errors' in response) {
    console.error(`FATAL ERROR: Failed to retrieve herd data`, `source: ${request.url}`, response, userData)
    throw new Response('Failed to retrieve herd data', { status: 500 });
  }

  if (response.data.herds.nodes.length == 0) {
    console.error(`FATAL ERROR: No herd found`, `source: ${request.url}`, userData)
    throw new Response('No herd found', { status: 400 });
  }
  
  if (isApp) {
    return redirect(`/dashboard/mobile`);
  }
  return redirect(`/dashboard/herd/${response.data.herds.nodes[0].herdUuid}`, headers);
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
