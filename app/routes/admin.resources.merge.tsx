import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { GenericAPI } from '~/lib/types';
import { callAPI } from '~/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/manualMergeAnimals${url.search}`, undefined, 'GET');
  if (!apiResult.success) {
      return json({ error: apiResult.response });
  }
  return json({ data: apiResult.response.data, total: apiResult.response.total, success: apiResult.response.success});
}
