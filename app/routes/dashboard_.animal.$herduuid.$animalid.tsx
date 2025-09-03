import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useRouteError } from '@remix-run/react';

import { type GenericAPI, type GraphQLReturn } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';

import ErrorMessage from '~/components/ui/ErrorMessage';
import Input from '~/components/ui/Input';
import Button from '~/components/ui/Button';
import { useEffect } from 'react';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { accessToken, userData } = await getUserAccessToken(request, true);
  const searchParams = new URL(request.url).searchParams
  const extraId = searchParams.get('other') ?? ''
  const { response, success } = await callAPI<GraphQLReturn>(
    request,
    '/api/graphql',
    {
      query: `{
        groupAnimalViews (
          condition: {
            animalId: "${params.animalid}"
            herdUuid: "${params.herduuid}"
          }
        )
        {
          nodes {
            animalUuid
            animalId
            name
            studName
            breed
            earTag
            tattoo
            nlisVisualId
          }
        }
      }`,
    },
    undefined,
    accessToken
  );
  if (!success || 'errors' in response || response.data.groupAnimalViews.nodes.length === 0) {
    console.error(`FATAL ERROR: Failed to retrieve animal data for ${params.animalId}`, `source: ${request.url}`, userData)
    throw new Response('Failed to retrieve animal data', { status: 400 });
  }
  const animalInfo = response.data.groupAnimalViews.nodes[0] as {
    animalUuid: string,
    animalId: number,
    name: string,
    studName: string,
    breed: string,
    earTag: string,
    tattoo: string,
    nlisVisualId: string
  }
  return json({
    ...animalInfo,
    extraId: extraId
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { accessToken } = await getUserAccessToken(request, true);
    const payload = await request.formData()
    let obj: {[key: string]: string | number[]} = {}
    for (const pair of payload.entries()) {
      obj[pair[0]] = pair[1] as string
    }
    let nextId = 0
    if (obj.nextId) {
      nextId = Number(obj.nextId)
      delete obj.nextId
    }
    const {response, success} = await callAPI<GenericAPI>(request, '/api/animal', obj, "POST", accessToken)
    if (!success) {
      return json({success: false, message: response.errors, next: nextId})
    }
    return json({success: success && response.success, message: response.message, next: nextId})
  } catch (e) {
    console.log(e)
    return json({success: false, message: e, newIds: []})
  }
}

export default function CalvingEvent() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<{success: boolean, message: any, next: number}>()
  
  useEffect(() => {
    if (actionData?.success) {
      window.parent.postMessage({source: 'animal-frame', success: true, next: actionData.next}, '/')
    }
    window.scrollTo({top: 0})
  }, [actionData])
  return <Form method="POST" className="p-3 border border-gray-300 text-left min-w-[300px]">
    {!actionData?.success && !!actionData?.message && <div className="border border-red-500 bg-red-100 p-3 mb-4">
      <span className="text-red-500">{actionData.message}</span>
    </div>}
    <label className="font-bold">Calf ID</label>
    <div className="mb-4">
      <Input type="text" disabled defaultValue={data.animalId} />
    </div>
    <label className="font-bold">Name</label>
    <div className="mb-4">
      <Input type="text" defaultValue={data.name} name="name" />
    </div>
    <label className="font-bold">Stud Name</label>
    <div className="mb-4">
      <Input type="text" defaultValue={data.studName} name="studName" />
    </div>
    <label className="font-bold">Breed</label>
    <div className="mb-4">
      <Input type="text" name="breed" defaultValue={data.breed} required minLength={4} maxLength={4} />
    </div>
    <label className="font-bold">Ear Tag</label>
    <div className="mb-4">
      <Input type="text" defaultValue={data.earTag} name="earTag" />
    </div>
    <label className="font-bold">Tattoo</label>
    <div className="mb-4">
      <Input type="text" defaultValue={data.tattoo} name="tattoo" />
    </div>
    <label className="font-bold">NLIS Visual ID</label>
    <div className="mb-4">
      <Input type="text" defaultValue={data.nlisVisualId} name="nlisVisualId" />
    </div>
    <input type="hidden" name="animalUuid" value={data.animalUuid} />
    {!!data.extraId && <input type="hidden" name="nextId" value={data.extraId} />}
    <Button type="submit" className="w-full">Save</Button>
  </Form>
}

export function shouldRevalidate() {
  return false
}

export function ErrorBoundary() {
  // Error or Response
  const error = useRouteError() as { data: string; message: string };
  console.error(error.data || error.message);
  return <ErrorMessage message={error.data || error.message} />;
}
