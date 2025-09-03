import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { GenericAPI } from '~/lib/types';
import { callAPI } from '~/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
    console.log(url);
  const apiResult = await callAPI<GenericAPI>(request, `/api/dev/admin/entityErrorLogs${url.search}`, undefined, 'GET');
  if (!apiResult.success) {
      return json({ error: apiResult.response });
  }
  return json({ errorLogs: apiResult.response.data, success: apiResult.response.success, total:  apiResult.response.total});
}
