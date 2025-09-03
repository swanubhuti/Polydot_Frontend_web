import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData, useRouteError } from '@remix-run/react';
import { useEffect, useState } from 'react';
import Button from '~/components/ui/Button';
import SelectDropdown from '~/components/ui/Dropdown';
import ErrorMessage from '~/components/ui/ErrorMessage';
import Input from '~/components/ui/Input';
import type { GenericAPI, GraphQLReturn } from '~/lib/types';
import { getVisibleHerdsFilter } from '~/lib/utils';
import { callAPI, getUserAccessToken } from '~/session.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Easy Dairy Home' },
    { name: 'description', content: 'Easy Dairy Home' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  let { accessToken, headers, isApp } = await getUserAccessToken(request, true);
  const res = await callAPI<GenericAPI>(request, '/api/account', undefined, 'GET', accessToken);
  if (!res.success) {
    throw new Error("Fail to get user data");
  }
  const userData = res.response;
  const herdFilter = getVisibleHerdsFilter(userData as any)
  const herdCall = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
      herds ${herdFilter ? `(${herdFilter})` : ''}
      {
        nodes {
          herdUuid
          herdCode
        }
      }
    }`,
    },
    undefined,
    accessToken
  );
  if (!herdCall.success || 'errors' in herdCall.response) {
    console.error(`FATAL ERROR: Failed to retrieve herd data for mobile`, `source: ${request.url}`, herdCall.response, userData)
    throw new Response('Failed to retrieve herd data', { status: 400 });
  }

  return json(
    {
      herds: herdCall.response.data.herds.nodes,
      isApp
    },
    headers
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { accessToken } = await getUserAccessToken(request, true);
  const payload = await request.formData()
  const herdUuid = payload.get('herdUuid')
  const animalId = payload.get('animalId')

  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
        groupAnimalViews (
          condition: {
            animalId: "${animalId}"
            herdUuid: "${herdUuid}"
          }
        )
        {
          nodes {
            animalUuid
            animalId
            status
          }
        }
      }`,
    },
    undefined,
    accessToken
  );
  if (!success || 'errors' in response || response.data.groupAnimalViews.nodes.length === 0) {
    return json({success: false, error: 'Animal does not exist in herd'})
  }
  return json({success: true, url: `/dashboard/animal/${response.data.groupAnimalViews.nodes[0].animalUuid}`})
}

export default function MobileHome() {
  const data = useLoaderData<typeof loader>();
  const [herd, setHerd] = useState(data.herds[0].herdUuid)
  const [error, setError] = useState('')

  const fetcher = useFetcher<{success: boolean, error?: string, url?: string}>()

  useEffect(() => {
    if (fetcher.data && fetcher.data.error) {
      setError(fetcher.data.error)
    } else if (fetcher.data && fetcher.data.url) {
      //@ts-ignore
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({actionData: {url: fetcher.data.url}, type: "openPage"}));
    }
  }, [fetcher.data])
  
  return (
    <div className='pb-5'>
      <fetcher.Form method="POST" className='bg-white p-6 flex gap-4 md:flex-row-reverse flex-col justify-between'>
        <div className='flex flex-col gap-1'>
          <label className='font-bold'>Current Herd:</label>
          <SelectDropdown
            type='single'
            className='block w-full'
            value={herd}
            options={data.herds.map((h) => ({label: h.herdCode, value: h.herdUuid}))}
            onSelectChange={(opts) => setHerd(opts.value)}
          />
          <input type="hidden" name="herdUuid" value={herd} />
        </div>
        <div className="flex flex-col gap-1 flex-grow">
          <label>Animal ID</label>
          <div className="flex gap-1 items-start">
            <div className="flex-grow">
              <Input type="text" name="animalId" error={error} onChange={() => setError('')} />
            </div>
            <Button type="submit" variant="primary" disabled={fetcher.state !== 'idle'} className="flex gap-1 items-center">
              <span className="text-sm lg:text-base">Search</span>
              {fetcher.state !== 'idle' && fetcher.formEncType === 'application/x-www-form-urlencoded' && <div role="status" className="">
                  <svg aria-hidden="true" className="w-4 h-4 animate-spin text-primary-400 fill-primary-100" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
              </div>}
            </Button>
          </div>
        </div>
      </fetcher.Form>
    </div>
  );
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
